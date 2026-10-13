const express = require('express');
const router = express.Router();
const upload = require('../utils/multer'); 
const { createReport } = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authMiddleware');


router.post('/create', authMiddleware, upload, createReport);

module.exports = router