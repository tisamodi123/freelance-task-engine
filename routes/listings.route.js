const express = require('express');
const router = express.Router();
const upload = require('../utils/multer'); // your multer file
const listingsController = require('../controllers/listings.controller');
const { authMiddleware, authMiddlewareOptional } = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, upload, listingsController.createListing);

router.get('/get', listingsController.getAllListings);

router.get('/getById/:id', authMiddlewareOptional, listingsController.getListingsDetail);

router.get('/myListings', authMiddleware, listingsController.getMyListings);

router.put('/update/:id', authMiddleware, upload, listingsController.updateListing);

router.delete('/delete/:id', authMiddleware, listingsController.deleteListing);

module.exports = router;