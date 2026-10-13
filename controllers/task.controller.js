const Task = require('../models/Task');
const Review = require('../models/Review');
const Business = require('../models/Business');
const User = require('../models/User');
const Bid = require('../models/Bid');
const { sendOtpEmail, sendTaskCompletionProviderEmail, sendTaskCompletionSeekerEmail } = require('../utils/sendEmail')
const mongoose = require('mongoose');
const { TASKSTATUS, STATUS, BUSINESSSTATUS, IMAGE_PREFIX, IMAGE_PATH } = require('../constants/constant');
const { API_RESPONSE_CODES, MSG } = require('../constants//user_messages');

const createTask = async (req, res) => {
  try {
    const { taskTitle, description, category, location, whenNeeded, budget, budgetEnd, tags } = req.body;

    let attachments = req.files?.map(file => ({
      fileUrl: file.filename,
      fileName: file.originalname,
    })) || [];

    // if (!attachments || attachments.length === 0) {
    //   const template = await Template.findById(category).lean();
    //   if (template?.posterImage) {
    //     attachments = [{
    //       fileName: 'posterImage',
    //       fileUrl: template.posterImage
    //     }];
    //   }
    // }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.USER_NOT_FOUND });
    }

    if (user.accountStatus === STATUS.SUSPENDED) {
      return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({ success: false, message: MSG.USER_ACCOUNT_SUSPENDED_TASK });
    }

    // Extract address from request and user
    const requestAddress = location?.street || location?.city || location?.state || location?.country || location?.pincode;
    const userRegisteredAddress = user.address;

    // Use request address if provided, otherwise use user's registered address
    let taskAddress;
    if (requestAddress) {
      taskAddress = {
        street: location?.street || '',
        city: location?.city || '',
        state: location?.state || '',
        country: location?.country || '',
        pincode: location?.pincode || ''
      };
    } else if (userRegisteredAddress) {
      taskAddress = userRegisteredAddress;
    }

    const taskLocation = (location?.coordinates?.length === 2)
      ? {
        type: 'Point',
        coordinates: [
          parseFloat(location.coordinates[0]),
          parseFloat(location.coordinates[1])
        ]
      }
      : user.location;  // fallback to saved location if any

    const formattedTags = tags
      ? tags.split(',').map(tag => tag.toLowerCase().trim()).filter(tag => tag)
      : [];

    const newTask = new Task({
      taskTitle,
      description,
      category,
      address: taskAddress,
      location: taskLocation,
      whenNeeded,
      budget,
      budgetEnd,
      attachments,
      tags: formattedTags,
      createdBy: userId,
    });

    await newTask.save();

    return res.status(API_RESPONSE_CODES.CREATED).json({
      success: true,
      message: MSG.TASK_CREATED,
    });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR_TASK });
  }
};

