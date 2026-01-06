// services/accessibilityServiceV3.js
// Production-grade accessibility testing service with visual snapshot

const puppeteer = require('puppeteer');
const pa11y = require('pa11y');
const pa11yConfig = require('../config/pa11yConfig');
const { sanitizeHtml } = require('./htmlSanitizer');
const { ErrorCodes, classifyError } = require('./logger');

// Constants
const VIEWPORT = { width: 1366, height: 768 };
const NAVIGATION_TIMEOUT = 30000;
const MAX_SCAN_TIMEOUT = 45000;

// WCAG rule to criterion mapping (common rules)
const WCAG_MAPPINGS = {
    'image-alt': '1.1.1',
    'input-image-alt': '1.1.1',
    'area-alt': '1.1.1',
    'object-alt': '1.1.1',
    'svg-img-alt': '1.1.1',
    'role-img-alt': '1.1.1',
    'color-contrast': '1.4.3',
    'color-contrast-enhanced': '1.4.6',
    'link-name': '2.4.4',
    'button-name': '4.1.2',
    'form-field-multiple-labels': '1.3.1',
    'label': '1.3.1',
    'document-title': '2.4.2',
    'html-has-lang': '3.1.1',
    'html-lang-valid': '3.1.1',
    'meta-viewport': '1.4.4',
    'bypass': '2.4.1',
    'landmark-one-main': '1.3.1',
    'region': '1.3.1',
    'duplicate-id': '4.1.1',
    'duplicate-id-active': '4.1.1',
    'duplicate-id-aria': '4.1.1',
    'aria-allowed-attr': '4.1.2',
    'aria-hidden-body': '4.1.2',
    'aria-required-attr': '4.1.2',
    'aria-required-children': '4.1.2',
    'aria-required-parent': '4.1.2',
    'aria-roles': '4.1.2',
    'aria-valid-attr': '4.1.2',
    'aria-valid-attr-value': '4.1.2',
    'focus-order-semantics': '2.4.3',
    'tabindex': '2.4.3',
    'accesskeys': '2.4.1',
    'frame-title': '2.4.1',
    'heading-order': '1.3.1',
    'empty-heading': '1.3.1',
    'list': '1.3.1',
    'listitem': '1.3.1',
    'definition-list': '1.3.1',
    'dlitem': '1.3.1',
    'th-has-data-cells': '1.3.1',
    'td-headers-attr': '1.3.1',
    'autocomplete-valid': '1.3.5',
    'video-caption': '1.2.2',
    'audio-caption': '1.2.1',
    'blink': '2.2.2',
    'marquee': '2.2.2',
    'meta-refresh': '2.2.1',
    'meta-refresh-no-exceptions': '2.2.4',
    'image-redundant-alt': '1.1.1',
    'link-in-text-block': '1.4.1',
    'skip-link': '2.4.1',
    'target-size': '2.5.5',
    'focus-visible': '2.4.7'
};

/**
 * Main accessibility testing service
 */
class AccessibilityServiceV3 {
    constructor(logger) {
        this.logger = logger;
        this.browser = null;
        this.page = null;
    }

    /**
     * Run complete accessibility test pipeline
     * @param {string} url - URL to test
     * @returns {Promise<object>} Test results
     */
    async runTest(url) {
        const startTime = Date.now();
        let scanAbortTimeout;

        try {
            // Set global timeout guard
            scanAbortTimeout = setTimeout(() => {
                throw new Error('Maximum scan timeout exceeded');
            }, MAX_SCAN_TIMEOUT);

            this.logger.info({ event: 'test_start', url });

            // Step 1: Initialize browser
            await this.initializeBrowser();

            // Step 2: Render page
            const pageData = await this.renderPage(url);

            // Step 3: Run accessibility scan
            const pa11yResults = await this.runAccessibilityScan(url);

            // Step 4: Resolve visual locations
            const issuesWithVisuals = await this.resolveVisualLocations(pa11yResults.issues);

            // Step 5: Extract and sanitize snapshot
            const snapshot = await this.extractSnapshot(url, pageData.scrollHeight);

            // Step 6: Generate summary
            const summary = this.generateSummary(issuesWithVisuals);

            // Build response
            const response = {
                meta: {
                    url: url,
                    scanTime: new Date().toISOString(),
                    duration: Date.now() - startTime,
                    engine: {
                        accessibility: 'pa11y (axe-core)',
                        browser: 'puppeteer'
                    },
                    viewport: VIEWPORT
                },
                snapshot: snapshot,
                issues: issuesWithVisuals,
                summary: summary
            };

            this.logger.info({
                event: 'test_complete',
                url,
                duration: response.meta.duration,
                totalIssues: summary.total
            });

            return response;

        } finally {
            clearTimeout(scanAbortTimeout);
            await this.cleanup();
        }
    }

