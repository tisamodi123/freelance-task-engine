const fs = require('fs');
const path = require('path');
const Category = require('../../models/Category');
const Template = require('../../models/Template');
const Business = require('../../models/Business');
const { API_RESPONSE_CODES, MSG } = require('../../constants/admin_messages');
const { IMAGE_PREFIX, IMAGE_PATH } = require('../../constants/constant');

const createCategory = async (req, res) => {
  try {
    const { name, slug, description, sortOrder } = req.body;
    const iconFile = req.files?.find(f => f.fieldname === 'icon');

    if (!iconFile) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        status: false,
        message: MSG.TEMPLATE_ICON_REQUIRED,
        data: null
      });
    }

    const icon = iconFile.filename;

    if (!name || !icon || !slug) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        status: false,
        message: MSG.CATEGORY_NAME_ICON_SLUG_REQUIRED,
        data: null
      });
    }

    const exists = await Category.findOne({ slug, isDeleted: { $ne: true } });
    if (exists) {
      return res.status(API_RESPONSE_CODES.CONFLICT).json({
        status: false,
        message: MSG.SLUG_ALREADY_EXISTS,
        data: null
      });
    }

    await Category.create({
      name,
      slug,
      description,
      icon: icon,
      sortOrder: sortOrder || 0
    });

    return res.status(API_RESPONSE_CODES.CREATED).json({
      status: true,
      message: MSG.CATEGORY_CREATED_SUCCESS,
    });

  } catch (err) {
    console.error('Create category error:', err);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        status: false,
        message: messages.join(', '),
        data: null
      });
    }

    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: MSG.SERVER_ERROR,
      data: null
    });
  }
};

const getCategories = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const match = {
      isDeleted: { $ne: true }
    };
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Category.countDocuments(match);

    const categories = await Category.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'templates',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'templates'
        }
      },
      { $addFields: { templateCount: { $size: '$templates' } } },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          status: 1,
          templateCount: 1,
          description: 1,
          icon: { $concat: [IMAGE_PREFIX, IMAGE_PATH.CATEGORY, '$icon'] },
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);


    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      status: true,
      message: MSG.CATEGORY_FETCHED_SUCCESS,
      data: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        categories
      }
    });

  } catch (err) {
    console.error('Get categories error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat || cat?.isDeleted === true) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        status: false,
        message: MSG.CATEGORY_NOT_FOUND,
      });
    }

    cat.icon = IMAGE_PREFIX + IMAGE_PATH.CATEGORY + cat.icon;
    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      status: true,
      message: MSG.CATEGORY_FETCHED_SUCCESS,
      data: cat
    });
  } catch (err) {
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category || category?.isDeleted === true) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        status: false,
        message: MSG.CATEGORY_NOT_FOUND,
      });
    }

    if (req.body?.slug) {
      const { slug } = req.body;
      const excludeId = req.params.id;

      const exists = await Category.findOne({
        slug,
        _id: { $ne: excludeId },
        isDeleted: { $ne: true }
      });
      if (exists) {
        return res.status(API_RESPONSE_CODES.CONFLICT).json({
          status: false,
          message: MSG.SLUG_ALREADY_EXISTS,
          data: null
        });
      }
    }

    let updateData = {};
    for (let key in req.body) {
      if (req.body[key] !== '' && req.body[key] !== undefined && req.body[key] !== null) {
        updateData[key] = req.body[key];
      }
    }

    const iconFile = req.files?.find(f => f.fieldname === 'icon');
    if (iconFile) {
      if (category.icon) {
        const oldIconPath = path.join(__dirname, '..', category.icon);
        if (fs.existsSync(oldIconPath)) fs.unlinkSync(oldIconPath);
      }

      const newIconPath = `${iconFile.filename}`;
      updateData.icon = newIconPath;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      status: true,
      message: MSG.CATEGORY_UPDATED_SUCCESS,
      data: updatedCategory
    });

  } catch (err) {
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: MSG.SERVER_ERROR,
      data: null,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndUpdate(req.params.id, {
      isDeleted: true
    });
    if (!deleted) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        status: false,
        message: MSG.CATEGORY_NOT_FOUND,
      });
    }

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      status: true,
      message: MSG.CATEGORY_DELETED_SUCCESS,
    });
  } catch (err) {
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

const changeStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const updated = await Category.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (!updated) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        status: false,
        message: MSG.CATEGORY_NOT_FOUND,
      });
    }

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      status: true,
      message: MSG.CATEGORY_STATUS_UPDATED,
    });
  } catch (err) {
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  changeStatus,
};
