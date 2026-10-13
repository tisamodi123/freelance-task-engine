const express = require('express');
const router = express.Router();
const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');
const { getReviewsList, deleteReview } = require('../../controllers/admin/review.controller');

router.get('/reviewList',authMiddleware, adminAuth, getReviewsList);
router.delete('/delete/:id', authMiddleware, adminAuth, deleteReview);

module.exports =router
