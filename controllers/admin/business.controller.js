const Business = require('../../models/Business');
const Bid = require('../../models/Bid');
const Review = require('../../models/Review');
const Template = require('../../models/Template')
const mongoose = require('mongoose');
const fs = require('fs')
const { API_RESPONSE_CODES, MSG } = require('../../constants/admin_messages');
const { BUSINESSSTATUS, IMAGE_PREFIX, IMAGE_PATH } = require('../../constants/constant');

const createBusiness = async (req, res) => {
  try {
    const {
      businessName,
      businessDescription,
      category,
      sub_category,
      addressStreet,
      zipCode,
      city,
      state,
      country,
      location,
    } = req.body;

    const user = req.user;
    if (!user) {
      return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({
        success: false,
        message: MSG.UNAUTHORIZED_USER_NOT_FOUND,
      });
    }

    const businessImageFile = req.files?.find(f => f.fieldname === 'businessImages');
    const businessImages = businessImageFile
      ? { imageUrl: businessImageFile.filename }
      : {};

    let subCategoryArray = [];
    if (sub_category) {
      try {
        subCategoryArray = Array.isArray(sub_category)
          ? sub_category
          : JSON.parse(sub_category);
      } catch (err) {
        console.error("Invalid sub_category JSON:", err.message);
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.INVALID_SUB_CATEGORY_FORMAT,
        });
      }
    }

    const isValidTemplates = await Template.findOne({
      _id: { $in: subCategoryArray },
      categoryId: { $ne: category },
    });

    if (isValidTemplates) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.CATEGORY_MISMATCH,
      });
    }

    const business = await Business.create({
      businessName,
      businessDescription,
      businessCategory: category,
      businessImages,
      sub_category: subCategoryArray,
      address: { street: addressStreet, zipCode, city, state, country },
      location,
      createdBy: user._id,
    });

    res.status(API_RESPONSE_CODES.CREATED).json({
      success: true,
      message: MSG.BUSINESS_REGISTERED_SUCCESS,
      data: business,
    });

  } catch (err) {
    console.error("Create business error:", err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || MSG.SERVER_ERROR,
    });
  }
};

const getBusinesses = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '', category, sub_category, status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const match = {
      isDeleted: { $ne: true }
    };

    if (search) {
      match.businessName = { $regex: search, $options: 'i' };
    }

    if (category) {
      match.businessCategory = new mongoose.Types.ObjectId(category);
    }

    if (sub_category) {
      const subCategoryIds = sub_category.split(',').map(id => new mongoose.Types.ObjectId(id));
      match.sub_category = { $in: subCategoryIds };
    }

    if (status) {
      match.status = status;
    }

    const total = await Business.countDocuments(match);

    const businesses = await Business.aggregate([
      { $match: match },

      { $sort: { createdAt: -1 } },

      {
        $addFields: {
          noOfServices: { $size: { $ifNull: ['$sub_category', []] } }
        }
      },

      {
        $lookup: {
          from: 'categories',
          localField: 'businessCategory',
          foreignField: '_id',
          as: 'categoryData'
        }
      },

      { $unwind: { path: '$categoryData', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          businessName: 1,
          businessCategory: '$categoryData.name',
          city: '$address.city',
          noOfServices: 1,
          status: 1
        }
      },

      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      data: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        businesses
      }
    });

  } catch (err) {
    console.error('Get businesses error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      data: null
    });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business || business.isDeleted) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BUSINESS_NOT_FOUND,
      });
    }

    const {
      businessName,
      businessDescription,
      category,
      sub_category,
      addressStreet,
      zipCode,
      city,
      state,
      country,
      location,
      status,
    } = req.body;

    if (businessName) business.businessName = businessName;
    if (businessDescription) business.businessDescription = businessDescription;
    if (category) business.businessCategory = category;
    if (status) business.status = status;

    if (addressStreet || zipCode || city || state || country) {
      business.address = {
        street: addressStreet || business.address.street,
        zipCode: zipCode || business.address.zipCode,
        city: city || business.address.city,
        state: state || business.address.state,
        country: country || business.address.country,
      };
    }

    // Handle sub_category parsing
    if (sub_category) {
      try {
        const parsed = Array.isArray(sub_category) ? sub_category : JSON.parse(sub_category);
        const validIds = parsed.filter(id => mongoose.Types.ObjectId.isValid(id));

        // Validate if subcategories match the selected category
        const invalidTemplate = await Template.findOne({
          _id: { $in: validIds },
          categoryId: { $ne: category },
        });

        if (invalidTemplate) {
          return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
            success: false,
            message: MSG.CATEGORY_MISMATCH,
          });
        }

        business.sub_category = validIds;
      } catch (err) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.INVALID_SUB_CATEGORY_FORMAT,
        });
      }
    }

    // Handle location parsing
    if (location) {
      try {
        const parsedLoc = typeof location === 'string' ? JSON.parse(location) : location;
        business.location = parsedLoc;
      } catch {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.INVALID_LOCATION_FORMAT,
        });
      }
    }

    // Handle image update
    const businessImageFile = req.files?.find(f => f.fieldname === 'businessImages');
    if (businessImageFile) {
      if (business.businessImages?.imageUrl) {
        const oldPath = `uploads/images/${business.businessImages.imageUrl}`;
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      business.businessImages = { imageUrl: businessImageFile.filename };
    }

    await business.save();

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.BUSINESS_UPDATED_SUCCESS,
      data: business,
    });
  } catch (err) {
    console.error('Update Business Error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      error: err.message,
    });
  }
};

