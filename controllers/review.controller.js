const Review = require('../models/Review');
const Task = require('../models/Task');
const { MSG, API_RESPONSE_CODES } = require('../constants/user_messages');
const { TASKSTATUS } = require('../constants/constant');
const Business = require('../models/Business');

// Create Review
const createReview = async (req, res) => {
  try {
    const { comments, rating } = req.body;
    const { taskId } = req.params;
    const reviewerId = req.user._id;
    const reviewerBusinessId = req.user.business;

    const task = await Task.findById(taskId)
      .populate({
        path: 'acceptedBid',
        populate: { path: 'user', populate: { path: 'business', select: '_id businessName' } }
      })
      .populate({
        path: 'createdBy',
        select: 'business',
        populate: { path: 'business', select: '_id businessName' }
      });

    if (!task) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
      success: false,
      message: MSG.TASK_NOT_FOUND
    });

    if (task.status !== TASKSTATUS.COMPLETED) return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
      success: false,
      message: MSG.REVIEW_COMPLETED_TASK
    });

    const taskOwner = task.createdBy;
    const providerUser = task.acceptedBid?.user;

    if (!taskOwner) return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.TASK_NOT_CREATED });

    if (!providerUser) return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.TASK_NOT_ASSIGNED });

    let reviewedUserId, reviewedBusinessIdObj, reviewedBusinessId;

    if (taskOwner._id.toString() === reviewerId.toString()) {
      reviewedUserId = providerUser._id;
      reviewedBusinessId = providerUser.business?._id || null;
      reviewedBusinessIdObj = providerUser.business
        ? { _id: providerUser.business._id, businessName: providerUser.business.businessName }
        : null;
      task.customerReviewed = true; // mark customer reviewed
    } else if (providerUser._id.toString() === reviewerId.toString()) {
      reviewedUserId = taskOwner._id;
      reviewedBusinessId = taskOwner.business?._id || null;
      reviewedBusinessIdObj = taskOwner.business
        ? { _id: taskOwner.business._id, businessName: taskOwner.business.businessName }
        : null;
      task.providerReviewed = true; // mark provider reviewed
    } else {
      return res.status(API_RESPONSE_CODES.FORBIDDEN).json({
        success: false,
        message: MSG.CANNOT_REVIEW
      });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files
        .filter(file => file.fieldname === 'attachments')
        .map(file => ({
          fileUrl: file.filename,
          fileName: file.originalname
        }));
    }

    const existingReview = await Review.findOne({
      taskId,
      reviewerId,
      reviewedUserId
    });
    if (existingReview) return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
      success: false,
      message: MSG.ALREADY_REVIEWED_TASKS
    });

    const review = await Review.create({
      taskId,
      reviewerId,
      reviewerBusinessId,
      reviewedUserId,
      reviewedBusinessId,
      comments,
      rating,
      attachments
    });

    await task.save();

    const responseReview = {
      ...review.toObject(),
      reviewedBusinessId: reviewedBusinessIdObj
    };

    return res.status(API_RESPONSE_CODES.CREATED).json({
      success: true,
      message: MSG.REVIEW_SUCCESS,
      review: responseReview
    });

  } catch (err) {
    console.error(err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      error: err.message
    });
  }
};

