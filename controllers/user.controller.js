const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const Business = require('../models/Business');
const Review = require('../models/Review');
const { API_RESPONSE_CODES, MSG } = require('../constants/admin_messages');
const { STATUS, USERTYPE, IMAGE_PREFIX, IMAGE_PATH } = require('../constants/constant');

const sanitizeUser = (user) => {
    const userObj = user.toObject();
    delete userObj.termsAccepted;
    delete userObj.emailVerified;
    delete userObj.termsAcceptedAt;
    return userObj;
};

const getMyProfile = async (req, res) => {
    try {
        const id = req?.user?._id;
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
}

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        let { firstName, lastName, email, phone } = req.body
        let address = JSON.parse(req.body.address)
        let location = JSON.parse(req.body.location)

        if (email) email = email.toLowerCase().trim();

        if (email) {
            const existingUser = await User.findOne({ email: email });
            if (existingUser && existingUser._id.toString() !== id) {
                return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                    success: false,
                    message: MSG.EMAIL_ALREADY_IN_USE
                });
            }
        }
        const user = await User.findByIdAndUpdate(id, { firstName, lastName, phone, address, location }, { new: true });
        if (!user) return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.USER_NOT_FOUND });

        res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.USER_UPDATED_SUCCESS, data: sanitizeUser(user) });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
    }
};

const newAddress = async (req, res) => {
    try {
        const id = req.user._id;
        let { newaddress } = req.body
        const user = await User.findById(id);
        if (!user) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: MSG.USER_NOT_FOUND
            });
        }

        const isDuplicate = user.otherAddress.some(addr =>
            addr.street === newaddress.street &&
            addr.city === newaddress.city &&
            addr.state === newaddress.state &&
            addr.pincode === newaddress.pincode &&
            addr.country === (newaddress.country || 'US') &&
            Array.isArray(addr.coordinates) &&
            Array.isArray(newaddress.coordinates) &&
            addr.coordinates[0] === newaddress.coordinates[0] &&
            addr.coordinates[1] === newaddress.coordinates[1]
        );

        if (isDuplicate) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Address already exists'
            });
        }

        user.otherAddress.push(newaddress)
        await user.save()
        res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.USER_UPDATED_SUCCESS, data: sanitizeUser(user) });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
    }
};

module.exports = {
    getMyProfile,
    updateUser,
    newAddress
};