const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_ID,
        data: null
      });
    }

    const deletedBusiness = await Business.findByIdAndDelete(id);

    if (!deletedBusiness) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BUSINESS_NOT_FOUND,
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

const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_ID
      });
    }

    const allowedStatuses = Object.values(BUSINESSSTATUS);
    if (!allowedStatuses.includes(newStatus)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_STATUS
      });
    }

    const business = await Business.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true, select: 'status businessName' }
    );

    if (!business) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BUSINESS_NOT_FOUND
      });
    }

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.BUSINESS_STATUS_UPDATED,
      data: { status: business.status }
    });

  } catch (err) {
    console.error('Change status error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR
    });
  }
};

const getBusinessDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_ID,
        data: null,
      });
    }

    const businessInfo = await Business.findById(id)
      .populate("businessCategory", "name")
      .populate("sub_category", "templateName")
      .populate("createdBy", "firstName lastName email")
      .lean();

    if (!businessInfo) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BUSINESS_NOT_FOUND,
        data: null,
      });
    }

    const reviews = await Review.find({ businessId: id })
      .populate("userId", "firstName lastName email")
      .populate("taskId", "taskTitle")
      .lean();

    const formattedPortfolio = (businessInfo.portfolio || []).map((item) => ({
      ...item,
      projectImages: (item.projectImages || []).map((img) =>
        img ? `${IMAGE_PREFIX}${IMAGE_PATH.PORTFOLIO_IMAGES}${img}` : null
      ),
    }));

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      data: {
        businessInfo: {
          _id: businessInfo._id,
          businessName: businessInfo.businessName,
          businessDescription: businessInfo.businessDescription,
          businessCategory: businessInfo.businessCategory || null,
          address: businessInfo.address || {},
          location: businessInfo.location
            ? {
              lat: businessInfo.location.coordinates[1],
              lng: businessInfo.location.coordinates[0],
            }
            : null,
          businessImages:
            businessInfo.businessImages &&
              businessInfo.businessImages.imageUrl
              ? {
                ...businessInfo.businessImages,
                imageUrl: `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${businessInfo.businessImages.imageUrl}`,
              }
              : null,
          portfolio: formattedPortfolio,
          sub_category: businessInfo.sub_category || [],
          websiteLink: businessInfo.websitelink || null,
          averageRating: businessInfo.averageRating || 0,
          totalReviews: businessInfo.totalReviews || 0,
          createdBy: businessInfo.createdBy || null,
          status: businessInfo.status,
        },
        reviews: reviews.map((review) => ({
          _id: review._id,
          userId: review.userId || null,
          taskId: review.taskId || null,
          comments: review.comments || [],
          createdAt: review.createdAt,
        })),
      },
    });
  } catch (err) {
    console.error("Get business details error:", err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

const getBusinessBids = async (req, res) => {
  try {
    const { id } = req.params;
    let { search, page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_ID,
        data: null,
      });
    }

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const businessInfo = await Business.findById(id)
      .populate("createdBy", "_id")
      .lean();

    if (!businessInfo) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BUSINESS_NOT_FOUND,
        data: null,
      });
    }

    const bids = await Bid.find({ user: businessInfo.createdBy?._id })
      .populate({
        path: "task",
        select: "taskTitle description budget status category createdBy",
        populate: [
          { path: "category", select: "templateName" },
          { path: "createdBy", select: "firstName lastName email" },
        ],
      })
      .lean();

    let filteredBids = bids;
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      filteredBids = bids.filter(
        (bid) =>
          bid.task &&
          (searchRegex.test(bid.task.taskTitle) ||
            searchRegex.test(bid.task.description))
      );
    }

    const total = filteredBids.length;
    const paginatedBids = filteredBids.slice(skip, skip + limit);

    const formattedBids = paginatedBids.map((bid) => ({
      _id: bid._id,
      task: bid.task
        ? {
          _id: bid.task._id,
          taskTitle: bid.task.taskTitle,
          description: bid.task.description,
          budget: bid.task.budget,
          status:
            bid.task.status === "open" && bid.status === "accepted"
              ? "assigned"
              : bid.task.status,
          category: bid.task.category || null,
          createdBy: bid.task.createdBy
            ? {
              _id: bid.task.createdBy._id,
              firstName: bid.task.createdBy.firstName,
              lastName: bid.task.createdBy.lastName,
              email: bid.task.createdBy.email,
            }
            : null,
        }
        : null,
      offerAmount: bid.offerAmount,
      remarks: bid.remarks,
      status: bid.status || "pending",
      media: (bid.media || []).map(m => ({
        fileUrl: m.fileUrl?.startsWith("http")
          ? m.fileUrl
          : `${IMAGE_PREFIX}${IMAGE_PATH.BID_MEDIA}${m.fileUrl}`,
        fileName: m.fileName || null,
      })),
      createdAt: bid.createdAt,
    }));

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formattedBids,
    });
  } catch (err) {
    console.error("Get business bids error:", err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      data: null,
    });
  }
};

