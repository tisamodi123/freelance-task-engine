const express = require('express');
const router = express.Router();

const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');

const userController = require('../../controllers/admin/user.controller');

router.post('/add', authMiddleware, adminAuth, userController.createUser);

router.get('/get', authMiddleware, adminAuth, userController.listUsers);

router.get('/getById/:id', authMiddleware, adminAuth, userController.getUserDetail);

router.get('/getById/:id/tasks', authMiddleware, adminAuth, userController.getUserTasks);

router.put('/update/:id', authMiddleware, adminAuth, userController.updateUser);

router.delete('/delete/:id', authMiddleware, adminAuth, userController.deleteUser);

router.patch('/changeStatus/:id', authMiddleware, adminAuth, userController.changeUserStatus);

module.exports = router;