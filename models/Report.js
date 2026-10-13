// models/Report.js
const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business", // or "Task" / "Provider" (use your actual model)
            required: true,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
        },

        imageUrl: {
            type: String, // store filename or full URL
            default: null,
        },

        reportType: {
            type: String,
            enum: ["business", "task"],
            required: true,

        }
    },
    {
        timestamps: true, // createdAt, updatedAt
    }
);

module.exports = mongoose.model('Report', reportSchema);

