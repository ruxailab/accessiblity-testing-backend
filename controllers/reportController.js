// controllers/reportController.js
// Handles accessibility testing business logic

const pa11y = require('pa11y');
const pa11yConfig = require('../config/pa11yConfig');

// Flash accessibility test - runs test without storing in Firebase
exports.runAccessibilityTestFlash = async (req, res) => {
    // Start of flash accessibility test endpoint
    console.log("[runAccessibilityTestFlash] Flash Test Started");
    try {
        // Extract URL from request body
        const { url } = req.body;
        console.log(`[runAccessibilityTestFlash] Received request for URL: ${url}`);
        if (!url) {
            console.error('[runAccessibilityTestFlash] No URL provided');
            return res.status(400).json({
                success: false,
                message: 'URL is required',
                details: null
            });
        }

        // Run Pa11y accessibility test on the provided URL
        console.log('[runAccessibilityTestFlash] Running Pa11y accessibility test...');
        const results = await pa11y(url, {
            standard: pa11yConfig.standard,
            includeNotices: pa11yConfig.includeNotices,
            includeWarnings: pa11yConfig.includeWarnings,
            timeout: pa11yConfig.timeout,
            wait: pa11yConfig.wait,
            chromeLaunchConfig: pa11yConfig.chromeLaunchConfig
        });
        console.log(`[runAccessibilityTestFlash] Pa11y test completed. Issues found: ${results.issues.length}`);

        // Respond with test results directly (no Firebase storage)
        console.log('[runAccessibilityTestFlash] Sending response to client.');
        res.json({
            success: true,
            message: 'Flash accessibility test completed',
            url: url,
            testDateTime: new Date().toISOString(),
            issues: results.issues,
            issueCount: results.issues.length,
            documentTitle: results.documentTitle
        });
    } catch (error) {
        // Handle errors and send error response
        console.error('[runAccessibilityTestFlash] Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to run flash accessibility test',
            details: error.message
        });
    }
};
