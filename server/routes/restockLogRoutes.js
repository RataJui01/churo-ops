const express = require('express');
const restockLogController = require('../controllers/restockLogController');

const router = express.Router();

router.route('/').get(restockLogController.getAllRestockLog);

module.exports = router;
