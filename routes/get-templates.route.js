const express = require('express');
const router = express.Router();

const { authMiddleware, authMiddlewareOptional } = require('../middleware/authMiddleware')
const getTemplateController = require('../controllers/getTemplates.controller')

router.get('/', authMiddleware, getTemplateController.getCategoriesWithTemplates)
router.get('/all-with-business-own', authMiddlewareOptional, getTemplateController.getCategoriesWithTemplatesWithBusinessOwn)

router.get('/all', getTemplateController.getAllCategoryTemplates)

module.exports = router;