const getTasks = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, category, min, max, location, dateFilter, status, sortBy } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = { isDeleted: { $ne: true }, status: { $in: [TASKSTATUS.OPEN] } };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { taskTitle: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    if (min || max) {
      query.budget = {};
      if (min) query.budget.$gte = Number(min);
      if (max) query.budget.$lte = Number(max);
    }

    if (location) {
      query.$or = [
        ...(query.$or || []),
        { 'address.city': { $regex: location, $options: 'i' } },
        { 'address.pincode': { $regex: location, $options: 'i' } }
      ];
    }

    if (dateFilter === 'today' || dateFilter === 'tomorrow') {
      const now = new Date();
      let start, end;
      if (dateFilter === 'today') {
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        start = new Date(tomorrow.setHours(0, 0, 0, 0));
        end = new Date(tomorrow.setHours(23, 59, 59, 999));
      }
      query.whenNeeded = { $gte: start };
    }

    const userId = req.user?._id;
    if (userId) query.createdBy = { $ne: userId };

    let biddedTasks = [];
    if (userId) {
      biddedTasks = await Bid.find({ user: userId }).distinct('task');
      if (biddedTasks.length > 0) {
        query._id = { $nin: biddedTasks };
      }
    }

    const business_profile = await Business.findOne({ user: userId, isDeleted: { $ne: true } });

    if (!business_profile) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.BUSINESS_PROFILE_FOR_TASKS,
        business_status: 'not_exists'
      });
    }

    if (business_profile) {
      if (business_profile.status === BUSINESSSTATUS.PENDING) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.PROFILE_UNDER_VERIFICATION, business_status: business_profile.status });
      }
      if (business_profile.status === BUSINESSSTATUS.SUSPENDED) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.PROFILE_SUSPENDED, business_status: business_profile.status });
      }
      if (business_profile.sub_category?.length > 0) {
        if (category) {
          query.category = category;
        } else {
          query.category = { $in: business_profile.sub_category };
        }
      } else {
        return res.status(API_RESPONSE_CODES.SUCCESS).json({
          success: true,
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0,
          isLoggedIn: true,
          data: [],
          appliedFilters: { status, location, min, max, search, dateFilter, sortBy }
        });
      }
    }

    let sortOption = {};
    switch (sortBy) {
      case 'latest': sortOption = { createdAt: -1 }; break;
      case 'oldest': sortOption = { createdAt: 1 }; break;
      case 'soon': sortOption = { whenNeeded: 1 }; break;
      case 'later': sortOption = { whenNeeded: -1 }; break;
      case 'highToLow': sortOption = { budget: -1 }; break;
      case 'lowToHigh': sortOption = { budget: 1 }; break;
      case 'recommended': sortOption = { budget: -1 }; break;
      default: sortOption = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [tasks, total] = await Promise.all([
      Task.find(query, 'taskTitle description address budget budgetEnd tags whenNeeded category attachments status totalSpent totalBids createdAt createdBy')
        .populate('createdBy', '_id firstName lastName')
        .populate('category', 'templateName')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Task.countDocuments(query)
    ]);

    const userIds = [
      ...new Set(tasks.map(t => t.createdBy?._id?.toString()).filter(Boolean))
    ];

    const completedByUser = await Task.aggregate([
      {
        $match: {
          createdBy: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) },
          status: TASKSTATUS.COMPLETED,
          isDeleted: { $ne: true }
        }
      },
      {
        $lookup: {
          from: 'bids',
          localField: 'acceptedBid',
          foreignField: '_id',
          as: 'acceptedBidData'
        }
      },
      { $unwind: { path: '$acceptedBidData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            createdBy: '$createdBy',
            acceptedBid: '$acceptedBid'
          },
          offerAmount: { $first: { $toDouble: '$acceptedBidData.offerAmount' } }
        }
      },
      {
        $group: {
          _id: '$_id.createdBy',
          totalSpent: { $sum: '$offerAmount' },
          completedCount: { $sum: 1 }
        }
      }
    ]);

    const totalSpentMap = {};
    completedByUser.forEach(item => {
      totalSpentMap[item._id.toString()] = item.totalSpent || 0;
    });

    const tasksWithOneImage = tasks.map(task => ({
      ...task,
      totalSpent: totalSpentMap[task.createdBy?._id?.toString()] || 0,
      attachments:
        task.attachments?.length > 0
          ? [{
            ...task.attachments[0],
            fileUrl: `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${task.attachments[0].fileUrl}`
          }]
          : []
    }));

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      business_status: business_profile.status,
      data: tasksWithOneImage,
      appliedFilters: { status, location, min, max, search, dateFilter, sortBy, category }
    });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR_TASK });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({ success: false, message: MSG.USER_NOT_FOUND });
    }

    let { page = 1, limit = 10, search, category, status, dateFilter } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    const query = { createdBy: userId, isDeleted: { $ne: true } };

    if (search) {
      query.$or = [
        { taskTitle: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;

    const statusFilters = TASKSTATUS.ALL;
    if (status && statusFilters.includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    let sortField = ['createdAt', 'whenNeeded'].includes(dateFilter) ? dateFilter : 'createdAt';

    let tasks, total;

    if (sortField === 'whenNeeded') {
      const farFutureDate = new Date(9999, 0, 1);
      [tasks, total] = await Promise.all([
        Task.aggregate([
          { $match: query },
          {
            $addFields: {
              sortWhenNeeded: { $ifNull: ['$whenNeeded', farFutureDate] },
            },
          },
          {
            $sort: { sortWhenNeeded: 1, createdAt: -1 },
          },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              taskTitle: 1,
              description: 1,
              address: 1,
              budget: 1,
              budgetEnd: 1,
              tags: 1,
              whenNeeded: 1,
              category: 1,
              attachments: 1,
              createdAt: 1,
              totalBids: 1,
              status: 1,
            },
          },
        ]),
        Task.countDocuments(query),
      ]);
    } else {
      [tasks, total] = await Promise.all([
        Task.find(query, 'taskTitle description address budget budgetEnd tags whenNeeded category attachments createdAt totalBids status')
          .populate('category', 'templateName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Task.countDocuments(query),
      ]);
    }

    const taskIds = tasks.map((t) => t._id);

    const bidsAggregation = await Bid.aggregate([
      { $match: { task: { $in: taskIds } } },
      {
        $group: {
          _id: '$task',
          minBid: { $min: '$offerAmount' },
          maxBid: { $max: '$offerAmount' },
        },
      },
    ]);

    const bidsMap = {};
    bidsAggregation.forEach((b) => {
      bidsMap[b._id.toString()] = {
        minBid: b.minBid,
        maxBid: b.maxBid,
      };
    });

    const tasksWithOneImage = tasks.map((task) => ({
      ...task,
      attachments:
        task.attachments && task.attachments.length > 0
          ? [
            {
              ...task.attachments[0],
              fileUrl: `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${task.attachments[0].fileUrl}`
            }
          ]
          : [],
      bidsRange: bidsMap[task._id.toString()]
        ? `$${bidsMap[task._id.toString()].minBid} - $${bidsMap[task._id.toString()].maxBid}`
        : 0,
    }));

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: tasksWithOneImage,
      appliedFilters: {
        search: search || null,
        category: category || null,
        status: status || null,
        dateFilter: sortField,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR_TASK });
  }
};

