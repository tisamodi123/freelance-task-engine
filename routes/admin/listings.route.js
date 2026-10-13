const express = require('express');
const router = express.Router();
const listingsController = require('../../controllers/admin/listings.controller');
const { authMiddleware, adminAuth } = require('../../middleware/authMiddleware');

const upload = require('../../utils/multer');

router.post('/create', authMiddleware, adminAuth, upload, listingsController.createListing);

router.get('/get', authMiddleware, adminAuth, listingsController.getAllListings);

router.get('/getById/:id', authMiddleware, adminAuth, listingsController.getListingDetail);

router.put('/update/:id', authMiddleware, adminAuth, upload, listingsController.updateListing);

router.delete('/delete/:id', authMiddleware, adminAuth, listingsController.deleteListing);

router.patch('/changeStatus/:id', authMiddleware, adminAuth, listingsController.changeStatus);

module.exports = router;