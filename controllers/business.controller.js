const mongoose = require('mongoose')
const Business = require("../models/Business");
const Template = require("../models/Template")
const User = require("../models/User")
const Task = require("../models/Task")
const Bid = require("../models/Bid")
const { generateBusinessToken } = require('../utils/jwtToken')
const { STATUS, BUSINESSSTATUS, IMAGE_PREFIX, IMAGE_PATH, TASKSTATUS } = require("../constants/constant");
const { API_RESPONSE_CODES, MSG } = require("../constants/user_messages");
const { optional } = require('joi');

// const getBusinesses = async (req, res) => {
//   try {
//     let { city, service ,search, category, sub_category, page = 1, limit = 10 } = req.query;
//     console.log("query",req.query)

//     page = parseInt(page);
//     limit = parseInt(limit);

    

//     const matchStage = { isDeleted: false, status: BUSINESSSTATUS.VERIFIED };

//     if (search) {
//       matchStage.$or = [
//         { businessName: { $regex: search, $options: "i" } },
//         { businessDescription: { $regex: search, $options: "i" } },
//       ];
//     }
//     // Category ID filter
//     if (category) matchStage.businessCategory = new mongoose.Types.ObjectId(category);

//     if (sub_category) {
//       const subCatIds = Array.isArray(sub_category)
//         ? sub_category.map((id) => new mongoose.Types.ObjectId(id))
//         : [new mongoose.Types.ObjectId(sub_category)];
//       matchStage.sub_category = { $in: subCatIds };
//     }

//     // City filter (already good)
//     if (city) {
//       matchStage["address.city"] = { $regex: city.trim(), $options: "i" };
//     }

    

//     const businesses = await Business.aggregate([
//       { $match: matchStage },

//       // Lookup business category
//       {
//         $lookup: {
//           from: "categories",
//           localField: "businessCategory",
//           foreignField: "_id",
//           as: "businessCategory",
//         },
//       },
//       { $unwind: { path: "$businessCategory", preserveNullAndEmptyArrays: true } },

//       // Lookup subcategories
//       {
//         $lookup: {
//           from: "templates",
//           localField: "sub_category",
//           foreignField: "_id",
//           as: "sub_category",
//         },
//       },
//       // NEW: Service filter (category name OR subcategory name)
//       ...(service?.trim()
//         ? [
//             {
//               $match: {
//                 $or: [
//                   {
//                     "businessCategory.name": {
//                       $regex: service.trim(),
//                       $options: "i",
//                     },
//                   },
//                   {
//                     "sub_category.templateName": {
//                       $regex: service.trim(),
//                       $options: "i",
//                     },
//                   },
//                 ],
//               },
//             },
//           ]
//         : []),

//       {
//         $lookup: {
//           from: "tasks",
//           let: { businessUserId: "$user" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$status", "completed"] },
//               },
//             },
//             {
//               $lookup: {
//                 from: "bids",
//                 localField: "acceptedBid",
//                 foreignField: "_id",
//                 as: "acceptedBidData",
//               },
//             },
//             { $unwind: { path: "$acceptedBidData", preserveNullAndEmptyArrays: true } },
//             {
//               $match: {
//                 $expr: { $eq: ["$acceptedBidData.user", "$$businessUserId"] },
//               },
//             },
//           ],
//           as: "completedTasks",
//         },
//       },
//       {
//         $addFields: {
//           totalJobs: { $size: "$completedTasks" },
//           totalEarnings: {
//             $sum: "$completedTasks.acceptedBidData.offerAmount",
//           },
//         },
//       },

//       // Lookup reviews using correct field: reviewedBusinessId
//       {
//         $lookup: {
//           from: "reviews",
//           localField: "_id",
//           foreignField: "reviewedBusinessId",
//           as: "reviews",
//           pipeline: [
//             {
//               $project: {
//                 _id: 1,
//                 rating: 1,
//                 comments: 1,
//                 attachments: 1,
//                 reviewerId: 1,
//                 createdAt: 1,
//               },
//             },
//           ],
//         },
//       },

//       // Add totalReviews and averageRating
//       {
//         $addFields: {
//           totalReviews: { $size: "$reviews" },
//           averageRating: {
//             $cond: [
//               { $gt: [{ $size: "$reviews" }, 0] },
//               { $round: [{ $avg: "$reviews.rating" }, 1] },
//               0,
//             ],
//           },
//         },
//       },

