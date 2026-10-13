const mongoose = require('mongoose');
const { TASKSTATUS } = require('../constants/constant');

const taskSchema = new mongoose.Schema({
    taskTitle: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        required: true,
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
    },

    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        pincode: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
        },
        coordinates: {
            type: [Number],  // [longitude, latitude]
        }
    },

    whenNeeded: {
        type: Date,
    },

    budget: {
        type: Number,
    },

    budgetEnd: {
        type: Number
    },

    attachments: [{
        fileUrl: String,
        fileName: String
    }],

    status: {
        type: String,
        enum: TASKSTATUS.ALL,
        default: TASKSTATUS.OPEN,
    },

    totalSpent: {
        type: Number,
    },

    totalBids: {
        type: Number,
        default: 0
    },

    acceptedBid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bid'
    },

    tags: [{
        type: String,
        lowercase: true,
        trim: true,
    }],

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    otp: {
        type: String,
        // select: false,     // so it’s not returned by default 
    },

    otpExpiry: Date,

    otpVerified: {
        type: Boolean,
        default: false, // false means either OTP not generated or task completed without OTP
    },

    completionNotes: {
        type: String
    },

    completionDate: { type: Date },

    completionAttachments: [
        {
            fileUrl: String,
        },
    ],

    reason: {
        type: String,
    },

    // Track review status
    customerReviewed: {
        type: Boolean,
        default: false // true if customer reviewed provider
    },

    providerReviewed: {
        type: Boolean,
        default: false // true if provider reviewed customer
    },

    isReviewSkipped: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

taskSchema.index({ location: '2dsphere' });

taskSchema.index(
    { taskTitle: 1, createdBy: 1 },
    { unique: true }
);

module.exports = mongoose.model('Task', taskSchema);