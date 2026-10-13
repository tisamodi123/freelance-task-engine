const User = require('../models/User');
const Task = require('../models/Task')
const { generateAccessToken, generateUniqueVerificationToken } = require('../utils/jwtToken');
const { sendEmail } = require('../utils/sendEmail');
const { verificationEmailHtml, forgotPasswordEmailHtml } = require('../utils/mailtemplates');
const { API_RESPONSE_CODES, MSG } = require('../constants/user_messages');
const Constants = require('../constants/constant.js');
const Constant = require('../constants/user_messages.js');

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      termsAccepted,
      isBusiness,
      address,
      location
    } = req.body;

    if (!termsAccepted) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ success: false, message: Constant.MSG.TERMS_ACCEPT });
    }

    if (password !== confirmPassword) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ success: false, message: Constant.MSG.PASSWORD_MISMATCH });
    }

    if (
      address &&
      typeof address === "object" &&
      Object.values(address).some(v => v && v.trim && v.trim() !== "") &&
      (!location || !Array.isArray(location.coordinates) || !location.coordinates.length)
    ) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ success: false, message: Constant.MSG.LOCATION_PROVIDED });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase(), isDeleted: { $ne: true } }]
    });

    if (existingUser) {
      return res.status(Constant.API_RESPONSE_CODES.CONFLICT)
        .json({ success: false, message: Constant.MSG.EMAIL_EXISTS });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      userType: Constants.USERTYPE.CUSTOMER,
      phone,
      accountStatus: Constants.STATUS.PENDING_EMAIL,
      emailVerified: false,
      isBusiness: isBusiness || false,
      businessRegistered: false,
      termsAccepted,
      termsAcceptedAt: Date.now()
    });

    if (address) newUser.address = address;
    if (location) newUser.location = location;

    const token = await generateUniqueVerificationToken();
    const expiry = Date.now() + 1 * 60 * 60 * 1000; // 2 hours
    // const expiry = Date.now() + 2 * 60 * 1000;
    newUser.emailVerificationToken = token;
    newUser.emailVerificationExpiry = expiry;
    await newUser.save();

    const verifyUrl = `${Constants.FRONTEND_URL}/login?token=${token}`;
    const userTypes = newUser.isBusiness ? 'Service Provider' : 'Service Seeker';

    sendEmail({
      to: newUser.email,
      subject: 'Verify Your Email',
      html: verificationEmailHtml(verifyUrl, newUser.firstName, newUser.lastName, userTypes),
    });

    res.status(Constant.API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: Constant.MSG.REGISTRATION_SUCCESS,
      redirectToken: token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(Constant.API_RESPONSE_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: Constant.MSG.SERVER_ERROR_REGISTRATION });
  }
};