//       // Project only required fields
//       // {
//       //   $lookup: {
//       //     from: "reviews",
//       //     localField: "_id",
//       //     foreignField: "businessId",
//       //     as: "reviews",
//       //     pipeline: [
//       //       {
//       //         $project: {
//       //           _id: 1,
//       //           rating: 1,
//       //           comments: 1,
//       //           attachments: 1,
//       //           userId: 1,
//       //           createdAt: 1,
//       //         },
//       //       },
//       //     ],
//       //   },
//       // },
//       // {
//       //   $addFields: {
//       //     totalReviews: { $size: "$reviews" },
//       //     averageRating: {
//       //       $cond: [
//       //         { $gt: [{ $size: "$reviews" }, 0] },
//       //         { $round: [{ $avg: "$reviews.rating" }, 1] },
//       //         0,
//       //       ],
//       //     },
//       //   },
//       // },

//       {
//         $project: {
//           businessName: 1,
//           businessDescription: 1,
//           businessCategory: {
//             _id: "$businessCategory._id",
//             name: "$businessCategory.name",
//           },
//           sub_category: {
//             $map: {
//               input: "$sub_category",
//               as: "s",
//               in: { _id: "$$s._id", name: "$$s.templateName" },
//             },
//           },
//           businessImages: 1,
//           averageRating: 1,
//           totalReviews: 1,
//           status: 1,
//           address: 1,
//           totalJobs: 1,
//           totalEarnings: 1,
//           createdAt: 1
//         },
//       },

//       {
//         $sort: { createdAt: -1 }
//       },

//       { $skip: (page - 1) * limit },
//       { $limit: limit },
//     ]);

//     businesses.forEach((b) => { 
//       b.businessImages = b.businessImages || {};
//       b.businessImages.imageUrl = b.businessImages.imageUrl
//         ? `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${b.businessImages.imageUrl}`
//         : null;
//     });

//     const totalDoc = await Business.countDocuments(matchStage);

//     res.status(API_RESPONSE_CODES.SUCCESS).json({
//       success: true,
//       totalDoc,
//       page,
//       limit,
//       totalPages: Math.ceil(totalDoc / limit),
//       businesses,
//     });
//   } catch (error) {
//     console.error("Get businesses error:", error);
//     res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
//   }
// };


