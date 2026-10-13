const express = require('express');
const router = express.Router();
const upload = require('../utils/multer'); 
const reviewController = require('../controllers/review.controller');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/create/:taskId', authMiddleware, upload, reviewController.createReview);

router.post('/cancel/:taskId', authMiddleware, reviewController.skipReview);

router.get('/pending', authMiddleware, reviewController.getPendingReviews);

router.post('/my-reviews',authMiddleware,reviewController.getMyReviewsAndBusinessReviews)
module.exports = router;