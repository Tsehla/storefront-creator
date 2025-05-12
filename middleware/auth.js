const jwt = require('jsonwebtoken');

exports.isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.redirect('/login');
    }
};

exports.isStoreOwner = async (req, res, next) => {
    try {
        const store = await Store.findById(req.params.id);
        if (!store) {
            return res.status(404).send('Store not found');
        }
        
        if (store.creator.toString() !== req.user.id) {
            return res.status(403).send('Unauthorized');
        }
        
        req.store = store;
        next();
    } catch (error) {
        res.status(500).send('Server error');
    }
}; 