const getBusinesses = async (req, res) => {
  try {
    let { city, service, search, category, sub_category, page = 1, limit = 10 } = req.query;
    // console.log("query", req.query);

    page = parseInt(page);
    limit = parseInt(limit);

    const matchStage = { isDeleted: false, status: BUSINESSSTATUS.VERIFIED };

    if (search) {
      matchStage.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { businessDescription: { $regex: search, $options: "i" } },
      ];
    }

    if (category) matchStage.businessCategory = new mongoose.Types.ObjectId(category);

    if (sub_category) {
      const subCatIds = Array.isArray(sub_category)
        ? sub_category.map((id) => new mongoose.Types.ObjectId(id))
        : [new mongoose.Types.ObjectId(sub_category)];
      matchStage.sub_category = { $in: subCatIds };
    }

    if (city) {
      matchStage["address.city"] = { $regex: city.trim(), $options: "i" };
    }

    // === PIPELINE UP TO ALL FILTERS ===
    const filterPipeline = [
      { $match: matchStage },

      // Lookup business category
      {
        $lookup: {
          from: "categories",
          localField: "businessCategory",
          foreignField: "_id",
          as: "businessCategory",
        },
      },
      { $unwind: { path: "$businessCategory", preserveNullAndEmptyArrays: true } },

      // Lookup subcategories
      {
        $lookup: {
          from: "templates",
          localField: "sub_category",
          foreignField: "_id",
          as: "sub_category",
        },
      },

      // === FIX 1: Added this line – unwind prevents $map crash ===
      { $unwind: { path: "$sub_category", preserveNullAndEmptyArrays: true } },

      // Service filter (category name OR subcategory name)
      ...(service?.trim()
        ? [
            {
              $match: {
                $or: [
                  {
                    "businessCategory.name": {
                      $regex: service.trim(),
                      $options: "i",
                    },
                  },
                  {
                    "sub_category.templateName": {
                      $regex: service.trim(),
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),
    ];

    // === FIX 2: Calculate totalDoc AFTER all filters (correct count) ===
    const totalResult = await Business.aggregate([
      ...filterPipeline,
      { $count: "total" },
    ]);
    const totalDoc = totalResult[0]?.total || 0;

    // === Full pipeline with pagination ===
    const businesses = await Business.aggregate([
      ...filterPipeline,

      {
        $lookup: {
          from: "tasks",
          let: { businessUserId: "$user" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$status", "completed"] },
              },
            },
            {
              $lookup: {
                from: "bids",
                localField: "acceptedBid",
                foreignField: "_id",
                as: "acceptedBidData",
              },
            },
            { $unwind: { path: "$acceptedBidData", preserveNullAndEmptyArrays: true } },
            {
              $match: {
                $expr: { $eq: ["$acceptedBidData.user", "$$businessUserId"] },
              },
            },
          ],
          as: "completedTasks",
        },
      },
      {
        $addFields: {
          totalJobs: { $size: "$completedTasks" },
          totalEarnings: {
            $sum: "$completedTasks.acceptedBidData.offerAmount",
          },
        },
      },

      // Reviews (only correct one)
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "reviewedBusinessId",
          as: "reviews",
          pipeline: [
            {
              $project: {
                _id: 1,
                rating: 1,
                comments: 1,
                attachments: 1,
                reviewerId: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },

      {
        $addFields: {
          totalReviews: { $size: "$reviews" },
          averageRating: {
            $cond: [
              { $gt: [{ $size: "$reviews" }, 0] },
              { $round: [{ $avg: "$reviews.rating" }, 1] },
              0,
            ],
          },
        },
      },

      {
        $project: {
          businessName: 1,
          businessDescription: 1,
          businessCategory: {
            _id: "$businessCategory._id",
            name: "$businessCategory.name",
          },
          sub_category: {
            // FIX 3: Changed from $map to $cond (safe after unwind)
            $cond: {
              if: { $eq: ["$sub_category", null] },
              then: [],
              else: [{ _id: "$sub_category._id", name: "$sub_category.templateName" }],
            },
          },
          businessImages: 1,
          averageRating: 1,
          totalReviews: 1,
          status: 1,
          address: 1,
          totalJobs: 1,
          totalEarnings: 1,
          createdAt: 1,
        },
      },

      {
        $sort: { createdAt: -1 },
      },

      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    businesses.forEach((b) => {
      b.businessImages = b.businessImages || {};
      b.businessImages.imageUrl = b.businessImages.imageUrl
        ? `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${b.businessImages.imageUrl}`
        : null;
    });

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      totalDoc,
      page,
      limit,
      totalPages: Math.ceil(totalDoc / limit),
      businesses,
    });
  } catch (error) {
    // console.error("Get businesses error:", error);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};
const getBusinessDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.INVALID_BUSINESS_ID });
    }

    const loggedInUserId = req.user?._id;

    const business = await Business.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: false,
          status: BUSINESSSTATUS.VERIFIED
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "businessCategory",
          foreignField: "_id",
          as: "businessCategory",
        },
      },
      { $unwind: { path: "$businessCategory", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "templates",
          localField: "sub_category",
          foreignField: "_id",
          as: "sub_category",
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },

      // Lookup portfolios
      {
        $lookup: {
          from: "portfolios",
          localField: "_id",
          foreignField: "businessId",
          as: "portfolioLookup",
        },
      },

      // Lookup completed tasks with accepted bids belonging to this business
      {
        $lookup: {
          from: "tasks",
          let: { businessUserId: "$user" },
          pipeline: [
            { $match: { $expr: { $eq: ["$status", "completed"] } } },
            {
              $lookup: {
                from: "bids",
                localField: "acceptedBid",
                foreignField: "_id",
                as: "acceptedBidData",
              },
            },
            { $unwind: { path: "$acceptedBidData", preserveNullAndEmptyArrays: true } },
            {
              $match: {
                $expr: { $eq: ["$acceptedBidData.user", "$$businessUserId"] },
              },
            },
            {
              $project: {
                _id: 1,
                taskTitle: 1,
                acceptedBidData: 1,
              },
            },
          ],
          as: "completedTasks",
        },
      },

      // Lookup reviews
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "reviewedBusinessId",
          as: "reviews",
          pipeline: [
            { $match: { isDeleted: false } },
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
                      profileImage: 1
                    }
                  }
                ]
              }
            },
            { $unwind: { path: "$reviewer", preserveNullAndEmptyArrays: true } },
            {
              $project: {
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
                      { $ifNull: ["$reviewer.lastName", ""] }
                    ]
                  },
                  profileImage: "$reviewer.profileImage"
                }
              }
            }
          ]
        }
      },

      {
        $addFields: {
          totalJobs: { $size: "$completedTasks" },
          totalEarnings: { $sum: "$completedTasks.acceptedBidData.offerAmount" },
          totalReviews: { $size: "$reviews" },
          averageRating: {
            $cond: [
              { $gt: [{ $size: "$reviews" }, 0] },
              { $round: [{ $avg: "$reviews.rating" }, 1] },
              0,
            ],
          },
          portfolio: {
            $cond: {
              if: { $gt: [{ $size: "$portfolio" }, 0] },
              then: "$portfolio",
              else: "$portfolioLookup",
            },
          },
        },
      },

      {
        $project: {
          businessName: 1,
          businessDescription: 1,
          businessCategory: {
            _id: "$businessCategory._id",
            name: "$businessCategory.name",
          },
          sub_category: {
            $map: {
              input: "$sub_category",
              as: "s",
              in: { _id: "$$s._id", name: "$$s.templateName" },
            },
          },
          businessImages: 1,
          averageRating: 1,
          totalReviews: 1,
          status: 1,
          address: 1,
          location: 1,
          tags: 1,
          websitelink: 1,
          phoneNo: 1,
          totalJobs: 1,
          totalEarnings: 1,
          reviews: 1,
          createdBy: {
            _id: "$createdBy._id",
            name: {
              $concat: [
                { $ifNull: ["$createdBy.firstName", ""] },
                " ",
                { $ifNull: ["$createdBy.lastName", ""] },
              ],
            },
          },

          portfolio: {
            $map: {
              input: "$portfolio",
              as: "p",
              in: {
                _id: "$$p._id",
                title: "$$p.projectTitle",
                description: "$$p.projectDescription",
                images: "$$p.projectImages",
              },
            },
          },
        },
      },
    ]);

    if (!business.length) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.BUSINESS_NOT_FOUND });
    }

    let isOwner = false;
    if (
      loggedInUserId &&
      business[0].createdBy &&
      business[0].createdBy._id &&
      business[0].createdBy._id.toString() === loggedInUserId.toString()
    ) {
      isOwner = true;
    }

    const data = business[0];

    // Business image URL
    data.businessImages = data.businessImages || {};
    data.businessImages.imageUrl = data.businessImages.imageUrl
      ? `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${data.businessImages.imageUrl}`
      : null;

    // Portfolio images URL
    if (data.portfolio?.length) {
      data.portfolio = data.portfolio.map((p) => ({
        ...p,
        images: (p.images || []).map(
          (img) => `${IMAGE_PREFIX}${IMAGE_PATH.PORTFOLIO_IMAGES}${img}`
        ),
      }));
    }

    if (data.reviews?.length) {
      data.reviews = data.reviews.map((r) => ({
        ...r,
        attachments: (r.attachments || []).map(a =>
          a.fileUrl ? `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${a.fileUrl}` : null
        )
      }));
    }

    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, business: data, isOwner });
  } catch (error) {
    // console.error("Get business detail error:", error);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

const registerBusiness = async (req, res) => {
  try {
    const {
      businessName,
      category,
      addressStreet,
      zipCode,
      city,
      state,
      country,
      aboutBusiness,
      portfolio,
      sub_category,
      websitelink,
      location,
      emailToken
    } = req.body;

    if (!req.user && !emailToken) {
      return res.status(400).json({
        success: false,
        message: MSG.UNAUTHORIZED_ACCESS
      });
    }

    const hasAddress = addressStreet || city || state || country || zipCode;
    if (hasAddress && (!location || !Array.isArray(location.coordinates))) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.LOCATION_PROVIDED
      });
    }

    // Option 1: single object (your current schema)
    // Only one business image expected
    const businessImageFile = req.files?.find(f => f.fieldname === 'businessImages');

    const businessImages = businessImageFile
      ? {
        imageUrl: businessImageFile.filename,
      }
      : {};

    // Option 2: array of images (RECOMMENDED for multiple uploads)
    // const businessImages =
    //   businessImagesFiles?.map((file) => ({
    //     imageUrl: file.path, // or `/uploads/images/${file.filename}`
    //     imageName: file.originalname,
    //   })) || [];

    let subCategoryArray = [];
    if (sub_category) {
      try {
        subCategoryArray = Array.isArray(sub_category)
          ? sub_category
          : JSON.parse(sub_category);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: MSG.INVALID_SUB_CATEGORY_FORMAT
        });
      }
    }

    const isValidTemplates = await Template.findOne({
      _id: { $in: subCategoryArray },
      categoryId: { $ne: category }
    });
    if (isValidTemplates) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.CATEGORY_MISMATCH
      });
    }

    let portfolioArray = [];
    try {
      portfolioArray = JSON.parse(portfolio || '[]');
    } catch (err) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_PORTFOLIO
      });
    }

    const portfolioArrayWithImages = portfolioArray.map((item, index) => {
      const files = req.files.filter(f => f.fieldname === `projectImages_${index}`);

      return {
        ...item,
        projectImages: files.map(f => f.filename)
      };
    });

    let userId = false;
    let user = false;

    if (emailToken && emailToken != null && emailToken != 'null' && !req.user) {
      user = await User.findOne({
        emailVerificationToken: emailToken
      });
      userId = user?._id ?? false;
    } else {

      userId = req.user._id;

      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.USER_NOT_FOUND
      });
    }
    if (user.accountStatus === STATUS.SUSPENDED) {
      return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({
        success: false,
        message: MSG.USER_SUSPENDED
      });
    }

    const business_profile = await Business.findOne({
      user: user._id,
      isDeleted: { $ne: true }
    });

    if (business_profile) {
      if (business_profile.status === BUSINESSSTATUS.PENDING) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.BUSINESS_UNDER_VERIFICATION
        });
      }
      if (business_profile.status === BUSINESSSTATUS.SUSPENDED) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.BUSINESS_SUSPENDED
        });
      }
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.BUSINESS_ALREADY_EXISTS
      });
    }

    let business = new Business({
      businessName,
      businessCategory: category,
      businessDescription: aboutBusiness,
      address: { street: addressStreet, zipCode, city, state, country: country },
      location,
      sub_category: subCategoryArray,
      websitelink,
      createdBy: user._id,
      portfolio: portfolioArrayWithImages,
      businessImages,
      user: user._id,
    });

    await business.save();

    user.business = business._id;
    user.isBusiness = true;
    user.businessRegistered = true;
    await user.save();

    const businessToken = generateBusinessToken(business);

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.BUSINESS_REGISTERED_SUCCESS,
      businessToken
    });

  } catch (error) {
    // console.error('Register business error:', error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_BUSINESS,
      error: error.message
    });
  }
}