const getBusinessStatus = (req, res) => {
  try {
    const businessStatus = [
      { name: 'pending', label: 'Pending' },
      { name: 'verified', label: 'Verified' },
      { name: 'suspended', label: 'Suspended' }
    ];

    const userStatus = [
      { name: 'pending_email', label: 'Pending' },
      { name: 'verified', label: 'Verified' },
      { name: 'suspended', label: 'Suspended' }
    ];

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      data: {
        businessStatus,
        userStatus
      }
    });
  } catch (err) {
    console.error('Get business status filters error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      data: null
    });
  }
};

const getBusinessReviews = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.INVALID_ID });
    }

    const reviews = await Review.aggregate([
      {
        $match: {
          reviewedBusinessId: new mongoose.Types.ObjectId(id),
          isDeleted: false,
        },
      },

      // Lookup reviewer details
      {
        $lookup: {
          from: "users",
          localField: "reviewerId",
          foreignField: "_id",
          as: "reviewer",
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$reviewer", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "taskDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                taskTitle: 1,
                description: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$taskDetails", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          rating: 1,
          comments: 1,
          attachments: 1,
          createdAt: 1,
          reviewer: {
            _id: "$reviewer._id",
            name: {
              $concat: [
                { $ifNull: ["$reviewer.firstName", ""] },
                " ",
                { $ifNull: ["$reviewer.lastName", ""] },
              ],
            },
            email: "$reviewer.email",
          },
          taskDetails: 1
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const transformedReviews = reviews.map((review) => ({
      ...review,
      attachments: (review.attachments || []).map(attachment => ({
        fileUrl: attachment.fileUrl ? `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${attachment.fileUrl}` : null
      }))
    }));

    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, reviews: transformedReviews });
  } catch (error) {
    console.error("Get business reviews error:", error);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBusiness,
  getBusinesses,
  updateBusiness,
  deleteBusiness,
  changeStatus,
  getBusinessDetails,
  getBusinessStatus,
  getBusinessBids,
  getBusinessReviews
};
