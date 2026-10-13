const express = require('express');
const router = express.Router();

const commonController = require('../controllers/common.controller');



router.get('/dashboard',  commonController.dashboard); 
router.get('/blog/:id',  commonController.getBlogById);
router.get('/blogs',  commonController.getBlogs);

module.exports = router;