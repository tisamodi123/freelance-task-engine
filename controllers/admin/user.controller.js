const mongoose = require('mongoose');
const User = require('../../models/User');
const Task = require('../../models/Task');
const Business = require('../../models/Business');
const Review = require('../../models/Review');
const { API_RESPONSE_CODES, MSG } = require('../../constants/admin_messages');
const { STATUS, USERTYPE, IMAGE_PREFIX, IMAGE_PATH } = require('../../constants/constant');

const sanitizeUser = (user) => {
  const userObj = user.toObject();
  delete userObj.termsAccepted;
  delete userObj.emailVerified;
  delete userObj.termsAcceptedAt;
  return userObj;
};

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, userType, accountStatus } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.ALL_FIELDS_REQUIRED });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) return res.status(API_RESPONSE_CODES.CONFLICT).json({ success: false, message: MSG.EMAIL_ALREADY_EXISTS });

    const newUser = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone,
      userType,
      accountStatus
    });

    res.status(API_RESPONSE_CODES.CREATED).json({
      success: true,
      message: MSG.USER_CREATED_SUCCESS,
      data: sanitizeUser(newUser)
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.email) updates.email = updates.email.toLowerCase().trim();

    if (updates.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser && existingUser._id.toString() !== id) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.EMAIL_ALREADY_IN_USE
        });
      }
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.USER_NOT_FOUND });

    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.USER_UPDATED_SUCCESS, data: sanitizeUser(user) });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

const changeUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    if (![STATUS.PENDING_EMAIL, STATUS.VERIFIED, STATUS.SUSPENDED].includes(accountStatus)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.INVALID_STATUS });
    }

    const user = await User.findByIdAndUpdate(id, { accountStatus }, { new: true });
    if (!user) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.USER_NOT_FOUND });

    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.USER_STATUS_UPDATED });
  } catch (err) {
    console.error('Change status error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

const listUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = { userType: USERTYPE.CUSTOMER, isDeleted: { $ne: true } };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search } }
      ];
    }
    if (status) query.accountStatus = status;

    const users = await User.find(query)
      .select("firstName lastName email phone accountStatus emailVerified createdAt updatedAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: users
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_ID
      });
    }

    const user = await User.findById(id)
      .select("firstName lastName email phone address location accountStatus business");

    if (!user) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: MSG.USER_NOT_FOUND
      });
    }

    let userLocation = { lat: null, lng: null };
    if (user.location && Array.isArray(user.location.coordinates)) {
      userLocation = {
        lat: user.location.coordinates[1],
        lng: user.location.coordinates[0]
      };
    }

    let business = [];
    if (user.business) {
      business = await Business.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(user.business), isDeleted: { $ne: true } }
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
          $lookup: {
            from: 'templates',
            localField: 'sub_category',
            foreignField: '_id',
            as: 'subCategoryData'
          }
        },
        {
          $project: {
            _id: 1,
            businessName: 1,
            businessDescription: 1,
            businessImages: 1,
            address: 1,
            location: 1,
            status: 1,
            portfolio: 1,
            businessCategory: {
              _id: '$categoryData._id',
              name: '$categoryData.name'
            },
            sub_category: {
              $map: {
                input: '$subCategoryData',
                as: 'sub',
                in: { _id: '$$sub._id', name: '$$sub.templateName' }
              }
            }
          }
        }
      ]);

      business.forEach(b => {
        b.businessImages = b.businessImages || {};
        b.businessImages.imageUrl = b.businessImages.imageUrl
          ? `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${b.businessImages.imageUrl}`
          : null;

        if (b.location && Array.isArray(b.location.coordinates)) {
          b.location = {
            lat: b.location.coordinates[1], // latitude is index 1
            lng: b.location.coordinates[0], // longitude is index 0
          };
        } else {
          b.location = { lat: null, lng: null };
        }

        b.portfolio = (b.portfolio || []).map(p => ({
          ...p,
          projectImages: (p.projectImages || []).map(img =>
            img ? `${IMAGE_PREFIX}${IMAGE_PATH.PORTFOLIO_IMAGES}${img}` : null
          )
        }));
      });
    }

    // Fetch reviews where this user was reviewed
    const reviews = await Review.find({ reviewedUserId: id, isDeleted: false })
      .populate('reviewerId', 'firstName lastName email')
      .populate('taskId', 'taskTitle description')
      .lean();

    const formattedReviews = reviews.map(review => ({
      _id: review._id,
      comments: review.comments,
      rating: review.rating,
      task: review.taskId ? {
        _id: review.taskId._id,
        taskTitle: review.taskId.taskTitle,
        description: review.taskId.description
      } : null,
      reviewer: review.reviewerId ? {
        _id: review.reviewerId._id,
        firstName: review.reviewerId.firstName,
        lastName: review.reviewerId.lastName,
        email: review.reviewerId.email
      } : null,
      attachments: (review.attachments || []).map(att => ({
        fileUrl: att.fileUrl
          ? `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${att.fileUrl}`
          : null,
        fileName: att.fileUrl
      })),
      createdAt: review.createdAt,
    }));

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        location: userLocation,
        status: user.accountStatus
      },
      tabs: { business, reviews: formattedReviews }
    });

  } catch (err) {
    console.error('Get user details error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      error: err.message
    });
  }
};

const getUserTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const { search } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_ID
      });
    }

    const matchCondition = { createdBy: new mongoose.Types.ObjectId(id) };

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      matchCondition.$or = [
        { taskTitle: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ];
    }

    const tasks = await Task.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'templates',
          localField: 'category',
          foreignField: '_id',
          as: 'templateData'
        }
      },
      { $unwind: { path: '$templateData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          taskTitle: 1,
          description: 1,
          status: 1,
          address: 1,
          budget: 1,
          attachments: 1,
          totalSpent: 1,
          totalBids: 1,
          whenNeeded: 1,
          category: {
            _id: '$templateData._id',
            name: '$templateData.templateName'
          }
        }
      }
    ]);

    tasks.forEach(task => {
      task.attachments = (task.attachments || []).map(i => ({
        fileUrl: i.fileUrl
          ? `${IMAGE_PREFIX}${IMAGE_PATH.TASK_IMAGES}${i.fileUrl}`
          : null
      }));
    });

    res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      total: tasks.length,
      data: tasks
    });

  } catch (err) {
    console.error('Get user tasks error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      error: err.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.USER_NOT_FOUND });

    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.USER_DELETED_SUCCESS });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

module.exports = {
  createUser,
  updateUser,
  changeUserStatus,
  listUsers,
  getUserDetail,
  getUserTasks,
  deleteUser
};
