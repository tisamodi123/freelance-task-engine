const express = require('express')
const { category } = require('../controllers/categoryListController')
const router = express.Router()

router.get('/categoryList',category)

module.exports = router;