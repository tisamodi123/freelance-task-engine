const express = require('express')
const router = express.Router()

const authRoute = require('./auth.route')
const categoryRoutes = require('./category.route')
const templateRoutes = require('./template.route')
const userRoutes = require('./user.route')
const businessRoutes = require('./business.route')
const taskRoute = require('./task.route')
const listingsRoute = require('./listings.route')
const supportRoute = require('./support.route');
const blogRoute = require('./blog.routes');
const review = require('./review.route')
const report = require('./report.rout')

router.use('/auth', authRoute)
router.use('/category', categoryRoutes)
router.use('/template', templateRoutes)
router.use('/users', userRoutes)
router.use('/business', businessRoutes)
router.use('/task', taskRoute)
router.use('/listings', listingsRoute)
router.use('/support', supportRoute);

router.use('/blogs', blogRoute); 
router.use('/review', review)
router.use('/report',report)

module.exports = router