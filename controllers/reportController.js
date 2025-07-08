// controllers/reportController.js
// Handles report-related business logic

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pa11y = require('pa11y');
const admin = require('firebase-admin');
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
    console.log("Test Started")
    try {
        const { url, testId } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        const results = await pa11y(url, {
            standard: 'WCAG2AA',
            includeNotices: true,
            includeWarnings: true,
            timeout: 50000,
            wait: 1000,
        });
        const { html, stylesheets } = await fetchFullWebpage(url);
        if (!html) return res.status(500).json({ error: 'Failed to fetch webpage' });
        const cssContent = await fetchAllCss(stylesheets);
        const modifiedHtml = generateModifiedHtml(html, results.issues, cssContent);
        const reportId = uuidv4();
        // fs.writeFileSync(path.join(reportsDir, `${reportId}.json`), JSON.stringify(report));
        // const modifiedHtmlPath = path.join(modifiedHtmlDir, `${reportId}.html`);
        // const screenshotPath = path.join(modifiedHtmlDir, `${reportId}-screenshot.png`);
        // await takeScreenshot(url, screenshotPath);
        // const report = {
        //     id: reportId,
        //     url,
        //     dateTime: new Date().toISOString(),
        //     issues: results.issues,
        //     modifiedHtml: modifiedHtml,
        //     documentTitle: results.documentTitle,
        //     pageUrl: results.pageUrl,
        // };
        const firebaseReport = {
            ReportId: testId,
            ReportUrl: url,
            ReportDateTime: new Date().toISOString(),
            ReportIssues: results.issues,
            ReportIssueCount: results.issues.length,
            ReportModifiedHtml: modifiedHtml,
            DocumentTitle: results.documentTitle
        };
        const reportRef = db.collection('report');
        await reportRef.add(firebaseReport);
        res.json({
            reportId,
            summary: {
                total: results.issues.length,
                errors: results.issues.filter(issue => issue.type === 'error').length,
                warnings: results.issues.filter(issue => issue.type === 'warning').length,
                notices: results.issues.filter(issue => issue.type === 'notice').length
            },
            modifiedHtml: modifiedHtml,
            modifiedHtmlPath: `/modified_html/${reportId}.html`,
            screenshotPath: `/modified_html/${reportId}-screenshot.png`
        });
    } catch (error) {
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
