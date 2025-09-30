// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Flash accessibility test - no Firebase storage
router.post('/v2/test', reportController.runAccessibilityTestFlash);

module.exports = router;
