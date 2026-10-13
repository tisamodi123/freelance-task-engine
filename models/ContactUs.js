const mongoose = require("mongoose");
const { CONTACTUSSTATUS } = require("../constants/constant");

const contactUsSchema = new mongoose.Schema(
    {
      name: { type: String, trim: true, maxlength: 80, required: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, required: true },
    city: { type: String, trim: true, maxlength: 80, default: "" },
    message: { type: String, trim: true, maxlength: 2000, required: true },
        status: {
            type: String,
            enum: CONTACTUSSTATUS.ALL,
            default: CONTACTUSSTATUS.OPEN,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ContactUs", contactUsSchema);