const updateBusiness = async (req, res) => {
  try {
    const {
      businessName,
      category,
      addressStreet,
      zipCode,
      city,
      state,
      country,
      aboutBusiness,
      portfolio,
      sub_category,
      websitelink,
      location,
    } = req.body;

    const businessId = req.params.id

    const business = await Business.findById(businessId)

    if (!business || business.isDeleted) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.BUSINESS_NOT_FOUND })
    }

    if (business.user.toString() !== req.user._id.toString()) {
      return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({ success: false, message: MSG.UNAUTHORIZED_ACCESS })
    }

    if (business.status === BUSINESSSTATUS.SUSPENDED) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.BUSINESS_SUSPENDED })
    }

    const businessImageFile = req.files?.find(f => f.fieldname === 'businessImages')
    if (businessImageFile) {
      business.businessImages = {
        imageUrl: businessImageFile.filename
      }
    }

    let subCategoryArray = business.sub_category || [];
    if (sub_category) {
      try {
        subCategoryArray = Array.isArray(sub_category)
          ? sub_category
          : JSON.parse(sub_category);
      } catch (err) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.INVALID_SUB_CATEGORY_FORMAT,
        });
      }

      const invalidTemplate = await Template.findOne({
        _id: { $in: subCategoryArray },
        categoryId: { $ne: category },
      });

      if (invalidTemplate) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.CATEGORY_MISMATCH,
        });
      }
    }

    let portfolioArray = [];
    if (portfolio) {
      try {
        portfolioArray = JSON.parse(portfolio);
      } catch (err) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.INVALID_PORTFOLIO,
        });
      }

      const portfolioArrayWithImages = portfolioArray.map((item, index) => {
        const files = req.files.filter(f => f.fieldname === `projectImages_${index}`);
        return {
          ...item,
          projectImages: files.map(f => f.filename),
        };
      });

      business.portfolio = portfolioArrayWithImages;
    }

    if (businessName) business.businessName = businessName;
    if (category) business.businessCategory = category;
    if (aboutBusiness) business.businessDescription = aboutBusiness;
    if (websitelink) business.websitelink = websitelink;

    // Update location safely
    if (location) {
      let loc = location;

      // Parse string if needed (common in multipart/form-data)
      if (typeof loc === "string") {
        try {
          loc = JSON.parse(loc);
        } catch (err) {
          return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
            success: false,
            message: MSG.INVALID_LOCATION_FORMAT,
          });
        }
      }

      // Validate coordinates
      if (!Array.isArray(loc.coordinates)) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.COORDINATES_MUST_BE_AN_ARRAY,
        });
      }

      loc.coordinates = loc.coordinates.map(Number);

      business.location = {
        type: loc.type || "Point",
        coordinates: loc.coordinates
      };
    }

    if (addressStreet || zipCode || city || state || country) {
      business.address = {
        street: addressStreet || business.address.street,
        zipCode: zipCode || business.address.zipCode,
        city: city || business.address.city,
        state: state || business.address.state,
        country: country || business.address.country,
      };
    }

    if (subCategoryArray.length > 0) {
      business.sub_category = subCategoryArray;
    }

    await business.save()

    return res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.BUSINESS_UPDATED })

  } catch (error) {
    // console.error("Update business error:", error)
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: error.message })
  }
}

