const mongoose = require('mongoose');
const Review = require("../../models/Review");
const { MSG, API_RESPONSE_CODES } = require('../../constants/admin_messages');

const getReviewsList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '', taskId } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1 || limit > 100) limit = 10;

    const match = { isDeleted: { $ne: true } };

    if (taskId) {
      match.taskId = new mongoose.Types.ObjectId(taskId);
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      match.$or = [
        { comments: searchRegex },
        { 'reviewer.firstName': searchRegex },
        { 'reviewer.lastName': searchRegex },
        // You can add more searchable fields if needed
        // { 'reviewer.email': searchRegex },
      ];
    }

    const pipeline = [
      { $match: match },

      // 1. Reviewer user (who gave the review)
      {
        $lookup: {
          from: 'users',
          localField: 'reviewerId',
          foreignField: '_id',
          as: 'reviewer'
        }
      },
      { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },

      // 2. Reviewer's own business (if they own one)
      {
        $lookup: {
          from: 'businesses',
          let: { uid: '$reviewerId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user', '$$uid'] } } },
            { $limit: 1 }
          ],
          as: 'reviewerBusiness'
        }
      },
      { $unwind: { path: '$reviewerBusiness', preserveNullAndEmptyArrays: true } },

      // 3. Reviewed business
      {
        $lookup: {
          from: 'businesses',
          localField: 'reviewedBusinessId',
          foreignField: '_id',
          as: 'reviewedBusiness'
        }
      },
      { $unwind: { path: '$reviewedBusiness', preserveNullAndEmptyArrays: true } },

      // 4. Reviewed user (fallback when no business)
      {
        $lookup: {
          from: 'users',
          localField: 'reviewedUserId',
          foreignField: '_id',
          as: 'reviewedUser'
        }
      },
      { $unwind: { path: '$reviewedUser', preserveNullAndEmptyArrays: true } },

      // 5. Related Task
      {
        $lookup: {
          from: 'tasks',
          localField: 'taskId',
          foreignField: '_id',
          as: 'task'
        }
      },
      { $unwind: { path: '$task', preserveNullAndEmptyArrays: true } },

      // 6. Task category name
      {
        $lookup: {
          from: 'categories',
          localField: 'task.category',
          foreignField: '_id',
          as: 'taskCategory'
        }
      },
      { $unwind: { path: '$taskCategory', preserveNullAndEmptyArrays: true } },

      // 7. Build clean names BEFORE final projection (recommended)
      {
        $addFields: {
          reviewerFullName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$reviewer.firstName', ''] },
                  ' ',
                  { $ifNull: ['$reviewer.lastName', ''] }
                ]
              }
            }
          },
          reviewedName: {
            $cond: {
              if: { $ne: ['$reviewedBusiness.businessName', null] },
              then: '$reviewedBusiness.businessName',
              else: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ['$reviewedUser.firstName', ''] },
                      ' ',
                      { $ifNull: ['$reviewedUser.lastName', ''] }
                    ]
                  }
                }
              }
            }
          }
        }
      },

      // 8. Final projection
      {
        $project: {
          _id: 1,
          reviewer: {
            fullName: '$reviewerFullName',
            email: '$reviewer.email',
            businessName: '$reviewerBusiness.businessName'
          },
          reviewed: {
            name: '$reviewedName'
          },
          comments: 1,
          rating: 1,
          createdAt: 1,
          attachments: 1,           // ← review images / proofs
          task: {
            _id: '$task._id',
            title: '$task.taskTitle',
            categoryName: '$taskCategory.templateName',
            description: '$task.description',
            status: '$task.status',
            whenNeeded: '$task.whenNeeded',
            budget: '$task.budget'
          }
        }
      },

      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const reviews = await Review.aggregate(pipeline);

    // Get total count (separate query for performance)
    const total = await Review.countDocuments(match);

    res.status(200).json({
      success: true,
      data: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        reviews
      }
    });
  } catch (err) {
    console.error('Reviews list error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews',
      error: err.message
    });
  }
};

const deleteReview = async (req, res) => {
  // console.log('44444444444')
  try {
    const { id } = req.params;
    console.log(id)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_ID,
        data: null
      });
    }

    const deletedReview = await Review.findByIdAndUpdate(id, { isDeleted: true });
    // console.log("deleteReview", deletedReview)

    if (!deletedReview) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.REVIEW_NOT_FOUND_NOT_FOUND,
        data: null
      });
    }

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.BUSINESS_DELETED_SUCCESS,
      data: null
    });

  } catch (err) {
    console.error('Delete business error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

module.exports = {
  getReviewsList,
  deleteReview
};