const getAssignedTasks = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({
        success: false,
        message: MSG.UNAUTHORIZED_USER_NOT_FOUND,
      });
    }

    // Find all bids placed by this provider
    const userBids = await Bid.find({ user: userId }).select("_id");
    const bidIds = userBids.map(bid => bid._id);

    let { page = 1, limit = 10, category, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Fetch both assigned and completed tasks
    const query = {
      acceptedBid: { $in: bidIds },
      status: { $in: [TASKSTATUS.ASSIGNED, TASKSTATUS.COMPLETED] },
      isDeleted: { $ne: true },
    };

    if (category) query.category = category;

    if (search && search.trim() !== "") {
      query.$or = [
        { taskTitle: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate("category", "templateName")
        .populate("createdBy", "firstName lastName")
        .populate("acceptedBid")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(query),
    ]);

    // Add completion details cleanly in response
    const formattedTasks = tasks.map(task => ({
      _id: task._id,
      taskTitle: task.taskTitle,
      description: task.description,
      category: task.category,
      createdBy: task.createdBy,
      acceptedBid: task.acceptedBid,
      status: task.status,
      budget: task.budget,
      completionNotes: task.completionNotes || null,
      completionAttachments:
        (task.completionAttachments || []).map((file) => ({
          fileUrl: file.fileUrl
            ? `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${file.fileUrl}`
            : null,
        })) || [],
      completionDate: task.completionDate
    }));

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: formattedTasks,
      appliedFilters: {
        category: category || null,
        search: search || null,
      },
    });

  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

