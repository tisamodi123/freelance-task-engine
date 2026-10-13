const { API_RESPONSE_CODES, MSG } = require("../constants/user_messages");
const Report = require("../models/Report");





const createReport = async (req, res) => {

    try {
        const id = req?.user?._id
        const { businessId, reason, imageUrl, reportType } = req.body;
        // console.log("req===>", req.body)
        // console.log("req===>", id)
        // return

        const report = await Report.create({
            userId: id, // from auth middleware
            businessId,
            reason,
            imageUrl,
            reportType
        });

        return res.status(API_RESPONSE_CODES.CREATED).json({
            success: true,
            message: MSG.REPORT_SUCCESS,
            report: report
        });


    } catch (err) {
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message
        });
    }

}



module.exports = {createReport}