const mongoose = require('mongoose');
const { STATUS } = require('../constants/constant');

const templateSchema = new mongoose.Schema({
    templateName: {
        type: String,
        required: true,
        trim: true,
    },
    icon: {
        type: String,
    },
    description: {
        type: String,
        trim: true,
    },
    budget: {
        type: Number,
    },
    duration: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    posterImage: {
        type: String
    },
    status: {
        type: String,
        enum: STATUS.ALL,
        default: STATUS.VERIFIED
    },
    // color: {
    //     type: String,
    //     validate: {
    //         validator: function (v) {
    //         // validate hex color #RGB or #RRGGBB
    //             return /^#([0-9A-F]{3}){1,2}$/i.test(v);
    //         },
    //         message: props => `${props.value} is not a valid hex color code`
    //     }
    // },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model("Template", templateSchema);