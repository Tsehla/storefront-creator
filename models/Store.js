const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: String,
    image: {
        url: String,
        publicId: String // for Cloudinary
    }
});

const storeSchema = new mongoose.Schema({
    storeName: {
        type: String,
        required: true
    },
    description: String,
    ownerName: String,
    contactEmail: String,
    logo: {
        url: String,
        publicId: String
    },
    bannerImage: {
        url: String,
        publicId: String
    },
    products: [productSchema],
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema); 