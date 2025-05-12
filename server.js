const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const { isAuthenticated, isStoreOwner } = require('./middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

dotenv.config();

const app = express();

// Middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('./public'));
app.use(fileUpload({
    createParentPath: true,
    limits: { 
        fileSize: 20 * 1024 * 1024 // 20MB max file size
    },
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB Atlas connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/store_fronts', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB Atlas');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Store Schema
const storeSchema = new mongoose.Schema({
    storeName: String,
    description: String,
    ownerName: String,
    contactEmail: String,
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    logo: {
        url: String
    },
    bannerImage: {
        url: String
    },
    products: [{
        name: String,
        price: Number,
        description: String,
        image: {
            url: String
        }
    }]
});

const Store = mongoose.model('Store', storeSchema);

// Authentication routes
app.get('/register', (req, res) => {
    res.render('auth/register');
});

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email, password });
        await user.save();
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.cookie('token', token, { httpOnly: true });
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).render('auth/register', { error: 'Registration failed' });
    }
});

app.get('/login', (req, res) => {
    res.render('auth/login');
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).render('auth/login', { error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.cookie('token', token, { httpOnly: true });
        res.redirect('/dashboard');
    } catch (error) {
        res.status(400).render('auth/login', { error: 'Login failed' });
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// Dashboard route
app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const stores = await Store.find({ creator: req.user.id });
        res.render('dashboard', { stores });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Store routes with image upload
app.post('/create-store', isAuthenticated, async (req, res) => {
    try {
        // Basic store data
        const storeData = {
            ...req.body,
            creator: req.user.id,
            products: [] // Initialize empty products array
        };

        // Create store to get ID
        const store = new Store(storeData);
        await store.save();

        // Create store directory
        const storeDir = `./public/store/${store._id}`;
        fs.mkdirSync(storeDir, { recursive: true });

        // Handle store images
        if (req.files?.logo) {
            const logoFile = req.files.logo;
            const logoFileName = Date.now() + '-' + logoFile.name;
            await logoFile.mv(`${storeDir}/${logoFileName}`);
            store.logo = {
                url: `/store/${store._id}/${logoFileName}`
            };
        }

        if (req.files?.bannerImage) {
            const bannerFile = req.files.bannerImage;
            const bannerFileName = Date.now() + '-' + bannerFile.name;
            await bannerFile.mv(`${storeDir}/${bannerFileName}`);
            store.bannerImage = {
                url: `/store/${store._id}/${bannerFileName}`
            };
        }

        // Handle products
        const productNames = Array.isArray(req.body['products[name]']) 
            ? req.body['products[name]'] 
            : [req.body['products[name]']];

        const productPrices = Array.isArray(req.body['products[price]']) 
            ? req.body['products[price]'] 
            : [req.body['products[price]']];

        const productDescriptions = Array.isArray(req.body['products[description]']) 
            ? req.body['products[description]'] 
            : [req.body['products[description]']];

        // Process each product
        for (let i = 0; i < productNames.length; i++) {
            const product = {
                name: productNames[i],
                price: productPrices[i],
                description: productDescriptions[i]
            };

            // Handle product image if exists
            const productImage = req.files[`products[${i}][image]`];
            if (productImage) {
                const fileName = Date.now() + '-' + productImage.name;
                await productImage.mv(`${storeDir}/${fileName}`);
                product.image = {
                    url: `/store/${store._id}/${fileName}`
                };
            }

            store.products.push(product);
        }

        await store.save();

        // Add store to user's stores array
        await User.findByIdAndUpdate(req.user.id, {
            $push: { stores: store._id }
        });

        res.redirect(`/store/${store._id}`);
    } catch (error) {
        console.log('error in create store', error);
        res.status(400).send(error);
    }
});

// Edit store route
app.get('/store/:id/edit', isAuthenticated, isStoreOwner, async (req, res) => {
    res.render('edit-store', { store: req.store });
});

app.post('/store/:id/edit', isAuthenticated, isStoreOwner, async (req, res) => {
    try {
        const updates = { ...req.body };
        const storeDir = `./public/store/${req.params.id}`;
        
        if (req.files?.logo) {
            const logoFile = req.files.logo;
            const logoFileName = Date.now() + '-' + logoFile.name;
            await logoFile.mv(`${storeDir}/${logoFileName}`);
            updates.logo = {
                url: `/store/${req.params.id}/${logoFileName}`
            };
        }

        if (req.files?.bannerImage) {
            const bannerFile = req.files.bannerImage;
            const bannerFileName = Date.now() + '-' + bannerFile.name;
            await bannerFile.mv(`${storeDir}/${bannerFileName}`);
            updates.bannerImage = {
                url: `/store/${req.params.id}/${bannerFileName}`
            };
        }

        await Store.findByIdAndUpdate(req.params.id, updates);
        res.redirect(`/store/${req.params.id}`);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Product image upload
app.post('/store/:id/product', isAuthenticated, isStoreOwner, async (req, res) => {
    try {
        const storeDir = `./public/store/${req.params.id}`;
        let imagePath;

        if (req.files?.productImage) {
            const productFile = req.files.productImage;
            const fileName = Date.now() + '-' + productFile.name;
            await productFile.mv(`${storeDir}/${fileName}`);
            imagePath = `/store/${req.params.id}/${fileName}`;
        }

        const product = {
            ...req.body,
            image: imagePath ? { url: imagePath } : undefined
        };

        await Store.findByIdAndUpdate(req.params.id, {
            $push: { products: product }
        });

        res.redirect(`/store/${req.params.id}`);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/create-store', isAuthenticated, (req, res) => {
    res.render('create-store');
});

app.get('/store/:id', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);
        if (!store) {
            return res.status(404).send('Store not found');
        }
        res.render('store', { store });
    } catch (err) {
        res.status(404).send('Store not found');
    }
});

// Add this after your middleware setup and before routes
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
