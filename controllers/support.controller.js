const Support = require("../models/Support");
const Task = require("../models/Task")
const Bid = require("../models/Bid")
const User = require("../models/User")
const { TASKSTATUS } = require("../constants/constant");
const { API_RESPONSE_CODES, MSG } = require("../constants/user_messages");

const createSupport = async (req, res) => {
    try {
        const { description, relatedTask } = req.body;
        const userId = req.user?._id;

        if (!description) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: MSG.DESCRIPTION_REQUIRED,
            });
        }

        // Handle image uploads
        let imageFiles = [];
        if (req.files && req.files.length > 0) {
            imageFiles = req.files.map((file) => ({
                fileUrl: file.filename,
            }));
        }

        const support = await Support.create({
            user: userId,
            description,
            relatedTask,
            image: imageFiles,
        });

        return res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.SUPPORT_CREATED, data: support });
    } catch (error) {
        console.error("Error creating support:", error);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR });
    }
};

const getRelatedTasks = async (req, res) => {
    try {
        const userId = req.user?._id;
        const user = await User.findById(userId);

        if (!userId) {
            return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({
                success: false,
                message: MSG.UNAUTHORIZED,
            });
        }

        let tasks = [];

        // If user is a seeker — show tasks they created
        if (!user.business) {
            tasks = await Task.find({
                createdBy: userId,
                isDeleted: false,
            })
                .select("_id taskTitle status")
                .sort({ createdAt: -1 });
        }
        // If user is a provider — show tasks they performed (completed)
        else {
            const userBids = await Bid.find({ user: userId }).select("_id");
            const bidIds = userBids.map((b) => b._id);

            tasks = await Task.find({
                acceptedBid: { $in: bidIds },
                status: { $in: [TASKSTATUS.COMPLETED, TASKSTATUS.ASSIGNED] },
                isDeleted: false,
            })
                .select("_id taskTitle status")
                .sort({ createdAt: -1 });
        }

        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            data: tasks,
        });
    } catch (error) {
        console.error("Error fetching related tasks:", error);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
        });
    }
};

const updateSupport = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, relatedTask } = req.body;
        const userId = req.user?._id;

        const support = await Support.findById(id);
        if (!support) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: MSG.NOT_FOUND,
            });
        }

        // Allow only owner to edit
        if (support.user.toString() !== userId.toString()) {
            return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
                success: false,
                message: MSG.NOT_AUTHORISED,
            });
        }

        // Handle image updates (add new images if uploaded)
        let updatedImages = support.image || [];
        if (req.files && req.files.length > 0) {
            updatedImages = req.files.map((file) => ({
                fileUrl: file.filename,
            }));
        }

        support.description = description || support.description;
        support.relatedTask = relatedTask || support.relatedTask;
        support.image = updatedImages;

        await support.save();

        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: MSG.DATA_UPDATED,
            data: support,
        });
    } catch (error) {
        console.error("Error updating support:", error);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
        });
    }
};

const deleteSupport = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        const support = await Support.findById(id);
        if (!support) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: MSG.NOT_FOUND
            });
        }

        // Allow only owner
        if (support.user.toString() !== userId.toString()) {
            return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
                success: false,
                message: MSG.NOT_AUTHORISED,
            });
        }

        await Support.findByIdAndDelete(id)
        // support.isDeleted = true;
        // await support.save();

        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: MSG.DATA_DELETED,
        });
    } catch (error) {
        console.error("Error deleting support:", error);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
        });
    }
};

module.exports = {
    createSupport,
    getRelatedTasks,
    updateSupport,
    deleteSupport
};