const mongoose = require('mongoose');
const { STATUS } = require('../constants/constant');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    icon: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /^[a-z0-9-_]+$/
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        enum: STATUS.ALL,
        default: STATUS.VERIFIED
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    templateId: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Template'
        }
    ]
}, { timestamps: true });

categorySchema.pre('validate', function (next) {
    if (!this.slug && this.name) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

module.exports = mongoose.model('Category', categorySchema);