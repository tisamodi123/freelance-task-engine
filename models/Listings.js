const mongoose = require('mongoose');
const { BUSINESSSTATUS } = require('../constants/constant');

const listingsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        trim: true,
    },

    businessImages: {
        imageUrl: String,
    },

    template: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template'
    }],

    phoneNo: { type: String, trim: true },

    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'US' }
    },

    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
        }
    },

    tags: [{ type: String, lowercase: true, trim: true }],

    status: { type: String, enum: BUSINESSSTATUS.ALL, default: BUSINESSSTATUS.PENDING },

    websitelink: {
        type: String,
        trim: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    isDeleted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

module.exports = mongoose.model('Listings', listingsSchema);