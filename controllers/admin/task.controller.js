const Task = require('../../models/Task');
const Bid = require('../../models/Bid')
const mongoose = require('mongoose')
const { API_RESPONSE_CODES, MSG } = require('../../constants/admin_messages');
const { IMAGE_PREFIX, IMAGE_PATH, TASKSTATUS } = require('../../constants/constant')

const getTasksList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, category, status, startDate, endDate, dateField } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };
    if (category) query.category = category;
    if (status) query.status = status;

    if (search) {
      query.taskTitle = { $regex: search, $options: 'i' };
    }

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const filterField = dateField === 'whenNeeded' ? 'whenNeeded' : 'createdAt';
      query[filterField] = dateFilter;
    }

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName')
      .populate('category', 'templateName')
      .populate({
        path: 'acceptedBid',
        select: 'offerAmount user',
        populate: {
          path: 'user',
          select: 'business',
          populate: {
            path: 'business',
            select: 'businessName',
          },
        },
      });

    const result = tasks.map(task => {
      const taskData = {
        _id: task._id,
        taskTitle: task.taskTitle,
        createdBy: task.createdBy,
        whenNeeded: task.whenNeeded,
        createdAt: task.createdAt,
        category: task.category,
        budget: task.budget,
        status: task.status,
      };

      if (task.acceptedBid) {
        taskData.acceptedBid = {
          offerAmount: task.acceptedBid.offerAmount,
          businessName: task.acceptedBid.user.business
            ? task.acceptedBid.user.business.businessName
            : null,
        };
      }

      return taskData;
    });

    const totalTasks = await Task.countDocuments(query);

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      total: totalTasks,
      page,
      limit,
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

const getTaskDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_TASK_ID,
      });
    }

    const task = await Task.findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('category', 'templateName')
      .populate({
        path: 'acceptedBid',
        select: 'offerAmount user remarks',
        populate: {
          path: 'user',
          select: 'firstName lastName business',
          populate: {
            path: 'business',
            select: 'businessName',
          },
        },
      });

    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.TASK_NOT_FOUND,
      });
    }

    const bids = await Bid.find({ task: id })
      .populate({
        path: 'user',
        select: 'firstName lastName business',
        populate: {
          path: 'business',
          select: 'businessName',
        },
      })
      .sort({ createdAt: -1 });

    const bidsData = bids.map(bid => ({
      _id: bid._id,
      offerAmount: bid.offerAmount,
      remarks: bid.remarks,
      media: (bid.media || []).map(file =>
        file ? `${IMAGE_PREFIX}${IMAGE_PATH.BID_MEDIA}${file}` : null
      ),
      status: bid.status,
      createdAt: bid.createdAt,
      businessName: bid.user.business ? bid.user.business.businessName : null,
      bidder: {
        _id: bid.user._id,
        firstName: bid.user.firstName,
        lastName: bid.user.lastName,
      },
    }));

    const taskAttachments = (task.attachments || []).map(file => ({
      fileUrl: file.fileUrl ? `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${file.fileUrl}` : null,
      fileName: file.fileName,
    }));

    const taskData = {
      _id: task._id,
      taskTitle: task.taskTitle,
      description: task.description,
      category: task.category,
      address: task.address,
      location: task.location,
      whenNeeded: task.whenNeeded,
      budget: task.budget,
      attachments: taskAttachments,
      status: task.status,
      totalBids: task.totalBids,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    if (task.acceptedBid) {
      taskData.acceptedBid = {
        offerAmount: task.acceptedBid.offerAmount,
        businessName: task.acceptedBid.user.business
          ? task.acceptedBid.user.business.businessName
          : null,
        remarks: task.acceptedBid.remarks,
        bidder_name: `${task?.acceptedBid?.user?.firstName} ${task?.acceptedBid?.user?.lastName}`.trim()
      };
    }

    taskData.bids = bidsData;

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      data: taskData,
    });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

const getTasksCompletedWithoutOTP = async (req, res) => {
  try {
    let { page = 1, limit = 20, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const query = {
      status: TASKSTATUS.COMPLETED,
      otpVerified: false,
      isDeleted: { $ne: true }
    };

    if (search && search.trim() !== "") {
      query.$or = [
        { taskTitle: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate("createdBy", "firstName lastName email")
        .populate("acceptedBid", "user offerAmount")
        .sort({ completionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(query),
    ]);

    const formattedTasks = tasks.map(task => {
      const formattedTaskAttachments = (task.attachments || []).map(att => ({
        ...att,
        fileUrl: `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${att.fileUrl}`,
      }));

      const formattedCompletionAttachments = (task.completionAttachments || []).map(att => ({
        ...att,
        fileUrl: `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${att.fileUrl}`,
      }));

      return {
        ...task,
        attachments: formattedTaskAttachments,
        completionAttachments: formattedCompletionAttachments,
      };
    });

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: formattedTasks,
    });
  } catch (err) {
    console.error("Error fetching tasks completed without OTP:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

module.exports = {
  getTasksList,
  getTaskDetails,
  getTasksCompletedWithoutOTP
};
