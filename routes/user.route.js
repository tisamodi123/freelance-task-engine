const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const multer = require('multer');
const { updateUser, getMyProfile, newAddress } = require('../controllers/user.controller');
const upload = multer()
const router = express.Router();

// router.post('/add', authMiddleware, adminAuth, userController.createUser);

// router.get('/get', authMiddleware, adminAuth, userController.listUsers);

router.get('/getMyProfile', authMiddleware, getMyProfile);

// router.get('/getById/:id/tasks', authMiddleware, adminAuth, userController.getUserTasks);

router.put('/update/:id', authMiddleware, upload.none(), updateUser);

router.post('/newAddress',authMiddleware,newAddress)
// router.delete('/delete/:id', authMiddleware, adminAuth, userController.deleteUser);

// router.patch('/changeStatus/:id', authMiddleware, adminAuth, userController.changeUserStatus);

module.exports = router;