const getUserAddresses = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('address location');

    const savedAddress =
      user?.address && Object.values(user.address).some(v => v) && user.location
        ? {
          type: 'saved',
          address: user.address,
          location: user.location,
        }
        : null;

    const tasks = await Task.find(
      { createdBy: userId, address: { $exists: true }, location: { $exists: true } },
      { address: 1, location: 1, _id: 0 }
    ).lean();

    const filteredTasks = tasks.filter(task => {
      if (!savedAddress) return true;

      const sameAddress =
        task.address.street === savedAddress.address.street &&
        task.address.city === savedAddress.address.city &&
        task.address.state === savedAddress.address.state &&
        task.address.country === savedAddress.address.country &&
        task.address.pincode === savedAddress.address.pincode;

      const sameLocation =
        Array.isArray(task.location?.coordinates) &&
        Array.isArray(savedAddress.location?.coordinates) &&
        task.location.coordinates[0] === savedAddress.location.coordinates[0] &&
        task.location.coordinates[1] === savedAddress.location.coordinates[1];

      return !(sameAddress && sameLocation);
    });

    const taskAddresses = filteredTasks
      .filter(task => task.address && task.location)
      .filter((task, index, self) =>
        index ===
        self.findIndex(
          t =>
            JSON.stringify(t.address) === JSON.stringify(task.address) &&
            JSON.stringify(t.location) === JSON.stringify(task.location)
        )
      )
      .map(task => ({
        type: 'previous_task',
        address: task.address,
        location: task.location,
      }));

    const addresses = [];
    if (savedAddress) addresses.push(savedAddress);
    addresses.push(...taskAddresses);

    if (!addresses.length) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
        success: false,
        message: 'No addresses found',
      });
    }

    return res.status(API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.params.token;
    if (!token) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: Constant.MSG.TOKEN_MISSING });
    }

    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return res.status(Constant.API_RESPONSE_CODES.NOT_FOUND)
        .json({ success: false, message: Constant.MSG.TOKEN_EXPIRED });
    }

    if (user.emailVerified) {
      return res.status(Constant.API_RESPONSE_CODES.CONFLICT)
        .json({ success: false, message: Constant.MSG.EMAIL_ALREADY_VERIFIED });
    }

    if (user.emailVerificationExpiry < Date.now()) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ success: false, message: Constant.MSG.LINK_EXPIRED });
    }

    user.emailVerified = true;
    user.accountStatus = Constants.STATUS.VERIFIED;
    await user.save();

    return res.status(Constant.API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: Constant.MSG.EMAIL_VERIFIED_SUCCESS
    });
  } catch (err) {
    console.error('VerifyEmail error:', err);
    return res.status(Constant.API_RESPONSE_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: Constant.MSG.SERVER_ERROR_VERIFICATION });
  }
};

const login = async (req, res) => {

  console.log("login controller")

  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isDeleted: { $ne: true }
    }).populate('business');

    if (!user) {
      return res.status(Constant.API_RESPONSE_CODES.UNAUTHORIZED).json({ message: Constant.MSG.USER_NOT_FOUNDS, isUser: false });
    }

    if (user.accountStatus === Constants.STATUS.SUSPENDED) {
      return res.status(Constant.API_RESPONSE_CODES.UNAUTHORIZED).json({ message: Constant.MSG.USER_ACCOUNT_SUSPENDED, isUser: true });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(Constant.API_RESPONSE_CODES.UNAUTHORIZED).json({ message: Constant.MSG.INVALID_EMAIL_PASSWORD });
    }

    if (user.emailVerified === false) {
      const nowtime = new Date();
      if (nowtime > user.emailVerificationExpiry) {
        const token = await generateUniqueVerificationToken();
        const expiry = Date.now() + 1 * 60 * 60 * 1000;
        user.emailVerificationToken = token;
        user.emailVerificationExpiry = expiry;
        await user.save();

        try {
          const verifyUrl = `${Constants.FRONTEND_URL}/login?token=${token}`;
          const userTypes = user.isBusiness ? 'Service Provider' : 'Service Seeker';

          sendEmail({
            to: user.email,
            subject: 'Verify Your Email',
            html: verificationEmailHtml(verifyUrl, user.firstName, userTypes),
          });
        } catch (error) {
          console.error(error)
        }
      }

      return res.status(Constant.API_RESPONSE_CODES.FORBIDDEN).json({ message: Constant.MSG.EMAIL_NOT_VERIFIED });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    // let business_status = user.business ? user.business.status : 'not_exists';
    let business_id = user.business && user.business.isDeleted !== true ? user.business._id : null;


    const _user = {
      _id: user?._id,
      firstName: user?.firstName,
      lastName: user?.lastName
    }


    res.status(Constant.API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: Constant.MSG.LOGIN_SUCCESS,
      accessToken,
      business_id,
      user: _user
      // isUser: true
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(Constant.API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ message: Constant.MSG.SERVER_ERROR_LOGIN });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ success: false, message: Constant.MSG.EMAIL_REQUIRED });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isDeleted: { $ne: true }
    });

    if (!user) {
      return res.status(Constant.API_RESPONSE_CODES.NOT_FOUND)
        .json({ message: Constant.MSG.USER_NOT_FOUND });
    }

    if (user.accountStatus === Constants.STATUS.SUSPENDED) {
      return res.status(Constant.API_RESPONSE_CODES.UNAUTHORIZED)
        .json({ message: Constant.MSG.USER_ACCOUNT_SUSPENDED });
    }

    const token = await generateUniqueVerificationToken("resetPasswordToken");
    user.resetPasswordToken = token;
    user.resetPasswordExpiry = Date.now() + 2 * 60 * 60 * 1000;

    user.isForgotPassword = true;

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password',
      html: forgotPasswordEmailHtml(resetUrl, user.firstName, user.lastName),
    });

    res.status(Constant.API_RESPONSE_CODES.SUCCESS)
      .json({ message: Constant.MSG.RESET_PASSWORD_LINK });
  } catch (err) {
    console.error('ForgotPassword error:', err);
    res.status(Constant.API_RESPONSE_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: Constant.MSG.SERVER_ERROR });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ message: Constant.MSG.TOKEN_MISSING });
    }

    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ message: Constant.MSG.REQUIRED_FIELDS });
    }

    if (password !== confirmPassword) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ message: Constant.MSG.PASSWORD_MISMATCH });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(Constant.API_RESPONSE_CODES.NOT_FOUND)
        .json({ message: Constant.MSG.USER_NOT_FOUND });
    }

    if (user.isForgotPassword === false) {
      return res.status(Constant.API_RESPONSE_CODES.BAD_REQUEST)
        .json({ message: Constant.MSG.USER_NOT_REQUESTED_RESET });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.isForgotPassword = false;
    await user.save();

    res.status(Constant.API_RESPONSE_CODES.SUCCESS)
      .json({ message: Constant.MSG.PASSWORD_RESET_SUCCESS });
  } catch (err) {
    console.error('ResetPassword error:', err);
    res.status(Constant.API_RESPONSE_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: Constant.MSG.SERVER_ERROR });
  }
};