    /**
     * Initialize Puppeteer browser instance
     */
    async initializeBrowser() {
        this.logger.info({ event: 'browser_init_start' });

        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ],
                executablePath: pa11yConfig.chromeLaunchConfig?.executablePath || undefined
            });

            this.page = await this.browser.newPage();
            await this.page.setViewport(VIEWPORT);

            // Set user agent
            await this.page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 A11yTestBot/3.0'
            );

            this.logger.info({ event: 'browser_init_complete' });

        } catch (error) {
            this.logger.error({ 
                event: 'browser_init_failed', 
                error: error.message 
            });
            throw new AccessibilityError(
                ErrorCodes.BROWSER_FAILURE,
                'Failed to initialize browser',
                error
            );
        }
    }

    /**
     * Navigate to URL and render page
     * @param {string} url - URL to render
     * @returns {Promise<object>} Page data
     */
    async renderPage(url) {
        this.logger.info({ event: 'page_render_start', url });

        try {
            const response = await this.page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: NAVIGATION_TIMEOUT
            });

            // Check response status
            if (!response) {
                throw new Error('No response received from page');
            }

            const status = response.status();
            if (status >= 400) {
                throw new Error(`Page returned HTTP ${status}`);
            }

            // Get page dimensions
            const dimensions = await this.page.evaluate(() => ({
                scrollHeight: document.documentElement.scrollHeight,
                scrollWidth: document.documentElement.scrollWidth,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            }));

            this.logger.info({ 
                event: 'page_render_complete', 
                url,
                scrollHeight: dimensions.scrollHeight
            });

            return dimensions;

        } catch (error) {
            this.logger.error({ 
                event: 'page_render_failed', 
                url, 
                error: error.message 
            });

            const errorCode = classifyError(error);
            const message = errorCode === ErrorCodes.PAGE_LOAD_TIMEOUT
                ? 'The page did not load within 30 seconds'
                : `Failed to load page: ${error.message}`;

            throw new AccessibilityError(errorCode, message, error);
        }
    }

    /**
     * Run pa11y accessibility scan
     * @param {string} url - URL to scan
     * @returns {Promise<object>} Pa11y results
     */
    async runAccessibilityScan(url) {
        this.logger.info({ event: 'accessibility_scan_start', url });

        try {
            const results = await pa11y(url, {
                standard: 'WCAG2AA',
                runners: ['axe'],
                includeNotices: false,
                includeWarnings: true,
                timeout: NAVIGATION_TIMEOUT,
                wait: 1000,
                browser: this.browser,
                page: this.page,
                chromeLaunchConfig: pa11yConfig.chromeLaunchConfig
            });

            this.logger.info({ 
                event: 'accessibility_scan_complete', 
                url,
                issueCount: results.issues?.length || 0
            });

            return results;

        } catch (error) {
            this.logger.error({ 
                event: 'accessibility_scan_failed', 
                url, 
                error: error.message 
            });
            throw new AccessibilityError(
                ErrorCodes.AUDIT_FAILED,
                'Accessibility audit failed',
                error
            );
        }
    }

    /**
     * Resolve visual locations for each issue
     * @param {Array} issues - Pa11y issues
     * @returns {Promise<Array>} Issues with visual metadata
     */
    async resolveVisualLocations(issues) {
        this.logger.info({ event: 'visual_resolution_start', count: issues.length });

        const resolvedIssues = [];
        let issueCounter = 1;

        for (const issue of issues) {
            const resolvedIssue = {
                id: `a11y-${String(issueCounter).padStart(3, '0')}`,
                rule: this.extractRuleCode(issue.code),
                message: issue.message,
                impact: this.normalizeImpact(issue.type, issue.typeCode),
                wcag: this.getWcagReference(issue.code),
                selector: issue.selector || null,
                xpath: null, // Can be computed if needed
                context: issue.context || null,
                boundingBox: null,
                visualizable: false
            };

            // Try to get bounding box for selector
            if (issue.selector) {
                try {
                    const boundingBox = await this.getBoundingBox(issue.selector);
                    if (boundingBox) {
                        resolvedIssue.boundingBox = boundingBox;
                        resolvedIssue.visualizable = true;
                    }
                } catch (error) {
                    this.logger.debug({ 
                        event: 'bounding_box_failed', 
                        selector: issue.selector,
                        error: error.message 
                    });
                }
            }

            resolvedIssues.push(resolvedIssue);
            issueCounter++;
        }

        this.logger.info({ 
            event: 'visual_resolution_complete',
            total: resolvedIssues.length,
            visualizable: resolvedIssues.filter(i => i.visualizable).length
        });

        return resolvedIssues;
    }

    /**
     * Get bounding box for a CSS selector
     * @param {string} selector - CSS selector
     * @returns {Promise<object|null>} Bounding box or null
     */
    async getBoundingBox(selector) {
        try {
            const element = await this.page.$(selector);
            if (!element) {
                return null;
            }

            const box = await element.boundingBox();
            if (!box) {
                return null;
            }

            // Round values for cleaner output
            return {
                x: Math.round(box.x),
                y: Math.round(box.y),
                width: Math.round(box.width),
                height: Math.round(box.height)
            };

        } catch {
            return null;
        }
    }

    /**
     * Extract and sanitize page snapshot
     * @param {string} url - Page URL
     * @param {number} scrollHeight - Page scroll height
     * @returns {Promise<object>} Snapshot data
     */
    async extractSnapshot(url, scrollHeight) {
        this.logger.info({ event: 'snapshot_extraction_start' });

        try {
            const html = await this.page.content();
            const sanitizedHtml = sanitizeHtml(html, url, {
                disableAnimations: true,
                freezeFixedElements: true,
                removeThirdPartyIframes: true
            });

            this.logger.info({ 
                event: 'snapshot_extraction_complete',
                originalSize: html.length,
                sanitizedSize: sanitizedHtml.length
            });

            return {
                html: sanitizedHtml,
                scrollHeight: scrollHeight,
                note: 'Static visual snapshot captured at scan time. JavaScript disabled.'
            };

        } catch (error) {
            this.logger.error({ 
                event: 'snapshot_extraction_failed', 
                error: error.message 
            });
            throw new AccessibilityError(
                ErrorCodes.INTERNAL_ERROR,
                'Failed to extract page snapshot',
                error
            );
        }
    }

    /**
     * Generate summary statistics
     * @param {Array} issues - Resolved issues
     * @returns {object} Summary object
     */
    generateSummary(issues) {
        const summary = {
            total: issues.length,
            critical: 0,
            serious: 0,
            moderate: 0,
            minor: 0,
            visualizable: 0,
            nonVisual: 0
        };

        for (const issue of issues) {
            // Count by impact
            switch (issue.impact) {
                case 'critical':
                    summary.critical++;
                    break;
                case 'serious':
                    summary.serious++;
                    break;
                case 'moderate':
                    summary.moderate++;
                    break;
                case 'minor':
                    summary.minor++;
                    break;
            }

            // Count visualizable
            if (issue.visualizable) {
                summary.visualizable++;
            } else {
                summary.nonVisual++;
            }
        }

        return summary;
    }

    /**
     * Extract rule code from pa11y code
     * @param {string} code - Pa11y issue code
     * @returns {string} Rule code
     */
    extractRuleCode(code) {
        if (!code) return 'unknown';
        
        // Pa11y codes often look like: "WCAG2AA.Principle1.Guideline1_1.1_1_1.H37"
        // or axe codes like: "image-alt"
        const parts = code.split('.');
        return parts[parts.length - 1] || code;
    }

    /**
     * Normalize impact level
     * @param {string} type - Pa11y type (error, warning, notice)
     * @param {number} typeCode - Pa11y type code
     * @returns {string} Normalized impact
     */
    normalizeImpact(type, typeCode) {
        // Pa11y type codes: 1 = error, 2 = warning, 3 = notice
        switch (typeCode || type) {
            case 1:
            case 'error':
                return 'critical';
            case 2:
            case 'warning':
                return 'serious';
            case 3:
            case 'notice':
                return 'moderate';
            default:
                return 'minor';
        }
    }

    /**
     * Get WCAG reference for a rule
     * @param {string} code - Rule code
     * @returns {string|null} WCAG criterion
     */
    getWcagReference(code) {
        if (!code) return null;

        // Try direct mapping
        const ruleCode = this.extractRuleCode(code).toLowerCase();
        if (WCAG_MAPPINGS[ruleCode]) {
            return WCAG_MAPPINGS[ruleCode];
        }

        // Try to extract from pa11y code format
        // e.g., "WCAG2AA.Principle1.Guideline1_1.1_1_1.H37"
        const wcagMatch = code.match(/(\d+)_(\d+)_(\d+)/);
        if (wcagMatch) {
            return `${wcagMatch[1]}.${wcagMatch[2]}.${wcagMatch[3]}`;
        }

        return null;
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        this.logger.info({ event: 'cleanup_start' });

        try {
            if (this.page) {
                await this.page.close().catch(() => {});
                this.page = null;
            }

            if (this.browser) {
                await this.browser.close().catch(() => {});
                this.browser = null;
            }

            this.logger.info({ event: 'cleanup_complete' });

        } catch (error) {
            this.logger.warn({ 
                event: 'cleanup_failed', 
                error: error.message 
            });
        }
    }
}

/**
 * Custom error class for accessibility testing
 */
class AccessibilityError extends Error {
    constructor(code, message, originalError = null) {
        super(message);
        this.name = 'AccessibilityError';
        this.code = code;
        this.originalError = originalError;
    }
}

module.exports = {
    AccessibilityServiceV3,
    AccessibilityError,
    VIEWPORT,
    NAVIGATION_TIMEOUT,
    MAX_SCAN_TIMEOUT
};
