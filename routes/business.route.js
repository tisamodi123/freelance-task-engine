const express = require('express');
const router = express.Router();

const businessController = require('../controllers/business.controller');
const upload = require('../utils/multer');
const { authMiddleware, authMiddlewareOptional } = require('../middleware/authMiddleware');
const { validate, registerBusinessSchema } = require('../validatons/businessValidation');

router.post('/register', authMiddlewareOptional, upload, validate(registerBusinessSchema, ["location"]), businessController.registerBusiness)

router.get('/get', authMiddleware, businessController.getBusinesses);   // Get All Businesses (with filters, search, location-based) 
// Search Businesses Nearby – integrated in GET /api/business?lat&lng&radius

router.post('/getByCityAndService',businessController.getBusinessListFromCityService)

router.get('/getById/:id', authMiddleware, businessController.getBusinessDetail);

router.put('/update/:id', authMiddleware, upload, businessController.updateBusiness)

router.delete('/delete/:id', authMiddleware, businessController.deleteBusiness)

module.exports = router;