const getHomepage = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('business');

    if (!user) {
      return res.status(Constant.API_RESPONSE_CODES.NOT_FOUND)
        .json({ success: false, message: Constant.MSG.USER_NOT_FOUND });
    }

    if (user.accountStatus === Constants.STATUS.SUSPENDED) {
      return res.status(Constant.API_RESPONSE_CODES.UNAUTHORIZED)
        .json({ message: Constant.MSG.USER_ACCOUNT_SUSPENDED });
    }

    if (user.emailVerified === false) {
      return res.status(Constant.API_RESPONSE_CODES.FORBIDDEN)
        .json({ message: Constant.MSG.EMAIL_NOT_VERIFIED });
    }

    if (!user.isBusiness) {
      return res.status(Constant.API_RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: { isBusiness: user.isBusiness }
      });
    }

    if (
      (user.isBusiness && !user.business) ||
      (user.isBusiness && user.business && user.business.isDeleted === true)
    ) {
      return res.status(Constant.API_RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: {
          isBusiness: user.isBusiness,
          businessRegistered: false
        }
      });
    } else {
      return res.status(Constant.API_RESPONSE_CODES.SUCCESS).json({
        success: true,
        data: {
          isBusiness: user.isBusiness,
          businessRegistered: true
        }
      });
    }
  } catch (err) {
    console.error('Homepage API error:', err);
    res.status(Constant.API_RESPONSE_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: Constant.MSG.SERVER_ERROR });
  }
};

const cancel = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(Constant.API_RESPONSE_CODES.NOT_FOUND)
        .json({ success: false, message: Constant.MSG.USER_NOT_FOUND });
    }

    user.isBusiness = false;
    await user.save();

    return res.status(Constant.API_RESPONSE_CODES.SUCCESS).json({
      success: true,
      message: Constant.MSG.BUSINESS_CANCEL_SUCCESS,
      data: {
        isBusiness: false,
        businessRegistered: false
      }
    });
  } catch (err) {
    console.error('Cancel business API error:', err);
    res.status(Constant.API_RESPONSE_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: Constant.MSG.SERVER_ERROR_CANCEL });
  }
};

module.exports = {
  register,
  getUserAddresses,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getHomepage,
  cancel
};