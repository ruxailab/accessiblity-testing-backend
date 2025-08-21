// config/pa11yConfig.js
// Centralized configuration for Pa11y and accessibility testing

module.exports = {
    standard: 'WCAG2AA',
    includeNotices: true,
    includeWarnings: true,
    timeout: 50000, // ms
    wait: 1000, // ms,
    browser: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'
    },
    chromeLaunchConfig: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--headless'
        ]
    }
};
