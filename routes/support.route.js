const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/authMiddleware')
const supportController = require('../controllers/support.controller')
const upload = require('../utils/multer')

router.post("/create", authMiddleware, upload, supportController.createSupport)

router.get("/get-related-tasks", authMiddleware, supportController.getRelatedTasks)

router.put("/update/:id", authMiddleware, upload, supportController.updateSupport);

router.delete("/delete/:id", authMiddleware, supportController.deleteSupport);

module.exports = router