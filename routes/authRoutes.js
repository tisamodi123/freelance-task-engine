const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware')
const { validateBody, registerSchema, loginSchema } = require('../validatons/authValidation')

const multer = require('multer');
const upload = multer();

router.post('/register', upload.none(), validateBody(registerSchema, [
    "address", "location"
]), authController.register);

router.get('/addresses', authMiddleware, authController.getUserAddresses);

router.get('/verify-email/:token', authController.verifyEmail);

router.post('/login', upload.none(), validateBody(loginSchema), authController.login);

router.post('/forgot-password', upload.none(), authController.forgotPassword);
router.post('/reset-password/:token', upload.none(), authController.resetPassword);

router.get('/homepage', authMiddleware, authController.getHomepage)

router.get('/cancel', authMiddleware, authController.cancel);


module.exports = router;