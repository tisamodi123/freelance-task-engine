const express = require('express')
const router = express.Router()
const supportController = require('../../controllers/admin/support.controller')
const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');

router.get('/get', authMiddleware, adminAuth, supportController.getAllSupports)

router.patch('/changeStatus/:id', authMiddleware, adminAuth, supportController.changeSupportStatus)

module.exports = router