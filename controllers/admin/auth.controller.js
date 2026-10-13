const User = require('../../models/User');
const { generateAccessToken } = require('../../utils/jwtToken');
const { STATUS, USERTYPE } = require('../../constants/constant');
const { API_RESPONSE_CODES, MSG } = require('../../constants/admin_messages');

const registerAdmin = async (req, res) => {
    try {
        const existingAdmin = await User.findOne({ userType: USERTYPE.ADMIN });
        if (existingAdmin) {
            return res.status(API_RESPONSE_CODES.CONFLICT).json({
                status: false,
                message: MSG.EMAIL_ALREADY_EXISTS
            });
        }

        const admin = await User.create({
            firstName: 'Super',
            lastName: 'Admin',
            email: 'admin@gmail.com',
            phone: '9998887778',
            password: 'Admin@123',
            userType: USERTYPE.ADMIN,
            accountStatus: STATUS.VERIFIED,
        });

        return res.status(API_RESPONSE_CODES.CREATED).json({
            status: true,
            message: MSG.TEMPLATE_CREATED_SUCCESS.replace('Template', 'Admin'),
            admin: {
                id: admin._id,
                email: admin.email,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MSG.SERVER_ERROR
        });
    }
};

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ email: email.toLowerCase(), userType: USERTYPE.ADMIN, isDeleted: { $ne: true } });
        if (!admin) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                status: false,
                message: MSG.USER_NOT_FOUND
            });
        }

        const isMatch = await admin.matchPassword(password);
        if (!isMatch) {
            return res.status(API_RESPONSE_CODES.UNAUTHORIZED).json({
                status: false,
                message: MSG.INVALID_CREDENTIALS
            });
        }

        const token = generateAccessToken(admin);

        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            status: true,
            message: MSG.LOGIN_SUCCESS,
            token,
            me: {
                firstName: admin?.firstName,
                lastName: admin?.lastName
            }
        });
    } catch (err) {
        console.error(err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MSG.SERVER_ERROR
        });
    }
};

module.exports = {
    registerAdmin,
    loginAdmin
};
