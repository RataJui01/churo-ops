const express = require('express');
const authController = require('../controllers/authController');
const roundController = require('../controllers/roundController');

const router = express.Router();

router.get('/active', authController.protect, roundController.getActiveRounds);
router
  .route('/')
  .get(authController.protect, roundController.getAllRounds)
  .post(authController.protect, roundController.createRound);
router.patch('/:id', authController.protect, roundController.closeRound);

module.exports = router;
