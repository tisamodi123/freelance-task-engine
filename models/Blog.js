const mongoose = require("mongoose");
const constant = require("../constants/constant");

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, default: "" },
    content: { type: String, required: true }, // HTML
    status: { type: String, enum: constant.BLOG_STATUS.ALL, default: constant.BLOG_STATUS.DRAFT },
    tags: [{ type: String, trim: true }],

    // ✅ images
    displayImage: { type: String, required: true }, // full URL or relative
    images: [{ type: String }], // gallery image URLs

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", BlogSchema);
