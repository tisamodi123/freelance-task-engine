const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/blog.controller');
const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');
const upload = require('../../utils/multer')

const multer = require('multer');
const uploads = multer();


router.post('/create', authMiddleware, adminAuth, upload, controller.create);
router.get('/list', authMiddleware, adminAuth, controller.list);
router.get('/getById/:id', authMiddleware, adminAuth, controller.getById);
router.post('/update/:id', authMiddleware, adminAuth, upload, controller.update);
router.delete('/delete/:id', authMiddleware, adminAuth, controller.deleteBlog);

module.exports = router;