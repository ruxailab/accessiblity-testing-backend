// utils/reportUtils.js
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
// const path = require('path');
// const fs = require('fs');

// Fetch fully rendered webpage content with Puppeteer
async function fetchFullWebpage(url) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        const stylesheets = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            return links.map(link => link.href);
        });
        const html = await page.content();
        await browser.close();
        browser = null;
        return { html, stylesheets };
    } catch (error) {
        if (browser) await browser.close();
        return { html: null, stylesheets: [] };
    }
}

// Take a screenshot of the webpage
async function takeScreenshot(url, screenshotPath) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await browser.close();
        browser = null;
        return true;
    } catch (error) {
        if (browser) await browser.close();
        return false;
    }
}

// Fetch all CSS content
async function fetchAllCss(stylesheetUrls) {
    const cssContent = {};
    for (const url of stylesheetUrls) {
        try {
            const response = await axios.get(url);
            cssContent[url] = response.data;
        } catch (error) {}
    }
    return cssContent;
}

// Function to generate modified HTML with highlights and embedded CSS
function generateModifiedHtml(html, issues, cssContent) {
    const $ = cheerio.load(html);
    issues.forEach((issue, index) => {
        if (issue.selector) {
            try {
                const element = $(issue.selector);
                if (element.length > 0) {
                    const issueId = `issue-${index}`;
                    element.addClass('a11y-issue');
                    element.attr('data-issue-id', issueId);
                    element.attr('data-issue-type', issue.type);
                    element.attr('data-issue-code', issue.code);
                    element.attr('data-issue-message', issue.message);
                    element.css({
                        'border': issue.type === 'error' ? '2px dotted red' :
                            issue.type === 'warning' ? '2px dotted orange' : '2px dotted blue',
                        'position': 'relative'
                    });
                    const overlay = $(`<div class="a11y-issue-marker" data-issue-id="${issueId}">${index + 1}</div>`);
                    element.append(overlay);
                }
            } catch (error) {}
        }
    });
    if (!$('head').length) {
        if ($('html').length) {
            $('html').prepend('<head></head>');
        } else {
            $('body').before('<head></head>');
        }
    }
    let allCss = '\n/* Combined CSS */\n';
    for (const [url, content] of Object.entries(cssContent)) {
        allCss += `\n/* From: ${url} */\n${content}\n`;
    }
    allCss += `\n    /* Accessibility issue highlighting styles */\n    .a11y-issue-marker {\n      position: absolute;\n      top: -5px;\n      right: -5px;\n      background-color: red;\n      color: white;\n      border-radius: 50%;\n      width: 20px;\n      height: 20px;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      font-size: 12px;\n      z-index: 9999;\n      cursor: pointer;\n    }\n    .a11y-issue[data-issue-type="warning"] .a11y-issue-marker {\n      background-color: orange;\n    }\n    .a11y-issue[data-issue-type="notice"] .a11y-issue-marker {\n      background-color: blue;\n    }\n    .a11y-issue:hover::after {\n      content: attr(data-issue-message);\n      position: absolute;\n      top: 20px;\n      left: 0;\n      background: rgba(0, 0, 0, 0.8);\n      color: white;\n      padding: 5px 10px;\n      border-radius: 3px;\n      font-size: 14px;\n      z-index: 10000;\n      max-width: 300px;\n      white-space: normal;\n    }\n  `;
    $('head').append(`<style>${allCss}</style>`);
    $('body').append(`\n    <script>\n      document.addEventListener('DOMContentLoaded', function() {\n        const issues = document.querySelectorAll('.a11y-issue');\n        issues.forEach(issue => {\n          issue.addEventListener('click', function() {\n            const message = this.getAttribute('data-issue-message');\n            const code = this.getAttribute('data-issue-code');\n            const type = this.getAttribute('data-issue-type');\n            alert('Accessibility Issue:\\nType: ' + type.toUpperCase() + \\\n                  '\\nMessage: ' + message + \\\n                  '\\nCode: ' + code);\n          });\n        });\n      });\n    <\/script>\n  `);
    return $.html();
}

module.exports = {
    fetchFullWebpage,
    takeScreenshot,
    fetchAllCss,
    generateModifiedHtml
};
