const mongoose = require("mongoose");
const { SUPPORTSTATUS } = require("../constants/constant");

const supportSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        image: [{
            fileUrl: String,
        }],
        relatedTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
        },
        status: {
            type: String,
            enum: SUPPORTSTATUS.ALL,
            default: SUPPORTSTATUS.OPEN,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Support", supportSchema);