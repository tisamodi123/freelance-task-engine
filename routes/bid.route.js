const express = require('express');
const router = express.Router();
const { authMiddleware, businessAuth } = require('../middleware/authMiddleware');
const upload = require('../utils/multer');
const bidController = require('../controllers/bid.controller');

router.post('/create/:taskId', authMiddleware, upload, bidController.createBid);

router.get('/myBids', authMiddleware, bidController.myBids)

router.put('/update/:bidId', authMiddleware, upload, bidController.updateBid)

router.delete('/delete/:bidId', authMiddleware, upload, bidController.deleteBid)

router.get('/accept/:taskId/:bidId', authMiddleware, bidController.getBidAcceptanceDetails);

router.post('/confirmBid/:taskId/:bidId', authMiddleware, bidController.confirmBid);

module.exports = router;