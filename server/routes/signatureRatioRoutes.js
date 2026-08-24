const express = require('express');
const signatureRatioController = require('../controllers/signatureRatioController');

const router = express.Router();

router.route('/').get(signatureRatioController.getAllSignatureRatio);

module.exports = router;
