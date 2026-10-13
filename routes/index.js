const express = require('express');
const router = express.Router();

const adminRoutes = require('../routes/admin/index')

const businessRoutes = require('./business.route')
const taskRoutes = require('./task.route')
const templateRoutes = require('./get-templates.route')
const authRoutes = require('./authRoutes');
const bidRoutes = require('./bid.route')
const listingsRoutes = require('./listings.route')
const reviewRoutes = require('./review.route')
const reportRoutes = require('./report.routes')
const supportRoutes = require('./support.route');
const contactUsRoutes = require('./contactus.route');
const commonRoutes = require('./common.routes');
const userRoutes = require('./user.route')
const categoryList = require('./calegoryList.routes')
const locationList = require('./locationList.routes')
//admin
router.use('/admin', adminRoutes);

//users
router.use('/auth', authRoutes);
router.use('/business', businessRoutes)
router.use('/templates', templateRoutes)
router.use('/task', taskRoutes)
router.use('/bid', bidRoutes)
router.use('/listings', listingsRoutes)
router.use('/reviews', reviewRoutes)
router.use('/report',reportRoutes)
router.use('/support', supportRoutes)
router.use('/contact-us', contactUsRoutes);
router.use('/common', commonRoutes);
router.use('/user', userRoutes)

//footer
router.use('/category', categoryList)
router.use('/location', locationList)

module.exports = router;