const generateOTP = async (req, res) => {
  try {
    const taskId = req.params.id;
    const providerId = req.user._id;
    const { notes } = req.body;

    // Fetch task with acceptedBid and owner details
    const task = await Task.findById(taskId)
      .populate({
        path: 'acceptedBid',
        select: 'user offerAmount status media',
      })
      .populate('createdBy', 'firstName lastName email');

    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TASK_NOT_FOUND });
    }

    if (!task.acceptedBid) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.NO_BID_FOUND });
    }

    if (task.status === TASKSTATUS.COMPLETED) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.TASK_ALREADY_COMPLETED });
    }

    if (task.status !== TASKSTATUS.ASSIGNED) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.TASK_CANNOT_COMPLETED });
    }

    // Ensure provider is authorized
    if (!task.acceptedBid.user || task.acceptedBid.user.toString() !== providerId.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({ success: false, message: MSG.NOT_AUTHORIZED });
    }

    // Save notes if provided
    if (notes) task.completionNotes = notes;

    // Save attachments if uploaded
    if (req.files && req.files.length > 0) {
      const uploadedFiles = req.files
        .filter(f => f.fieldname === 'attachments')
        .map(f => ({ fileUrl: f.filename })); // store file paths
      task.completionAttachments = uploadedFiles;
    }

    // Generate OTP if not already present
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    task.otp = otp;
    task.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await sendOtpEmail(task.createdBy, otp);

    await task.save();

    // Respond with only notes and attachments
    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.OTP_SENT,
      completionNotes: task.completionNotes,
      completionAttachments: task.completionAttachments,
    });

  } catch (err) {
    console.error("Error completing task:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const taskId = req.params.id;
    const otp = req.body.otp;
    const providerId = req.user._id;

    const task = await Task.findById(taskId)
      .populate({
        path: 'acceptedBid',
        select: 'offerAmount status media user',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .populate('createdBy', 'firstName lastName email');

    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TASK_NOT_FOUND });
    }

    if (
      !task.acceptedBid ||
      task.acceptedBid.user._id.toString() !== providerId.toString()
    ) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.NOT_AUTHORIZED
      });
    }


    if (!task.otpExpiry || new Date() > task.otpExpiry) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.OTP_EXPIRED });
    }

    // Check OTP
    if (task.otp !== otp) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.INVALID_OTP });
    }

    // Mark task as completed
    task.status = TASKSTATUS.COMPLETED;
    task.otpVerified = true;
    task.completionDate = new Date();

    // Remove OTP after verification
    // task.otp = undefined;
    // task.otpExpiry = undefined;

    await task.save();

    sendTaskCompletionProviderEmail(task.acceptedBid.user, task.taskTitle)

    sendTaskCompletionSeekerEmail(task.createdBy, task.taskTitle, task.acceptedBid.user)

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TASK_COMPLETED,
    });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR });
  }
};

const resendOTP = async (req, res) => {
  try {
    const taskId = req.params.id;
    const providerId = req.user._id;

    // Find task with accepted bid and task owner details
    const task = await Task.findById(taskId)
      .populate({
        path: "acceptedBid",
        select: "user",
      })
      .populate("createdBy", "firstName lastName email");

    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TASK_NOT_FOUND });
    }

    if (!task.acceptedBid) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.NO_ACCEPTED_BID });
    }

    if (task.status !== TASKSTATUS.ASSIGNED) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.CANNOT_RESEND_OTP });
    }

    if (task.acceptedBid.user.toString() !== providerId.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({ success: false, message: MSG.UNAUTHORIZED_ACCESS });
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    task.otp = newOtp;
    task.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // new 10 min expiry

    // Send OTP email again
    await sendOtpEmail(task.createdBy, newOtp);

    await task.save();

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.RESEND_OTP
    });

  } catch (err) {
    console.error("Error resending OTP:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR });
  }
};

