const mongoose = require('mongoose');
const { BIDSTATUS } = require('../constants/constant');

const bidSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    offerAmount: {
        type: Number,
        required: true,
    },
    remarks: {
        type: String,
        required: true
    },
    date: {
        type: Date
    },
    media: [
        {
            fileUrl: String,   // Stored file path (e.g., filename)
            fileName: String,  // Original filename
        }
    ], status: {
        type: String,
        enum: BIDSTATUS.ALL,
        default: BIDSTATUS.PENDING,
    },
}, { timestamps: true });

module.exports = mongoose.model('Bid', bidSchema);