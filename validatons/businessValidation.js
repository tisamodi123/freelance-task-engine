const Joi = require("joi");
const { parseJSONFields } = require('../utils/utilss');
const { API_RESPONSE_CODES } = require('../constants/user_messages');

const portfolioSchema = Joi.object({
  projectName: Joi.string().required(),
  description: Joi.string().allow("", null),
});

const registerBusinessSchema = Joi.object({
  businessName: Joi.string()
    .trim()
    .required()
    .label("Business Name"),

  aboutBusiness: Joi.string()
    .trim()
    .required()
    .label("Business Description"),

  category: Joi.string()
    .required()
    .label("Business Category"),

  sub_category: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string()
    )
    .optional()
    .label("Sub-Category"),

  addressStreet: Joi.string()
    .required()
    .label("Street Address"),

  zipCode: Joi.string()
    .required()
    .label("Zip / Postal Code"),

  city: Joi.string()
    .required()
    .label("City"),

  state: Joi.string()
    .required()
    .label("State"),

  country: Joi.string()
    .label("Country"),

  aboutBusiness: Joi.string()
    .required()
    .label("About Business"),

  portfolio: Joi.alternatives()
    .try(
      Joi.array().items(portfolioSchema),
      Joi.string()
    )
    .optional()
    .label("Business Portfolio"),

  websitelink: Joi.string()
    .label("Website Link"),

  emailToken: Joi.string()
    .label("Token"),

  location: Joi.object({
    type: Joi.string().valid("Point").default("Point").label("Location Type"),
    coordinates: Joi.array().items(
      Joi.number().required().label("Longitude/Latitude")
    ).length(2).label("Coordinates"),
  }).required(),
});


const validate = (schema, jsonFields = []) => (req, res, next) => {
  try {
    req.body = parseJSONFields(req.body, jsonFields);
  } catch (ex) {
    return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
      statusCode: API_RESPONSE_CODES.BAD_REQUEST,
      message: ex.message,
    });
  }

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
      statusCode: API_RESPONSE_CODES.BAD_REQUEST,
      message: error.details.map((d) => d.message),
    });
  }

  req.body = value;
  next();
};

module.exports = {
  registerBusinessSchema,
  validate,
};