// Cancel / Skip Review
const skipReview = async (req, res) => {
  try {
    const { taskId } = req.params;
    const reviewerId = req.user._id;

    const task = await Task.findById(taskId)
      .populate({
        path: 'acceptedBid',
        populate: {
          path: 'user',
          select: 'firstName lastName email business'
        }
      })
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email business',
        populate: {
          path: 'business',
          select: '_id businessName'
        }
      });

    if (!task) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TASK_NOT_FOUND });

    const taskOwner = task.createdBy;
    const providerUser = task.acceptedBid?.user;

    if (taskOwner._id.toString() === reviewerId.toString()) {
      task.customerReviewed = false; // skipped
      task.isReviewSkipped = true;   // mark skipped
    } else if (providerUser._id.toString() === reviewerId.toString()) {
      task.providerReviewed = false; // skipped
      task.isReviewSkipped = true;   // mark skipped
    } else {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.NOT_AUTHORIZED_SKIP_REVIEW });
    }

    await task.save();
    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.REVIEW_SKIPPED, task });
  } catch (err) {
    console.error(err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

// Get tasks not reviewed yet
const getPendingReviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const isProvider = !!req.user.business; // true if provider

    let tasks;

    if (isProvider) {
      tasks = await Task.find({
        status: TASKSTATUS.COMPLETED,
        providerReviewed: false,
        isReviewSkipped: { $ne: true }
      })
        .populate({
          path: 'acceptedBid',
          match: { user: userId },
          select: '_id offerAmount user',
          populate: {
            path: 'user',
            select: 'firstName lastName email business',
            populate: { path: 'business', select: '_id businessName' }
          }
        })
        .populate({
          path: 'createdBy',
          select: 'firstName lastName email business',
          populate: { path: 'business', select: '_id businessName' }
        });

      tasks = tasks.filter(task => task.acceptedBid);

    } else {
      tasks = await Task.find({
        status: TASKSTATUS.COMPLETED,
        createdBy: userId,
        customerReviewed: false,
        isReviewSkipped: { $ne: true }
      })
        .populate({
          path: 'acceptedBid',
          select: '_id offerAmount user',
          populate: {
            path: 'user',
            select: 'firstName lastName email business',
            populate: { path: 'business', select: '_id businessName' }
          }
        })
        .populate({
          path: 'createdBy',
          select: 'firstName lastName email business',
          populate: { path: 'business', select: '_id businessName' }
        });
    }

    const taskList = tasks.map(task => ({
      _id: task._id,
      taskTitle: task.taskTitle,
      description: task.description,
      category: task.category,
      address: task.address,
      location: task.location,
      whenNeeded: task.whenNeeded,
      budget: task.budget,
      attachments: task.attachments,
      status: task.status,
      totalBids: task.totalBids,
      tags: task.tags,
      createdBy: task.createdBy,
      acceptedBid: task.acceptedBid,
      customerReviewed: task.customerReviewed,
      providerReviewed: task.providerReviewed,
      completionNotes: task.completionNotes,
      completionAttachments: task.completionAttachments,
      completionDate: task.completionDate,
      isReviewSkipped: task.isReviewSkipped,
    }));

    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, tasks: taskList });

  } catch (err) {
    console.error(err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

const getMyReviewsAndBusinessReviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const { myReviewPage, custReviewPage, size } = req.body

    const limit = parseInt(size);
    const mySkip = (myReviewPage - 1) * limit;
    const custSkip = (custReviewPage - 1) * limit;

    // console.log(myReviewPage)
    // console.log(size)

    let q1 = {
      reviewerId: userId,
      isDeleted: false,
    }

    let totalMyReviews = await Review.countDocuments(q1)

    // console.log(totalMyReviews)

    // return 
    const reviewsIWrote = await Review.aggregate([
      {
        $match: q1
      },
      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "task"
        }
      },
      {
        $unwind: {
          path: "$task",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "businesses",
          localField: "reviewedBusinessId",
          foreignField: "_id",
          as: "reviewedBusiness",
        },
      },
      {
        $unwind: {
          path: "$reviewedBusiness",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "reviewedUserId",
          foreignField: "_id",
          as: "reviewedUser",
        },
      },
      {
        $unwind: {
          path: "$reviewedUser",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          rating: 1,
          comments: 1,
          attachments: 1,
          createdAt: 1,
          task: 1,
          reviewedBusiness: 1,
          reviewedUser: 1
          // reviewedBusiness: {
          //   _id: "$reviewedBusiness._id",
          //   name: "$reviewedBusiness.businessName",
          //   status: "$reviewedBusiness.status",
          //   image: "$reviewedBusiness.businessImages"
          // },

          // reviewedUser: {
          //   _id: "$reviewedUser._id",
          //   firstName: "$reviewedUser.firstName",
          //   lastName: "$reviewedUser.lastName",
          // },
        },
      },
      {
        $skip: mySkip
      },
      {
        $limit: limit
      },
      { $sort: { createdAt: -1 } },
    ]);

    const myBusinesses = await Business.find(
      { user: userId },
      { _id: 1 }
    );

    const businessIds = myBusinesses.map((b) => b._id);

    let reviewsAboutMyBusiness = [];
    let q2 = {
      reviewedBusinessId: { $in: businessIds },
      isDeleted: false,
    }
    let totalCustomerReviews = await Review.countDocuments(q2)

    if (businessIds.length > 0) {
      reviewsAboutMyBusiness = await Review.aggregate([
        {
          $match: q2
        },
        {
          $lookup: {
            from: "tasks",
            localField: "taskId",
            foreignField: "_id",
            as: "task"
          }
        },
        {
          $unwind: {
            path: "$task",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "reviewerId",
            foreignField: "_id",
            as: "reviewer",
          },
        },
        {
          $unwind: {
            path: "$reviewer",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "businesses",
            localField: "reviewedBusinessId",
            foreignField: "_id",
            as: "business",
          },
        },
        {
          $unwind: "$business",
        },

        {
          $project: {
            rating: 1,
            comments: 1,
            attachments: 1,
            createdAt: 1,
            reviewer: 1,
            business: 1,
            task: 1
            // reviewer: {
            //   _id: "$reviewer._id",
            //   firstName: "$reviewer.firstName",
            //   lastName: "$reviewer.lastName",
            // },

            // business: {
            //   _id: "$business._id",
            //   name: "$business.businessName",
            //   location:"$business.location",
            //   status: "$business.status",
            //   image: "$business.businessImages"
            // },
          },
        },
        {
          $skip: custSkip
        },
        {
          $limit: limit
        },
        { $sort: { createdAt: -1 } },
      ]);
    }



    return res.status(200).json({
      success: true,

      reviewsIWrote,
      totalMyReviews,
      totalMyReviewsPages: Math.ceil(totalMyReviews / limit),

      reviewsAboutMyBusiness,
      totalCustomerReviews,
      totalCustomerReviewsPages: Math.ceil(totalCustomerReviews / limit),
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const getReviewsIWrite = async (req, res) => {
  try {
    const userId = req.user._id;

    const reviews = await Review.aggregate([
      {
        $match: {
          reviewerId: userId,
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "businesses",
          localField: "reviewedBusinessId",
          foreignField: "_id",
          as: "reviewedBusiness",
        },
      },
      {
        $unwind: {
          path: "$reviewedBusiness",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reviewedUserId",
          foreignField: "_id",
          as: "reviewedUser",
        },
      },
      {
        $unwind: {
          path: "$reviewedUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          rating: 1,
          comments: 1,
          attachments: 1,
          createdAt: 1,

          reviewedBusiness: {
            _id: "$reviewedBusiness._id",
            name: "$reviewedBusiness.businessName",
            status: "$reviewedBusiness.status"
          },

          reviewedUser: {
            _id: "$reviewedUser._id",
            name: "$reviewedUser.fullName",
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      total: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get reviews I wrote error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  createReview, skipReview, getPendingReviews,
  getMyReviewsAndBusinessReviews, getReviewsIWrite
};
