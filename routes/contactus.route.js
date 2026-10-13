const express = require('express')
const router = express.Router()
const supportController = require('../controllers/contact.controller..js')


router.post("/", supportController.contactUsSubmit)

module.exports = router