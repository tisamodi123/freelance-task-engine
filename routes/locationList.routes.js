const express = require('express')
const { location } = require('../controllers/locationListController');
const router = express.Router()

router.get('/locationList',location)

module.exports = router;