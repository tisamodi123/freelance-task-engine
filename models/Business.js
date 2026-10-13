const mongoose = require('mongoose');
const { BUSINESSSTATUS } = require('../constants/constant');

const businessSchema = new mongoose.Schema({
    businessName: {
        type: String,
        required: true,
        trim: true,
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    businessDescription: {
        type: String,
        trim: true,
    },

    businessCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },

    businessImages: {
        imageUrl: String,
        imageName: String,
    },

    sub_category: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Template'
        }
    ],

    budget: Number,

    businessPhone: { type: String, trim: true },

    businessEmail: String,

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

    portfolio: [{
        projectTitle: String,
        projectDescription: String,
        projectImages: [{
            type: String
        }],
    }],
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

module.exports = mongoose.model('Business', businessSchema);