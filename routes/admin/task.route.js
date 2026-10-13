const express = require('express');
const router = express.Router();
const taskController = require('../../controllers/admin/task.controller');
const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');

router.get('/get', authMiddleware, adminAuth, taskController.getTasksList);

router.get('/getById/:id', authMiddleware, adminAuth, taskController.getTaskDetails);

router.get('/completed-without-otp', authMiddleware, adminAuth, taskController.getTasksCompletedWithoutOTP);

module.exports = router;