const mongoose = require('mongoose');
const Category = require('../models/Category');
const constant = require('../constants/constant');
const { API_RESPONSE_CODES, MSG } = require('../constants/user_messages');
const Business = require('../models/Business');


const location = async (req, res) => {

    try {
        const data = await Business.find({
            isDeleted: { $ne: true },
            status: constant.STATUS.VERIFIED
        })

        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: "location list fetched",
            data,
        });
    } catch (err) {
        // console.error("location LIST ERROR:", err);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
}

module.exports = {
    location
}