const completeWithoutOTP = async (req, res) => {
  try {
    const taskId = req.params.id;
    const providerId = req.user._id;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.REASON_IS_REQUIRED });
    }

    const task = await Task.findById(taskId)
      .populate({
        path: 'acceptedBid',
        select: 'offerAmount status media user',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .populate("createdBy", "firstName lastName email");

    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TASK_NOT_FOUND });
    }

    if (task.status !== TASKSTATUS.ASSIGNED) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.TASK_CANNOT_COMPLETED });
    }

    if (
      !task.acceptedBid ||
      task.acceptedBid.user._id.toString() !== providerId.toString()
    ) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.NOT_AUTHORIZED
      });
    }

    // Mark task as completed
    task.status = TASKSTATUS.COMPLETED;
    task.completionDate = new Date();
    task.otpVerified = false
    task.reason = reason;

    task.otp = undefined
    await task.save();

    sendTaskCompletionProviderEmail(task.acceptedBid.user, task.taskTitle)

    sendTaskCompletionSeekerEmail(task.createdBy, task.taskTitle, task.acceptedBid.user)

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TASK_COMPLETED_WITHOUT_OTP,
      completionDate: task.completionDate,
      reason: reason,
    });
  } catch (err) {
    console.error("Error completing task without OTP:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_TASK_ID
      });
    }

    const loggedInUserId = req.user?._id;
    const isBusinessRegistered = req.user?.businessRegistered; // true → provider, false → customer

    const task = await Task.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("createdBy", "firstName lastName email")
      .populate("category", "_id templateName description")
      .lean();

    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.TASK_NOT_FOUND
      });
    }

    let isReviewed = false;

    if (isBusinessRegistered) {
      // provider logged in
      isReviewed = task.providerReviewed || false;
    } else {
      // customer logged in
      isReviewed = task.customerReviewed || false;
    }

    let isOwner = false;
    if (loggedInUserId && task.createdBy && task.createdBy._id.equals(loggedInUserId)) {
      isOwner = true;
    }

    let bidsList = await Bid.find({ task: task._id, status: { $ne: 'canceled' } })
      .populate({
        path: 'user',
        select: 'firstName lastName email business',
        populate: { path: 'business', select: 'businessName isDeleted' }
      })
      .lean();

    bidsList = bidsList.filter(b => b.user?.business && b.user.business.isDeleted !== true);

    const totalBids = bidsList.length;
    const bidAmounts = bidsList.map(b => b.offerAmount);
    const minBid = bidAmounts.length ? Math.min(...bidAmounts) : 0;
    const maxBid = bidAmounts.length ? Math.max(...bidAmounts) : 0;
    const bidsRange = minBid && maxBid ? `$${minBid} - $${maxBid}` : 0;

    let reviews = [];

    if (task.status === "completed") {
      // Fetch all reviews for this task
      reviews = await Review.find({
        taskId: task._id,
        isDeleted: false,
      })
        .populate("reviewerId", "_id firstName lastName email")
        .populate("reviewerBusinessId", "_id businessName")
        .populate("reviewedUserId", "firstName lastName email")
        .select("rating comments attachments createdAt reviewerId reviewerBusinessId reviewedUserId")
        .lean();

      // Filter based on role (customer or provider)
      if (!isBusinessRegistered) {
        // Customer → show reviews written by provider for the user
        reviews = reviews.filter(r =>
          r.reviewedUserId?._id?.toString() === loggedInUserId?.toString() &&
          r.reviewerBusinessId !== null
        );
      } else {
        // Provider → show reviews written by customer for the provider
        reviews = reviews.filter(r =>
          r.reviewedUserId?._id?.toString() === loggedInUserId?.toString() &&
          r.reviewerBusinessId === null
        );
      }
    } else {
      // If not completed → show client's past reviews
      reviews = await Review.find({
        reviewedUserId: task.createdBy._id,
        isDeleted: false,
      })
        .populate("reviewerBusinessId", "_id businessName")
        .populate("reviewerId", "firstName lastName")
        .select("rating comments createdAt")
        .lean();
    }

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
          (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews) * 10
        ) / 10
        : 0;

    const formattedReviews = reviews.map(r => ({
      _id: r._id,
      rating: r.rating,
      comments: r.comments,
      attachments: (r.attachments || []).map(a =>
        a.fileUrl ? `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${a.fileUrl}` : null
      ),
      reviewer: r.reviewerId
        ? `${r.reviewerId.firstName} ${r.reviewerId.lastName}`
        : null,
      reviewerBusiness: r.reviewerBusinessId
        ? r.reviewerBusinessId.businessName
        : null,
      reviewedUser: r.reviewedUserId
        ? `${r.reviewedUserId.firstName} ${r.reviewedUserId.lastName}`
        : null,
      createdAt: r.createdAt
    }));

    const formattedTask = {
      id: task._id,
      title: task.taskTitle,
      description: task.description,
      address: task.address || null,
      location: task.location || null,
      date: task.whenNeeded ? task.whenNeeded.toISOString().split("T")[0] : null,
      time: task.whenNeeded
        ? new Date(task.whenNeeded).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null,
      budget: task.budget ? `$${task.budget.toFixed(2)}` : null,
      budgetEnd: task.budgetEnd ? `$${task.budgetEnd.toFixed(2)}` : null,
      tags: task.tags || [],
      status: task.status,
      createdAt: task.createdAt,
      createdBy: task.createdBy
        ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
        : "Client",
      category: task.category
        ? { id: task.category._id, templateName: task.category.templateName }
        : null,
      totalBids,
      bidsRange,
      totalSpent: task.totalSpent || 0,
      attachments: (task.attachments || []).map((i) => ({
        fileUrl: `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${i.fileUrl}`,
        fileName: i.fileName,
      })),
      isOwner,
      totalReviews,
      averageRating,
      reviews: formattedReviews,
      isReviewed
    };

    let acceptedBid = null;

    const formattedBids = bidsList
      .map(b => ({
        _id: b._id,
        offerAmount: b.offerAmount,
        remarks: b.remarks || '',
        status: task.acceptedBid && b._id.equals(task.acceptedBid) ? 'accepted' : b.status,
        media: (b.media || []).map(m => ({
          fileUrl: m.fileUrl?.startsWith("http")
            ? m.fileUrl
            : `${IMAGE_PREFIX}${IMAGE_PATH.BID_MEDIA}${m.fileUrl}`,
          fileName: m.fileName || null,
        })),
        createdAt: b.createdAt,
        user: {
          _id: b.user._id,
          firstName: b.user.firstName,
          lastName: b.user.lastName,
          email: b.user.email,
          businessName: b.user.business?.businessName || null
        }
      }))
      .filter(b => {
        if (b.status === 'accepted') {
          acceptedBid = b;
          return false;
        }
        return true;
      });

    formattedTask.all_bids = formattedBids;
    formattedTask.accepted_bid = acceptedBid;

    if (!isOwner) {
      formattedTask.bid =
        formattedBids.find(b => b.user?._id?.toString() === loggedInUserId?.toString()) || null;
    }

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      data: formattedTask
    });

  } catch (error) {
    console.error("Error in getTaskById:", error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_TASK
    });
  }
};

