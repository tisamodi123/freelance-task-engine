const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');
const { STATUS } = require('../constants/constant');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authorized' });

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        if (user.accountStatus !== STATUS.VERIFIED) return res.status(403).json({ message: 'Account not verified' });

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const authMiddlewareOptional = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token && token != "undefined") {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            if (user.accountStatus !== STATUS.VERIFIED) return res.status(403).json({ message: 'Account not verified' });

            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    } else {
        next();
    }
};

const businessAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ message: 'Business token required' });

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const business = await Business.findById(decoded.id);
        if (!business) return res.status(403).json({ message: 'Business not found' });

        req.business = business;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid business token' });
    }
};

const adminAuth = (req, res, next) => {
    if (req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    next();
};

module.exports = { authMiddleware, adminAuth, businessAuth, authMiddlewareOptional }