const deleteBusiness = async (req, res) => {
  try {
    const businessId = req.params.id;

    const business = await Business.findById(businessId);
    if (!business || business.isDeleted) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.BUSINESS_NOT_FOUND,
      });
    }

    if (business.user.toString() !== req.user._id.toString()) {
      return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({
        success: false,
        message: MSG.UNAUTHORIZED_ACCESS,
      });
    }

    if (business.status === BUSINESSSTATUS.SUSPENDED) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.BUSINESS_SUSPENDED,
      });
    }

    const user = await User.findById(business.user);
    if (!user) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.USER_NOT_FOUND,
      });
    }

    const userBids = await Bid.find({ user: user._id });
    const affectedTaskIds = [...new Set(userBids.map(bid => bid.task.toString()))];

    await Bid.deleteMany({ user: user._id });

    for (const taskId of affectedTaskIds) {
      const activeBids = await Bid.find({ task: taskId }).lean();
      const totalBids = activeBids.length;

      let bidsRange = null;
      if (totalBids > 0) {
        const amounts = activeBids.map(b => b.offerAmount);
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        bidsRange = min === max ? `$${min}` : `$${min} - $${max}`;
      }

      await Task.findByIdAndUpdate(taskId, {
        $set: {
          all_bids: activeBids,
          totalBids,
          bidsRange,
          status: TASKSTATUS.OPEN,
        },
        $unset: {
          accepted_bid: 1,
        },
      });
    }

    await Task.deleteMany({ createdBy: user._id });

    user.business = undefined;
    user.isBusiness = false;
    user.businessRegistered = false;
    await user.save();

    await Business.findByIdAndDelete(businessId);

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.DELETED_SUCCESS,
    });

  } catch (error) {
    // console.error("Delete business error:", error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_BUSINESS,
      error: error.message,
    });
  }
};

