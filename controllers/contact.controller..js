const Support = require("../models/Support");
const Task = require("../models/Task")
const Bid = require("../models/Bid")
const User = require("../models/User")
const { TASKSTATUS } = require("../constants/constant");
const { API_RESPONSE_CODES, MSG } = require("../constants/user_messages");
const ContactUs = require("../models/ContactUs");

const contactUsSubmit = async (req, res) => {
    try {

           const { name, email, message, city, } = req.body;

        if (!name || !email || !message) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: MSG.REQUIRED_FIELDS_MISSING,
            });
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: MSG.INCORRECT_EMAIL_FORMAT,
            });
        }

        const contactUs = await ContactUs.create({
            name,
            email,
            message,
            city,
        });
           

        return res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.CONTACT_US_CREATED, data: contactUs });
    } catch (error) {
        console.error("Error creating support:", error);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR });
    }
};



module.exports = {
    contactUsSubmit,
};