const Bid = require('../models/Bid');
const Task = require('../models/Task');
const User = require('../models/User')
const Business = require('../models/Business')
const { MSG, API_RESPONSE_CODES } = require('../constants/user_messages');
const { IMAGE_PREFIX, IMAGE_PATH, TASKSTATUS, BIDSTATUS } = require('../constants/constant')
const { sendBidAcceptedEmail } = require('../utils/sendEmail')
const fs = require('fs');
const mongoose = require("mongoose");
const path = require('path');

const getBidAcceptanceDetails = async (req, res) => {
  try {
    const { taskId, bidId } = req.params;
    const userId = req.user._id;

    if (!taskId || !bidId) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.ID_NOT_FOUND,
      });
    }

    const task = await Task.findById(taskId)
      .select('taskTitle description whenNeeded budget budgetEnd category createdBy attachments address status')
      .populate('category', 'templateName')
      .populate('createdBy', 'firstName lastName');
    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.TASK_NOT_FOUND
      });
    }

    if (task.createdBy._id.toString() !== userId.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.NOT_AUTHORIZED
      });
    }

    const bid = await Bid.findOne({ _id: bidId, task: taskId })
      .select('offerAmount remarks media createdAt user')
      .populate({
        path: 'user',
        select: 'firstName lastName email',
        populate: {
          path: 'business',
          select: 'businessName businessDescription businessCategory businessImages address',
          populate: [
            { path: 'businessCategory', select: 'name' }
          ]
        }
      });

    if (!bid) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BID_NOT_FOUND
      });
    }

    if (bid.user.business) {
      bid.user.business.businessImages = bid.user.business.businessImages || {};
      bid.user.business.businessImages.imageUrl = bid.user.business.businessImages.imageUrl
        ? `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${bid.user.business.businessImages.imageUrl}`
        : null;
    }

    // Return combined data
    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.DETAILS_FETCHED,
      data: {
        task: {
          _id: task._id,
          taskTitle: task.taskTitle,
          description: task.description,
          category: task.category,
          budget: task.budget,
          budgetEnd: task.budgetEnd,
          whenNeeded: task.whenNeeded,
          createdBy: task.createdBy,
          address: task.address,
          status: task.status,
          attachments: task.attachments.map((i) => {
            return {
              // ...i,
              fileUrl: i.fileUrl ? `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${i.fileUrl}` : null
            }
          }) || [],
        },
        bid: {
          _id: bid._id,
          offerAmount: bid.offerAmount,
          remarks: bid.remarks,
          media: (bid.media || []).map(m => ({
            fileUrl: m.fileUrl ? `${IMAGE_PREFIX}${IMAGE_PATH.BID_MEDIA}${m.fileUrl}` : null,
            fileName: m.fileName || null,
          })),
          createdAt: bid.createdAt
        },
        serviceProvider: bid.user
      }
    });
  } catch (err) {
    console.error("Error in getBidAcceptanceDetails:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_BID
    });
  }
};

const confirmBid = async (req, res) => {
  try {
    const { taskId, bidId } = req.params;
    const userId = req.user._id;

    if (!taskId || !bidId) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.ID_NOT_FOUND
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.TASK_NOT_FOUND
      });
    }

    if (task.createdBy.toString() !== userId.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.NOT_AUTHORIZED
      });
    }

    const bid = await Bid.findOne({ _id: bidId, task: taskId }).populate("user", "firstName lastName email");
    if (!bid) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BID_NOT_FOUND
      });
    }

    // Mark this bid as accepted
    bid.status = BIDSTATUS.ACCEPTED;
    await bid.save();

    // Reject all other bids for the same task
    await Bid.updateMany(
      { task: taskId, _id: { $ne: bidId } },
      { $set: { status: BIDSTATUS.REJECTED } }
    );

    task.acceptedBid = bid._id;
    task.status = TASKSTATUS.ASSIGNED;
    await task.save();

    sendBidAcceptedEmail(bid.user, task.taskTitle)
    // .then(() => console.log("Bid accepted email sent successfully"))
    // .catch(err => console.error("Error sending bid accepted email:", err));

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.BID_ACCEPTED,
    });

  } catch (err) {
    console.error("Error in accept bid:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_TASK
    });
  }
};