const getBusinessListFromCityService = async (req, res) => {
  try {
    let { city, service } = req.body
    let { page = 1, limit = 10 } = req.body
    page = parseInt(page)
    limit = parseInt(limit)
    const pipelines = []

    city = typeof city === "string" ? city.trim() : "";
    service = typeof service === "string" ? service.trim() : "";
    // check for active and verified 
    // pipelines.push({
    //   $match: {
    //     isDeleted: false,
    //     verified: true
    //   }
    // })

    //ckeh if city is there 
    // id city true==========> push condition

    // if (city !== "" && service !== "") {
    //   pipelines.push({
    //     $lookup: {
    //       from: "categories",
    //       localField: "businessCategory",
    //       foreignField: "_id",
    //       as: "businessCategory"
    //     },
    //   })

    //   pipelines.push({
    //     $unwind: "$businessCategory"
    //   });

    //   pipelines.push({
    //     $match: {
    //       $and: [{
    //         "address.city": {
    //           $regex: city,
    //           $options: "i"
    //         }
    //       }, {
    //         "businessCategory.name": {
    //           $regex: service,
    //           $options: "i"
    //         }
    //       }
    //       ]
    //     }
    //   })
    // } else {

    if (city) {
      // console.log("city is here",city)
      pipelines.push({
        $match: {
          "address.city": {
            $regex: city,
            $options: "i"
          }
        }
      })
    }
    pipelines.push({
      $lookup: {
        from: "categories",
        localField: "businessCategory",
        foreignField: "_id",
        as: "businessCategory"
      },
    })
    pipelines.push({
      $unwind: "$businessCategory"
    });

    //ckeh if service is there 
    // lookup first to get full object 
    // id service true ==========> push condition
    if (service) {
      // console.log("service is here",service)
      pipelines.push({
        $lookup: {
          from: "categories",
          localField: "businessCategory",
          foreignField: "_id",
          as: "businessCategory"
        },
      })
      pipelines.push({
        $unwind: "$businessCategory",
      });
      pipelines.push({
        $match: {
          "businessCategory.name": {
            $regex: service,
            $options: "i"
          }
        }
      })
    }

    //   if (service.length > 0) {
    //   // escape regex special chars to avoid false matches
    //   const safeService = service.replace(
    //     /[.*+?^${}()|[\]\\]/g,
    //     "\\$&"
    //   );

    //   pipelines.push({
    //     $match: {
    //       "businessCategory.name": {
    //         $regex: safeService,
    //         $options: "i",
    //       },
    //     },
    //   });
    // }
    // }

    // const slugTokens = serviceSlug.split("-");

    // pipelines.push({
    //   $match: {
    //     $and: slugTokens.map(token => ({
    //       "businessCategory.slug": {
    //         $regex: `(^|-)${token}(-|$)`,
    //       },
    //     })),
    //   },
    // });

    // if category ====> subcategory
    pipelines.push({
      $lookup: {
        from: "templates",
        localField: "sub_category",
        foreignField: "_id",
        as: "sub_category"
      }
    })

    // get Reviews of business 
    pipelines.push({
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "reviewedBusinessId",
        as: "reviews",
        pipeline: [
          {
            $project: {
              _id: 1,
              rating: 1,
              comments: 1,
              attachments: 1,
              reviewerId: 1,
              createdAt: 1,
            },
          },
        ],
      },
    });

    //adding extra fields 
    //for total reviews and rating
    pipelines.push({
      $addFields: {
        totalReviews: { $size: "$reviews" },
        averageRating: {
          $cond: [
            { $gt: [{ $size: "$reviews" }, 0] },
            { $round: [{ $avg: "$reviews.rating" }, 1] },
            0,
          ],
        },
      },
    });


    pipelines.push({
      $project: {
        businessName: 1,
        businessDescription: 1,
        businessCategory: { _id: "$businessCategory._id", name: "$businessCategory.name" },
        sub_category: {
          $map: {
            input: "$sub_category",
            as: "s",
            in: { _id: "$$s._id", name: "$$s.templateName" },
          },
        },
        businessImages: 1,
        averageRating: 1,
        totalReviews: 1,
        status: 1,
        address: 1,
        createdAt: 1,
      },
    });

    // const totalPipelines = pipelines.length

    // pipelines.push({
    //   $sort: { createdAt: -1 },
    // })
    // pipelines.push({
    //   $skip: (page - 1) * limit,
    // })
    // pipelines.push({
    //   $limit: limit,
    // })

    const businesses = await Business.aggregate(pipelines)

    businesses.forEach((b) => {
      b.businessImages = b.businessImages || {};
      b.businessImages.imageUrl = b.businessImages.imageUrl
        ? `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${b.businessImages.imageUrl}`
        : null;
    });

    return res.status(200).json({
      success: true,
      totalDoc: businesses.length,
      businesses: businesses
    });

  } catch (error) {
    // console.error("Get business list error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


module.exports = {
  getBusinesses,
  getBusinessDetail,
  updateBusiness,
  deleteBusiness,
  registerBusiness,
  getBusinessListFromCityService
}