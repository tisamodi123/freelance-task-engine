const Category = require('../models/Category');
const Template = require('../models/Template');
const { MSG, API_RESPONSE_CODES } = require('../constants/user_messages');
const { IMAGE_PREFIX, IMAGE_PATH } = require('../constants/constant');
const { STATUS } = require('../constants/constant');
const Business = require('../models/Business');
const { default: mongoose } = require('mongoose');

const getCategoriesWithTemplatesOld = async (req, res) => {
  try {
    const categories = await Category.find(
      { status: STATUS.VERIFIED, isDeleted: { $ne: true } },
      { name: 1, templateId: 1 }
    )
      .populate({
        path: 'templateId',
        match: { status: 'verified', isDeleted: { $ne: true } },
        select: 'templateName icon description budget duration posterImage'
      })
      .lean();



    const formatted = categories
      .filter(cat => Array.isArray(cat.templateId) ? cat.templateId.length > 0 : !!cat.templateId)
      .map(cat => ({
        _id: cat._id,
        categoryName: cat.name,
        templates: (Array.isArray(cat.templateId) ? cat.templateId : [cat.templateId])
          .map(tpl => ({
            ...tpl,
            icon: tpl.icon ? `${process.env.BASE_URL}/uploads/icons/${tpl.icon}` : null,
            posterImage: tpl.posterImage ? `${process.env.BASE_URL}/uploads/posters/${tpl.posterImage}` : null
          }))
      }));


    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TEMPLATES_FETCHED_SUCCESS,
      data: formatted
    });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_CATEGORY
    });
  }
};

const getCategoriesWithTemplates = async (req, res) => {
  try {
    const matchTemplates = {
      isDeleted: { $ne: true },
      status: STATUS.VERIFIED
    };
    const matchCategories = {
      isDeleted: { $ne: true },
      status: STATUS.VERIFIED
    };

    const categoriesWithTemplates = await Template.aggregate([
      { $match: matchTemplates },
      {
        $lookup: {
          from: "categories",
          let: { categoryId: "$categoryId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$categoryId"] } } },
            { $match: matchCategories }
          ],
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          description: { $first: "$category.description" },
          slug: { $first: "$category.slug" },
          templates: {
            $push: {
              _id: "$_id",
              templateName: "$templateName",
              icon: "$icon",
              description: "$description",
              budget: "$budget",
              duration: "$duration",
              status: "$status",
              createdAt: "$createdAt",
              icon: { $concat: [IMAGE_PREFIX, IMAGE_PATH.CATEGORY, '$icon'] },
              posterImage: { $concat: [IMAGE_PREFIX, IMAGE_PATH.CATEGORY, '$posterImage'] },
            }
          }
        }
      },
      { $sort: { categoryName: 1 } }
    ]);

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TEMPLATES_FETCHED_SUCCESS,
      data: categoriesWithTemplates
    });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_CATEGORY
    });
  }
};

const getCategoriesWithTemplatesWithBusinessOwn = async (req, res) => {
  try {
    

    const matchTemplates = {
      isDeleted: { $ne: true },
      status: STATUS.VERIFIED,
    };

    const matchCategories = {
      isDeleted: { $ne: true },
      status: STATUS.VERIFIED,
    };

    // ✅ 1) Find user's business sub_category (template ids)
    let businessTemplateIds = [];
    if (req?.user?.business) {
      const business = await Business.findById(req.user.business)
        .select("sub_category")
        .lean();

      if (business?.sub_category?.length) {
        // If they are already ObjectIds, this is optional.
        businessTemplateIds = business.sub_category.map((id) =>
          new mongoose.Types.ObjectId(id)
        );
      }
    }

    // ✅ 2) Aggregate templates grouped by category + flag matching
    const categoriesWithTemplates = await Template.aggregate([
      { $match: matchTemplates },

      {
        $lookup: {
          from: "categories",
          let: { categoryId: "$categoryId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$categoryId"] } } },
            { $match: matchCategories },
          ],
          as: "category",
        },
      },
      { $unwind: "$category" },

      // ✅ Template-level flag
      {
        $addFields: {
          user_provide_service: { $in: ["$_id", businessTemplateIds] },
        },
      },

      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          description: { $first: "$category.description" },
          slug: { $first: "$category.slug" },

          // ✅ category flag
          category_user_provide_service: {
            $max: { $cond: ["$user_provide_service", 1, 0] },
          },

          templates: {
            $push: {
              _id: "$_id",
              templateName: "$templateName",
              description: "$description",
              budget: "$budget",
              duration: "$duration",
              status: "$status",
              createdAt: "$createdAt",

              icon: { $concat: [IMAGE_PREFIX, IMAGE_PATH.CATEGORY, "$icon"] },
              posterImage: {
                $cond: [
                  { $ifNull: ["$posterImage", false] },
                  { $concat: [IMAGE_PREFIX, IMAGE_PATH.CATEGORY, "$posterImage"] },
                  null,
                ],
              },

              user_provide_service: "$user_provide_service",
            },
          },
        },
      },

      // ✅ category-level boolean final
      {
        $addFields: {
          user_provide_service: { $eq: ["$category_user_provide_service", 1] },
        },
      },

      { $project: { category_user_provide_service: 0 } },

      { $sort: { categoryName: 1 } },
    ]);

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TEMPLATES_FETCHED_SUCCESS,
      data: categoriesWithTemplates,
    });
  } catch (error) {
    console.error(error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_CATEGORY,
    });
  }
};

const getAllCategoryTemplates = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const match = {
      isDeleted: { $ne: true },
      status: STATUS.VERIFIED
    };
    if (search) match.templateName = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;

    const allCategories = (await Category.find({
      isDeleted: { $ne: true },
      status: STATUS.VERIFIED
    }, "_id name icon").sort({ name: 1 })).map(cat => ({
      ...cat.toObject(),
      icon: cat.icon ? `${IMAGE_PREFIX}${IMAGE_PATH.CATEGORY}${cat.icon}` : null
    }));

    const allTemplates = (await Template.find(match)
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
    ).map(temp => ({
      ...temp.toObject(),
      icon: temp.icon ? `${IMAGE_PREFIX}${IMAGE_PATH.CATEGORY}${temp.icon}` : null
    }));

    const categoriesWithTemplates = await Template.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          description: { $first: "$category.description" },
          slug: { $first: "$category.slug" },
          templates: {
            $push: {
              _id: "$_id",
              templateName: "$templateName",
              icon: {
                $cond: [
                  { $ifNull: ["$icon", false] },
                  { $concat: [IMAGE_PREFIX, IMAGE_PATH.CATEGORY, "$icon"] },
                  null
                ]
              },
              description: "$description",
              budget: "$budget",
              duration: "$duration",
              status: "$status",
              createdAt: "$createdAt",
            },
          },
        },
      },
      { $sort: { categoryName: 1 } },
    ]);

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TEMPLATES_FETCHED_SUCCESS,
      data: {
        categories: allCategories,
        templates: allTemplates,
        category_with_templates: categoriesWithTemplates,
      },
    });
  } catch (err) {
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR_CATEGORY
    });
  }
};

module.exports = { getCategoriesWithTemplates, getAllCategoryTemplates,getCategoriesWithTemplatesWithBusinessOwn };