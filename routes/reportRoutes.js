// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Firestore test endpoint
router.get('/firebasetest', reportController.testFirestore);

// Run accessibility test -- frequently used
router.post('/test', reportController.runAccessibilityTest);

// Get all reports
router.get('/reports', reportController.getReports);

// Get report by ID
router.get('/reports/:id', reportController.getReportById);

// New endpoint to generate and update modifiedHtml for a test by testId
router.post('/test/generate', reportController.generateModifiedHtmlForTest);

module.exports = router;
