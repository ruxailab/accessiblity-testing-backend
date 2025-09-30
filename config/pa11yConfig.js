

const os = require('os');
const fs = require('fs');

//  finding Chrome executable path based on OS
function getChromeExecutablePath() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const platform = os.platform();
    
    if (platform === 'win32') {
        // Windows Chrome paths
        const windowsPaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
        ];
        
        for (const path of windowsPaths) {
            if (fs.existsSync(path)) {
                return path;
            }
        }
    } else if (platform === 'darwin') {
        // macOS
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else {
        // Linux
        return '/usr/bin/google-chrome-stable';
    }
    
    // Fallback - let Puppeteer find Chrome
    return undefined;
}

module.exports = {
    standard: 'WCAG2AA',
    includeNotices: true,
    includeWarnings: true,
    timeout: 50000, // ms
    wait: 1000, // ms,
    browser: {
        executablePath: getChromeExecutablePath()
    },
    chromeLaunchConfig: {
        executablePath: getChromeExecutablePath(),
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
