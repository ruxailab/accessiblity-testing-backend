// controllers/reportController.js
// Handles report-related business logic

const path = require('path');
const fs = require('fs');
const pa11y = require('pa11y');
const admin = require('firebase-admin');
const htmlReporter = require('pa11y/lib/reporters/html');
const { fetchFullWebpage, fetchAllCss, generateModifiedHtml, takeScreenshot } = require('../utils/reportUtils');

const db = admin.firestore();

const reportsDir = path.join(__dirname, '../reports');
const modifiedHtmlDir = path.join(__dirname, '../modified_html');

exports.testFirestore = async (req, res) => {
    try {
        const reportRef = db.collection('report');
        const testData = {
            data: "hello world",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await reportRef.add(testData);
        res.json({
            success: true,
            message: 'Document added to Firestore',
            documentId: docRef.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add document to Firestore',
            error: error.message
        });
    }
};

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

        
        // Prepare the report object for Firestore
        const firebaseReport = {
            ReportId: testId,
            ReportUrl: url,
            ReportDateTime: new Date().toISOString(),
            ReportIssues: results.issues,
            ReportIssueCount: results.issues.length,
            DocumentTitle: results.documentTitle
        };

        // Save the report to Firestore
        console.log('[runAccessibilityTest] Saving report to Firestore...');
        const reportRef = db.collection('report');
        await reportRef.add(firebaseReport);
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

exports.getReports = (req, res) => {
    try {
        const files = fs.readdirSync(reportsDir);
        const reports = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const data = JSON.parse(fs.readFileSync(path.join(reportsDir, file)));
                return {
                    id: data.id,
                    url: data.url,
                    dateTime: data.dateTime,
                    summary: {
                        total: data.issues.length,
                        errors: data.issues.filter(issue => issue.type === 'error').length,
                        warnings: data.issues.filter(issue => issue.type === 'warning').length,
                        notices: data.issues.filter(issue => issue.type === 'notice').length
                    },
                    modifiedHtmlPath: data.modifiedHtmlPath,
                    screenshotPath: data.screenshotPath
                };
            });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

exports.getReportById = (req, res) => {
    try {
        const { id } = req.params;
        const reportPath = path.join(reportsDir, `${id}.json`);
        if (!fs.existsSync(reportPath)) return res.status(404).json({ error: 'Report not found' });
        const report = JSON.parse(fs.readFileSync(reportPath));
        const modifiedHtmlPath = path.join(modifiedHtmlDir, `${id}.html`);
        if (fs.existsSync(modifiedHtmlPath)) {
            report.modifiedHtml = fs.readFileSync(modifiedHtmlPath, 'utf8');
        }
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch report' });
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


        // Search for the document with the given testId
        const snapshot = await db.collection('report').where('ReportId', '==', testId).get();
        if (snapshot.empty) {
            console.error('[generateModifiedHtmlForTest] No report found for testId:', testId);
            return res.status(404).json({ error: 'No report found for the given testId' });
        }


        //  only one document per testId
        const doc = snapshot.docs[0];
        const reportData = doc.data();
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

        // Update the Firestore document with the new modifiedHtml
        await db.collection('report').doc(doc.id).update({
            ReportModifiedHtml: modifiedHtml
        });

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
