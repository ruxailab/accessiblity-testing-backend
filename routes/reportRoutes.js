// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Firestore test endpoint
router.get('/firebasetest', reportController.testFirestore);

// Run accessibility test
router.post('/test', reportController.runAccessibilityTest);

// Get all reports
router.get('/reports', reportController.getReports);

// Get report by ID
router.get('/reports/:id', reportController.getReportById);

module.exports = router;
