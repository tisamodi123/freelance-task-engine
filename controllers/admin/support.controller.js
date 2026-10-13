const Support = require("../../models/Support");
const { API_RESPONSE_CODES, MSG } = require("../../constants/admin_messages");
const mongoose = require("mongoose");
const { IMAGE_PREFIX, IMAGE_PATH } = require("../../constants/constant");

const getAllSupports = async (req, res) => {
    try {
        let { page = 1, limit = 10, search } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const query = {};

        if (search) {
            query.$or = [
                { description: { $regex: search, $options: "i" } },
            ];
        }

        // if (status) {
        //     query.status = status;
        // }

        const total = await Support.countDocuments(query);

        const supports = await Support.find(query)
            .populate("user", "firstName lastName")
            .populate("relatedTask", "_id taskTitle")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()

        const formattedSupports = supports.map((support) => ({
            ...support,
            image: (support.image || []).map((file) =>
                file?.fileUrl
                    ? `${IMAGE_PREFIX}${IMAGE_PATH.OTHERS}${file.fileUrl}`
                    : null
            )
        }))

        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            total,
            page,
            limit,
            data: formattedSupports,
        });
    } catch (error) {
        console.error("Error fetching support tickets:", error);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
        });
    }
};

const changeSupportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: MSG.INVALID_SUPPORT_ID,
            });
        }

        if (!status) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: MSG.STATUS_REQUIRED,
            });
        }

        const support = await Support.findById(id);

        support.status = status;
        await support.save();

        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: MSG.STATUS_UPDATED,
        });
    } catch (error) {
        console.error("Error updating support status:", error);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
        });
    }
};

module.exports = {
    getAllSupports,
    changeSupportStatus,
};
