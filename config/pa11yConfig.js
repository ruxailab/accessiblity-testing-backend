// config/pa11yConfig.js
// Centralized configuration for Pa11y and accessibility testing

module.exports = {
    standard: 'WCAG2AA',
    includeNotices: true,
    includeWarnings: true,
    timeout: 50000, // ms
    wait: 1000, // ms
    chromeLaunchConfig: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
};
