const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto')

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, userType: user.userType },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const generateBusinessToken = (business) => {
  const id = business._id ? business._id : business;
  const name = business.businessName || business.name || '';

  return jwt.sign(
    { id, name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

async function generateUniqueVerificationToken(field = "verificationToken") {
  let token;
  let tokenExists = true;

  while (tokenExists) {
    token = crypto.randomBytes(16).toString('hex');

    const existingUser = await User.findOne({ [field]: token });
    if (!existingUser) {
      tokenExists = false;
    }
  }

  return token;
}

module.exports = {
  generateAccessToken,
  generateBusinessToken,
  generateUniqueVerificationToken
}