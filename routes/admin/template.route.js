const express = require('express');
const router = express.Router();

const templateController = require('../../controllers/admin/template.controller');

const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');
const upload = require('../../utils/multer');

router.post('/add', authMiddleware, adminAuth, upload, templateController.createTemplate);

router.put('/update/:id', authMiddleware, adminAuth, upload, templateController.updateTemplate);

router.patch('/changeStatus/:id', authMiddleware, adminAuth, templateController.changeTemplateStatus);

router.delete('/delete/:id', authMiddleware, adminAuth, templateController.deleteTemplate);

router.get('/get', templateController.getTemplates);

router.get('/getById/:id', authMiddleware, adminAuth, templateController.getTemplateDetails)

module.exports = router;