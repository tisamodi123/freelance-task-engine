const Joi = require('joi');
const { parseJSONFields } = require('../utils/utilss');
const { API_RESPONSE_CODES } = require('../constants/user_messages');

const registerSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^[0-9]{7,15}$/).required(),
    termsAccepted: Joi.boolean(),
    isBusiness: Joi.boolean().optional(),
    address: Joi.object({
        street: Joi.string().allow('').optional(),
        city: Joi.string().allow('').optional(),
        state: Joi.string().allow('').optional(),
        pincode: Joi.string().allow('').optional(),
        country: Joi.string().allow('').optional(),
    }).optional(),
    location: Joi.object({
        type: Joi.string().valid("Point").default("Point").label("Location Type"),
        coordinates: Joi.array().items(
            Joi.number().required().label("Longitude/Latitude")
        ).length(2).label("Coordinates"),
    }).optional(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const validateBody = (schema, jsonFields = []) => (req, res, next) => {
    try {
        req.body = parseJSONFields(req.body, jsonFields);
    } catch (ex) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
            statusCode: API_RESPONSE_CODES.BAD_REQUEST,
            message: ex.message,
        });
    }

    const { error } = schema.validate(req.body);
    if (error) return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ status: false, message: error.details[0].message });

    next();
};

module.exports = {
    validateBody,
    registerSchema,
    loginSchema,
}