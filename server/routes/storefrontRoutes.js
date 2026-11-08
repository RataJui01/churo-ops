const express = require('express');
const storefrontController = require('../controllers/storefrontController');

// The customer side of the storefront: no `protect` on purpose — customers
// order from their own phones without an account. What keeps this safe is in
// the controller: the store must be open to order, prices come from the
// database, and no customer's phone number is ever sent back.
const router = express.Router();

router.get('/menu', storefrontController.getMenu);
router.post('/orders', storefrontController.createOrder);
router.get('/orders/:id', storefrontController.getOrder);

module.exports = router;
