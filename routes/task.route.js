const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware')
const taskController = require('../controllers/task.controller')
const upload = require('../utils/multer');

router.post('/add', authMiddleware, upload, taskController.createTask);

router.get('/get', authMiddleware, taskController.getTasks);

router.get('/getMyTasks', authMiddleware, taskController.getMyTasks)

router.get('/getAssignedTasks', authMiddleware, taskController.getAssignedTasks)

router.post('/generate-otp/:id', authMiddleware, upload, taskController.generateOTP)

router.post('/verify-otp/:id', authMiddleware, taskController.verifyOTP)

router.post('/resend-otp/:id', authMiddleware, taskController.resendOTP);

router.post('/complete-without-otp/:id', authMiddleware, taskController.completeWithoutOTP);

router.put('/update/:id', authMiddleware, upload, taskController.updateMyTasks)

router.get('/getById/:id', authMiddleware, taskController.getTaskById);

router.patch('/changeStatus/:id', authMiddleware, taskController.changeTaskStatus);

router.get('/sort-options', taskController.getSortOptions);
router.get('/filters', taskController.getTaskDropdownFilters);

router.delete('/delete/:id', authMiddleware, taskController.deleteMyTask)

module.exports = router;