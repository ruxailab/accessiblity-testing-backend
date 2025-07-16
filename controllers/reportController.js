// controllers/reportController.js
// Handles report-related business logic

const pa11y = require('pa11y');
const FirebaseReport = require('../models/firebaseReport');
const { addReport, findReportByTestId, updateReport } = require('../utils/firebaseService');
const { fetchFullWebpage, fetchAllCss, generateModifiedHtml } = require('../utils/reportUtils');



exports.runAccessibilityTest = async (req, res) => {
    // Start of accessibility test endpoint
    console.log("[runAccessibilityTest] Test Started");
    try {
        // Extract URL and testId from request body
        const { url, testId } = req.body;
        console.log(`[runAccessibilityTest] Received request for URL: ${url}, testId: ${testId}`);
        if (!url) {
            console.error('[runAccessibilityTest] No URL provided');
            return res.status(400).json({ error: 'URL is required' });
        }

        // Run Pa11y accessibility test on the provided URL
        console.log('[runAccessibilityTest] Running Pa11y accessibility test...');
        const results = await pa11y(url, {
            standard: 'WCAG2AA',
            includeNotices: true,
            includeWarnings: true,
            timeout: 50000,
            wait: 1000,
        });
        console.log(`[runAccessibilityTest] Pa11y test completed. Issues found: ${results.issues.length}`);

        

        // Prepare and save the report using the model and service
        const firebaseReport = new FirebaseReport({
            ReportId: testId,
            ReportUrl: url,
            ReportDateTime: new Date().toISOString(),
            ReportIssues: results.issues,
            ReportIssueCount: results.issues.length,
            DocumentTitle: results.documentTitle
        });
        console.log('[runAccessibilityTest] Saving report to Firestore...');
        await addReport(firebaseReport);
        console.log('[runAccessibilityTest] Report saved to Firestore by Id:', firebaseReport.ReportId);

        // Respond with summary and modified HTML (not saved locally)
        console.log('[runAccessibilityTest] Sending response to client.');
        res.json({
            testId,
            summary: {
                total: results.issues.length,
                errors: results.issues.filter(issue => issue.type === 'error').length,
                warnings: results.issues.filter(issue => issue.type === 'warning').length,
                notices: results.issues.filter(issue => issue.type === 'notice').length
            },
        });
    } catch (error) {
        // Handle errors and send error response
        console.error('[runAccessibilityTest] Error:', error.message);
        res.status(500).json({
            error: 'Failed to run accessibility test',
            details: error.message
        });
    }
};


// Generate and update modifiedHtml for an existing test by testId
exports.generateModifiedHtmlForTest = async (req, res) => {
    try {
        const { testId } = req.body;
        if (!testId) {
            return res.status(400).json({ error: 'testId is required' });
        }
        console.log(`[generateModifiedHtmlForTest] Searching for Firestore document with testId: ${testId}`);



        // Search for the document with the given testId using the service
        const found = await findReportByTestId(testId);
        if (!found) {
            console.error('[generateModifiedHtmlForTest] No report found for testId:', testId);
            return res.status(404).json({ error: 'No report found for the given testId' });
        }
        const { doc, data: reportData } = found;
        const url = reportData.ReportUrl;
        if (!url) {
            return res.status(400).json({ error: 'No URL found in the report for this testId' });
        }
        console.log(`[generateModifiedHtmlForTest] Fetching and generating modified HTML for URL: ${url}`);

        // Fetch the fully rendered HTML and stylesheets
        const { html, stylesheets } = await fetchFullWebpage(url);
        if (!html) {
            return res.status(500).json({ error: 'Failed to fetch webpage' });
        }

        // Download all external CSS referenced by the page
        const cssContent = await fetchAllCss(stylesheets);

        // Generate modified HTML with accessibility highlights
        const modifiedHtml = generateModifiedHtml(html, reportData.ReportIssues, cssContent);

        // Update the Firestore document with the new modifiedHtml using the service
        await updateReport(doc.id, { ReportModifiedHtml: modifiedHtml });

        console.log(`[generateModifiedHtmlForTest] Updated Firestore document for testId: ${testId}`);
        res.json({
            success: true,
            message: 'modifiedHtml generated and updated successfully',
            testId,
            modifiedHtml
        });
    } catch (error) {
        console.error('[generateModifiedHtmlForTest] Error:', error.message);
        res.status(500).json({
            error: 'Failed to generate and update modifiedHtml',
            details: error.message
        });
    }
};