const updateMyTasks = async (req, res) => {
  try {
    const taskId = req.params.id;
    if (!taskId) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_TASK_ID,
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.TASK_NOT_FOUND,
      });
    }

    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.USER_NOT_FOUND,
      });
    }

    const {
      taskTitle,
      description,
      category,
      location,
      whenNeeded,
      budget,
      budgetEnd,
      tags,
      attachments, // from frontend (remaining attachments)
    } = req.body;

    const updates = {};

    if (taskTitle) updates.taskTitle = taskTitle;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (budget) updates.budget = budget;
    if (budgetEnd) updates.budgetEnd = budgetEnd;
    if (whenNeeded) updates.whenNeeded = whenNeeded;

    // ✅ Normalize tags
    if (tags) {
      if (Array.isArray(tags)) {
        updates.tags = tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
      } else if (typeof tags === "string") {
        updates.tags = tags
          .split(",")
          .map((t) => t.toLowerCase().trim())
          .filter(Boolean);
      }
    }

    // ✅ Handle address & location
    if (location) {
      const addressFields = ["street", "city", "state", "country", "pincode"];
      const hasAddress = addressFields.some((f) => location[f] !== undefined);

      if (hasAddress) {
        updates.address = {
          street: location.street || "",
          city: location.city || "",
          state: location.state || "",
          country: location.country || "",
          pincode: location.pincode || "",
        };
      }

      if (
        location.coordinates &&
        Array.isArray(location.coordinates) &&
        location.coordinates.length === 2 &&
        !isNaN(location.coordinates[0]) &&
        !isNaN(location.coordinates[1])
      ) {
        updates.location = {
          type: "Point",
          coordinates: [
            parseFloat(location.coordinates[0]),
            parseFloat(location.coordinates[1]),
          ],
        };
      }
    }

    // ✅ FILE HANDLING
    const uploadedFiles =
      req.files?.filter((f) => f.fieldname === "attachments") || [];

    // Current attachments from DB
    let finalAttachments = Array.isArray(task.attachments)
      ? [...task.attachments]
      : [];

    // Parse frontend attachments (remaining ones user kept)
    let frontendAttachments = [];
    if (attachments) {
      try {
        frontendAttachments =
          typeof attachments === "string"
            ? JSON.parse(attachments)
            : attachments;
      } catch (err) {
        frontendAttachments = [];
      }
    }

    // 🧠 Step 1: Handle remaining attachments from frontend
    if (Array.isArray(frontendAttachments)) {
      if (frontendAttachments.length === 0) {
        // User removed all attachments
        finalAttachments = [];
      } else {
        // Keep only attachments user did not remove
        const remainingUrls = frontendAttachments.map((a) =>
          (a.fileUrl || a).toString().trim()
        );
        finalAttachments = finalAttachments.filter((att) =>
          remainingUrls.includes(att.fileUrl.toString().trim())
        );
      }
    }

    // 🧩 Step 2: Add any new uploads
    if (uploadedFiles.length > 0) {
      const newUploads = uploadedFiles.map((file) => ({
        fileUrl: file.filename,
        fileName: file.originalname,
      }));
      finalAttachments.push(...newUploads);
    }

    // 🧩 Step 3: Update final attachments
    updates.attachments = finalAttachments;

    // 🧩 Step 4: Save and populate
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updates },
      { new: true }
    )
      .populate("category", "templateName")
      .lean();

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TASK_UPDATED,
      data: updatedTask,
    });
  } catch (err) {
    console.error("Update Task Error:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_TASK,
      error: err.message,
    });
  }
};

const deleteMyTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    if (!taskId) return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.INVALID_TASK_ID });

    const task = await Task.findById(taskId);
    if (!task) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TASK_NOT_FOUND });

    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({ success: false, message: MSG.USER_NOT_FOUND });
    }

    await Task.findByIdAndDelete(taskId);

    return res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.TASK_DELETED });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR_TASK });
  }
};

const changeTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(TASKSTATUS).includes(status)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: `Invalid status. Allowed: ${Object.values(TASKSTATUS).join(', ')}`
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedTask) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TASK_NOT_FOUND });
    }

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: `Task status updated to ${status}`,
      data: updatedTask
    });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR_TASK });
  }
};

const getSortOptions = (req, res) => {
  const sortOptions = [
    { name: 'latest', label: 'Latest' },
    { name: 'oldest', label: 'Oldest' },
    { name: 'highToLow', label: 'High to Low' },
    { name: 'lowToHigh', label: 'Low to High' },
    { name: 'recommended', label: 'Recommended' },
  ];

  res.status(API_RESPONSE_CODES.SUCCESS).json({
    success: true,
    data: sortOptions
  });
};

const getTaskDropdownFilters = async (req, res) => {
  try {
    const statusFilters = [
      { name: 'open', label: 'Open' },
      { name: 'assigned', label: 'Assigned' },
      { name: 'completed', label: 'Completed' },
      { name: 'cancelled', label: 'Cancelled' },
      { name: 'expired', label: 'Expired' },
    ];

    const dateFields = [
      { name: 'createdAt', label: 'Recently created' },
      { name: 'whenNeeded', label: 'Needed on' },
    ];

    const bidStatus = [
      { name: 'pending', label: 'pending' },
      { name: 'accepted', label: 'accepted' },
      { name: 'rejected', label: 'rejected' },
      { name: 'canceled', label: 'canceled' },
    ]

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      data: {
        statusFilters,
        dateFields,
        bidStatus
      }
    });
  } catch (err) {
    console.error('Get task dropdown filters error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR });
  }
};

module.exports = {
  createTask,
  getTasks,
  getMyTasks,
  getAssignedTasks,
  generateOTP,
  verifyOTP,
  resendOTP,
  completeWithoutOTP,
  getTaskById,
  updateMyTasks,
  deleteMyTask,
  changeTaskStatus,
  getSortOptions,
  getTaskDropdownFilters
};
