const express = require('express');
const router = express.Router();

const categoryController = require('../../controllers/admin/category.controller')

const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');
const upload = require('../../utils/multer');

router.post('/add', authMiddleware, adminAuth, upload, categoryController.createCategory);

router.get('/get', categoryController.getCategories);

router.get('/getById/:id', authMiddleware, adminAuth, categoryController.getCategoryById);

router.put('/update/:id', authMiddleware, adminAuth, upload, categoryController.updateCategory);

router.delete('/delete/:id', authMiddleware, adminAuth, categoryController.deleteCategory);

router.patch('/changeStatus/:id', authMiddleware, adminAuth, categoryController.changeStatus);

module.exports = router;
