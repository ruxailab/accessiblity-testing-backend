// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const v3Controller = require('../controllers/v3Controller');
const { loggerMiddleware } = require('../services/logger');

// Flash accessibility test - no Firebase storage (v2)
router.post('/v2/test', reportController.runAccessibilityTestFlash);

// V3 Accessibility test with visual snapshot
// Applies logger middleware for correlation ID and structured logging
router.post('/v3/test', loggerMiddleware, v3Controller.runAccessibilityTestV3);

// V3 Health check endpoint
router.get('/v3/health', v3Controller.healthCheck);

module.exports = router;
