const express = require('express');
const router = express.Router();
const businessController = require('../../controllers/admin/business.controller');
const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');
const upload = require('../../utils/multer')

const multer = require('multer');
const uploads = multer();

router.post('/create', authMiddleware, adminAuth, upload, businessController.createBusiness);

router.post('/get', authMiddleware, adminAuth, uploads.none(), businessController.getBusinesses);

router.get('/getById/:id', authMiddleware, adminAuth, businessController.getBusinessDetails);

router.get('/getById/:id/bids', authMiddleware, adminAuth, businessController.getBusinessBids);

router.get('/getById/reviews/:id', authMiddleware, adminAuth, businessController.getBusinessReviews);

router.put('/update/:id', authMiddleware, adminAuth, upload, businessController.updateBusiness);

router.delete('/delete/:id', authMiddleware, adminAuth, businessController.deleteBusiness);

router.patch('/changeStatus/:id', authMiddleware, adminAuth, businessController.changeStatus);

router.get('/filters', businessController.getBusinessStatus);

module.exports = router;