const createBid = async (req, res) => {
  try {
    const { taskId } = req.params;
    const offerAmount = Number(req.body.offerAmount);
    const remarks = req.body.remarks;
    const userId = req.user._id;

    const task = await Task.findById(taskId);
    if (!task) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
      success: false,
      message: MSG.TASK_NOT_FOUND
    });

    if (task.createdBy.toString() === userId.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.BID_ON_OWN_TASK
      });
    }

    // Fetch the user and their business details
    const user = await User.findById(userId).populate("business");
    if (!user.isBusiness || !user.businessRegistered || !user.business) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.HAVE_BUSINESS_TO_PLACE_BID,
      });
    }

    // Get provider’s business subcategories
    const business = await Business.findById(user.business).populate("sub_category", "_id templateName");

    // If no subcategories registered
    if (!business.sub_category || business.sub_category.length === 0) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.NOT_HAVE_ASSIGNED_SUB_CATEGORIES
      });
    }

    // Validate whether provider’s subcategory matches the task’s subcategory
    const allowedSubcategories = business.sub_category.map((sub) =>
      sub._id.toString()
    );

    if (!allowedSubcategories.includes(task.category._id.toString())) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.CANNOT_BID,
      });
    }

    const existingBid = await Bid.findOne({ task: taskId, user: userId });
    if (existingBid) return res.status(API_RESPONSE_CODES.CONFLICT).json({
      success: false,
      message: MSG.BID_ALREADY_EXISTS
    });

    const mediaFiles = req.files?.filter(f => f.fieldname === 'media') || [];
    const media = mediaFiles.map(file => ({
      fileUrl: file.filename,
      fileName: file.originalname,
    }));

    const bid = new Bid({ task: taskId, user: userId, offerAmount, remarks, media });
    await bid.save();

    task.totalBids = (task.totalBids || 0) + 1;
    await task.save();

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.BID_PLACED_SUCCESS,
      data: bid
    });
  } catch (err) {
    console.error(err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_BID
    });
  }
};

const myBids = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, category, bidStatus } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const userId = req.user._id;

    const bidQuery = { user: userId };

    if (bidStatus) {
      // user explicitly selected a bidStatus filter → respect it
      bidQuery.status = bidStatus;
    } else if (category) {
      // user filtered by category → include all statuses
      bidQuery.status = { $in: ["accepted", "pending", "rejected"] };
    } else {
      // default view → show only accepted + pending
      bidQuery.status = { $in: ["accepted", "pending"] };
    }

    const userBids = await Bid.find(bidQuery)
      .populate({
        path: "task",
        match: search
          ? {
            $or: [
              { taskTitle: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          }
          : {},
        select:
          "taskTitle description address budget budgetEnd whenNeeded category status createdBy createdAt attachments",
        populate: [
          { path: "category", select: "_id templateName" },
          { path: "createdBy", select: "firstName lastName" },
        ],
      })
      .sort({ createdAt: -1 });

    // remove bids where task didn’t match search/category
    let filteredBids = userBids.filter((bid) => {
      // Keep the bid if it has a valid popuslated task (not null)
      return bid.task && bid.task.category;
    });

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filteredBids = filteredBids.filter(
        (bid) => bid.task?.category?._id?.toString() === category
      );
    }

    if (!filteredBids.length) {
      return res.status(API_RESPONSE_CODES.SUCCESS).json({
        success: true,
        total: 0,
        page,
        limit,
        totalPages: 0,
        data: [],
        appliedFilters: {
          search: search || null,
          category: category || null,
          bidStatus: bidStatus || "accepted,pending (default)",
        },
      });
    }

    const taskIds = [
      ...new Set(filteredBids.map((b) => b.task?._id.toString()).filter(Boolean)),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const allBidsStats = await Bid.aggregate([
      {
        $match: {
          task: { $in: taskIds },
        },
      },
      {
        $group: {
          _id: "$task",
          minBid: { $min: "$offerAmount" },
          maxBid: { $max: "$offerAmount" },
          totalBids: { $sum: 1 },
        },
      },
    ]);

    const bidsStatsMap = {};
    allBidsStats.forEach((stat) => {
      bidsStatsMap[stat._id.toString()] = {
        minBid: stat.minBid,
        maxBid: stat.maxBid,
        totalBids: stat.totalBids,
      };
    });

    const data = filteredBids
      .map((bid) => {
        const task = bid.task;
        if (!task) return null;

        const stats = bidsStatsMap[task._id.toString()] || {};
        const bidsRange =
          stats.minBid && stats.maxBid
            ? stats.minBid === stats.maxBid
              ? `$${stats.minBid}`
              : `$${stats.minBid} - $${stats.maxBid}`
            : "No bids yet";

        return {
          _id: task._id,
          taskTitle: task.taskTitle,
          description: task.description,
          address: task.address,
          budget: task.budget,
          budgetEnd: task.budgetEnd,
          whenNeeded: task.whenNeeded,
          category: task.category,
          status: task.status,
          createdBy: task.createdBy || null,
          createdAt: task.createdAt,
          totalBids: stats.totalBids || 0,
          bidsRange,
          attachments: task.attachments || [],
          myBid: {
            bidId: bid._id,
            offerAmount: bid.offerAmount,
            remarks: bid.remarks,
            status: bid.status,
            createdAt: bid.createdAt,
            media: (bid.media || []).map((m) => ({
              fileUrl: m.fileUrl?.startsWith("http")
                ? m.fileUrl
                : `${IMAGE_PREFIX}${IMAGE_PATH.BID_MEDIA}${m.fileUrl}`,
              fileName: m.fileName || null,
            })),
          },
        };
      })
      .filter(Boolean);

    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = data.slice((page - 1) * limit, page * limit);

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      total,
      page,
      limit,
      totalPages,
      data: paginatedData,
      appliedFilters: {
        search: search || null,
        category: category || null,
        bidStatus: bidStatus || "accepted,pending (default)",
      },
    });
  } catch (error) {
    console.error("Get my bids error:", error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.ERROR_FETCH_BID,
      error: error.message,
    });
  }
};

const updateBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.user._id;

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BID_NOT_FOUND
      });
    }

    if (bid.user.toString() !== userId.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.NOT_AUTHORIZED
      });
    }

    if (req.body.offerAmount !== undefined) bid.offerAmount = Number(req.body.offerAmount);
    if (req.body.remarks !== undefined) bid.remarks = req.body.remarks;

    const hasNewMedia = req.files && req.files.length > 0;

    const existingMedia = bid.media || [];

    // Delete old files if new media uploaded
    if (hasNewMedia) {
      existingMedia.forEach(m => {
        const filePath = path.join(__dirname, '../uploads/bids', m.fileUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

      const newMediaFiles = req.files.filter(f => f.fieldname === 'media');
      bid.media = newMediaFiles.map(file => ({
        fileUrl: file.filename,
        fileName: file.originalname,
      }));
    } else if (!hasNewMedia && bid.media?.length > 0) {
      // Remove all media
      existingMedia.forEach(m => {
        const filePath = path.join(__dirname, '../uploads/bids', m.fileUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      bid.media = [];
    }

    await bid.save();

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.BID_UPDATED_SUCCESS,
      data: bid
    });

  } catch (err) {
    console.error('Update Bid Error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_BID
    });
  }
};

const deleteBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.user._id;

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BID_NOT_FOUND,
      });
    }

    const task = await Task.findById(bid.task);
    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.TASK_BID_NOT_FOUND,
      });
    }

    if (bid.user.toString() !== userId.toString() && task.createdBy.toString() !== userId.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.CANNOT_DELETE_BID,
      });
    }

    // If the deleted bid was the accepted one, reset acceptedBid
    if (task.acceptedBid?.toString() === bidId) {
      task.acceptedBid = null;
    }

    await Bid.findByIdAndDelete(bidId);

    // Update total bids and bids range
    task.totalBids = Math.max((task.totalBids || 1) - 1, 0);

    // Optionally recalculate bidsRange after deletion
    const activeBids = await Bid.find({ task: task._id, status: BIDSTATUS.ACTIVE });
    if (activeBids.length > 0) {
      const amounts = activeBids.map((b) => b.offerAmount);
      task.bidsRange = Math.max(...amounts) - Math.min(...amounts); // Example logic
    } else {
      task.bidsRange = 0;
    }

    await task.save();

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.BID_DELETED,
    });
  } catch (err) {
    console.error(err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.ERROR_DELETE_BID,
    });
  }
};

module.exports = {
  createBid,
  myBids,
  updateBid,
  deleteBid,
  getBidAcceptanceDetails,
  confirmBid
}