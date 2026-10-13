const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },

    // Who gave the review
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerBusinessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },

    // Who received the review
    reviewedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBusinessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },

    comments: {
        type: String,
        trim: true
    },
    rating: {
        type: Number
    },
    attachments: [{
        fileUrl: String,
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

module.exports = mongoose.model('Review', reviewSchema)