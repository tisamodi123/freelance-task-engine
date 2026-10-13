const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Template = require("../../models/Template");
const Category = require("../../models/Category");
const Business = require("../../models/Business");
const Task = require("../../models/Task");
const { API_RESPONSE_CODES, MSG } = require("../../constants/admin_messages");
const Constant = require("../../constants/constant");

const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

const createTemplate = async (req, res) => {
  try {
    const { templateName, description, budget, duration, categoryId } = req.body;
    const iconFile = req.files?.find(f => f.fieldname === "icon");
    const posterFile = req.files?.find(f => f.fieldname === "posterImage");

    if (!iconFile) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.TEMPLATE_ICON_REQUIRED });
    }

    const iconPath = `${iconFile.filename}`;
    const posterPath = posterFile ? `${posterFile.filename}` : null;

    const category = await Category.findById(categoryId);
    if (!category || category?.isDeleted === true) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.CATEGORY_NOT_FOUND });
    }

    const existingTemplate = await Template.findOne({ templateName: templateName.trim(), categoryId, isDeleted: { $ne: true } });
    if (existingTemplate) {
      return res.status(API_RESPONSE_CODES.CONFLICT).json({ success: false, message: MSG.TEMPLATE_ALREADY_EXISTS_IN_CATEGORY });
    }

    const template = await Template.create({
      templateName,
      description,
      budget,
      duration,
      icon: iconPath,
      posterImage: posterPath,
      categoryId,
      createdBy: req.user?.id || null
    });

    category.templateId.push(template._id);
    await category.save();

    return res.status(API_RESPONSE_CODES.CREATED).json({
      success: true,
      message: MSG.TEMPLATE_CREATED_SUCCESS,
    });
  } catch (err) {

    const message = err.name === "ValidationError" ? Object.values(err.errors)[0].message : MSG.SERVER_ERROR;
    return res.status(err.name === "ValidationError" ? API_RESPONSE_CODES.BAD_REQUEST : API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message,
      error: err.message
    });
  }
};

const getTemplates = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const match = { isDeleted: { $ne: true } };

    if (search) {
      match.$or = [
        { templateName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status && [Constant.STATUS.SUSPENDED, Constant.STATUS.VERIFIED].includes(status)) {
      match.status = status;
    }

    const skip = (page - 1) * limit;

    const data = await Template.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },

      {
        $lookup: {
          from: "tasks",
          let: { templateId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$category", "$$templateId"] } } },
            { $count: "count" }
          ],
          as: "taskInfo",
        },
      },

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
        $addFields: {
          iconPath: { $concat: [Constant.IMAGE_PREFIX, Constant.IMAGE_PATH.TEMPLATES, "$icon"] },
          posterPath: { $concat: [Constant.IMAGE_PREFIX, Constant.IMAGE_PATH.TEMPLATES, "$posterImage"] },
          taskCount: { $ifNull: [{ $arrayElemAt: ["$taskInfo.count", 0] }, 0] },
        },
      },

      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          templates: {
            $push: {
              _id: "$_id",
              templateName: "$templateName",
              icon: "$iconPath",
              posterImage: "$posterPath",
              description: "$description",
              budget: "$budget",
              duration: "$duration",
              status: "$status",
              taskCount: "$taskCount",
              createdAt: "$createdAt",
            },
          },
          latestCreatedAt: { $max: "$createdAt" },
        },
      },
      {
        $addFields: {
          templates: {
            $sortArray: { input: "$templates", sortBy: { createdAt: -1 } }
          }
        }
      },
      { $sort: { latestCreatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const total = await Template.countDocuments(match);

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TEMPLATES_FETCHED_SUCCESS,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    });
  } catch (err) {
    console.error("Get templates error:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

const getTemplateDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_ID,
      });
    }

    // Find the template
    const template = await Template.findById(id)
      .populate("categoryId", "name")
      .select("templateName")
      .lean();

    if (!template) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.TEMPLATE_NOT_FOUND,
      });
    }

    const tasks = await Task.find({ category: id })
      .populate("category", "templateName")
      .populate("createdBy", "firstName lastName email")
      .select("taskTitle description category status budget createdAt address city state country")
      .lean();

    const businesses = await Business.find({ sub_category: id })
      .populate("businessCategory", "name")
      .select("businessName businessCategory status")
      .lean();

    const totalTasks = tasks.length;

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      data: {
        template,
        totalTasks,
        tasks,
        businesses,
      },
    });
  } catch (err) {
    console.error("Get template details error:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      error: err.message,
    });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await Template.findById(id);
    if (!template) {
      return res
        .status(API_RESPONSE_CODES.NOT_FOUND)
        .json({ success: false, message: MSG.TEMPLATE_NOT_FOUND });
    }

    const updateData = {};
    for (let key in req.body) {
      if (req.body[key] !== '' && req.body[key] !== undefined && req.body[key] !== null) {
        updateData[key] = req.body[key];
      }
    }

    const iconFile = req.files?.find(f => f.fieldname === 'icon');
    if (iconFile) {
      const iconPath = `${iconFile.filename}`;
      if (template.icon) {
        deleteFile(path.join(__dirname, "../../", "uploads/icons", template.icon));
      }
      updateData.icon = iconPath;
    }

    const posterFile = req.files?.find(f => f.fieldname === 'posterImage');
    if (posterFile) {
      const posterPath = `${posterFile.filename}`;
      if (template.posterImage) {
        deleteFile(path.join(__dirname, "../../", "uploads/icons", template.posterImage));
      }
      updateData.posterImage = posterPath;
    }

    const updatedTemplate = await Template.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: MSG.TEMPLATE_UPDATED_SUCCESS,
      data: updatedTemplate
    });
  } catch (err) {
    console.error("Update template error:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      error: err.message
    });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await Template.findByIdAndDelete(id);
    if (!template) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TEMPLATE_NOT_FOUND });

    if (template.categoryId) await Category.updateMany({ templateId: template._id }, { $pull: { templateId: template._id } });
    if (template.icon) deleteFile(path.join(__dirname, "../../uploads/icons", path.basename(template.icon)));

    return res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.TEMPLATE_DELETED_SUCCESS });
  } catch (err) {
    console.error("Delete template error:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

const changeTemplateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!Constant.STATUS.ALL.includes(status)) return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.INVALID_STATUS });

    const template = await Template.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!template) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.TEMPLATE_NOT_FOUND });

    return res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: `${MSG.STATUS_UPDATED} ${status}` });
  } catch (err) {
    console.error("Change template status error:", err);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateDetails,
  updateTemplate,
  deleteTemplate,
  changeTemplateStatus,
};