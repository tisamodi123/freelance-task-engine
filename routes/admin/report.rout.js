const express = require('express');
const router = express.Router();
const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');
const { getReportsList, suspendUser } = require('../../controllers/admin/report.controller');

router.get('/reportList',authMiddleware, adminAuth, getReportsList);
router.delete('/suspend/:id', authMiddleware, adminAuth, suspendUser);

module.exports =router
