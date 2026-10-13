const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');
const { STATUS, USERTYPE } = require('../constants/constant');

const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 50
    },

    lastName: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 50
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validateEmail, 'Invalid email']
    },

    phone: {
        type: String,
        required: true,
    },

    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'US' }
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],  // [longitude, latitude]
        }
    },

    otherAddress: [
        {
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: { type: String, default: 'US' },
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],  // [longitude, latitude]
            }
        }
    ],

    // bio: String,

    // profileImage: [{
    //     fileName: String,
    //     fileUrl: String,
    //     uploadedAt: {
    //         type: Date,
    //         default: Date.now,
    //     },
    // }],

    userType: {
        type: String,
        enum: USERTYPE.ALL,
        default: USERTYPE.CUSTOMER
    },

    password: {
        type: String,
        minLength: 6
    },

    accountStatus: {
        type: String,
        enum: STATUS.ALL,
        default: STATUS.VERIFIED
    },

    emailVerified: {
        type: Boolean,
        default: false
    },

    isForgotPassword: {
        type: Boolean,
        default: false
    },

    isBusiness: {
        type: Boolean,
        default: false
    },

    businessRegistered: {
        type: Boolean,
        default: false
    },

    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
    },

    emailVerificationToken: String,
    emailVerificationExpiry: Date,

    resetPasswordToken: String,
    resetPasswordExpiry: Date,

    lastLoginAt: Date,

    termsAccepted: {
        type: Boolean,
        default: true
    },

    termsAcceptedAt: {
        type: Date,
        default: Date.now
    },

    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);

    this.password = await bcrypt.hash(this.password, salt);

    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema)