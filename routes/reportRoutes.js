// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');



// Run accessibility test -- frequently used
router.post('/test', reportController.runAccessibilityTest);

// New endpoint to generate and update modifiedHtml for a test by testId
router.post('/test/generate', reportController.generateModifiedHtmlForTest);


module.exports = router;
