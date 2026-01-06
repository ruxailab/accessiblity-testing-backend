// utils/urlValidator.js
// URL validation utility for accessibility testing API

const { URL } = require('url');
const net = require('net');

// Maximum URL length (2048 is a common browser limit)
const MAX_URL_LENGTH = 2048;

// Private IP ranges to block
const PRIVATE_IP_RANGES = [
    /^127\./,                         // 127.0.0.0/8 (localhost)
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,                    // 192.168.0.0/16
    /^169\.254\./,                    // 169.254.0.0/16 (link-local)
    /^0\./,                           // 0.0.0.0/8
    /^::1$/,                          // IPv6 localhost
    /^fe80:/i,                        // IPv6 link-local
    /^fc00:/i,                        // IPv6 unique local
    /^fd00:/i                         // IPv6 unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
    'localhost',
    'localhost.localdomain',
    '0.0.0.0',
    '::1',
    '[::1]'
];

/**
 * Validates a URL for the accessibility testing API
 * @param {string} url - The URL to validate
 * @returns {{ valid: boolean, error?: string, normalizedUrl?: string }}
 */
function validateUrl(url) {
    // Check if URL is provided
    if (!url || typeof url !== 'string') {
        return {
            valid: false,
            error: 'URL is required and must be a string'
        };
    }

    // Trim whitespace
    const trimmedUrl = url.trim();

    // Check URL length
    if (trimmedUrl.length > MAX_URL_LENGTH) {
        return {
            valid: false,
            error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`
        };
    }

    // Check for empty URL
    if (trimmedUrl.length === 0) {
        return {
            valid: false,
            error: 'URL cannot be empty'
        };
    }

    // Parse URL
    let parsedUrl;
    try {
        parsedUrl = new URL(trimmedUrl);
    } catch (e) {
        return {
            valid: false,
            error: 'Invalid URL format'
        };
    }

    // Enforce http/https protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
            valid: false,
            error: 'URL must use http or https protocol'
        };
    }

    // Check for blocked hostnames
    const hostname = parsedUrl.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
        return {
            valid: false,
            error: 'Localhost and local addresses are not allowed'
        };
    }

    // Check if hostname is an IP address and validate against private ranges
    if (net.isIP(hostname)) {
        for (const range of PRIVATE_IP_RANGES) {
            if (range.test(hostname)) {
                return {
                    valid: false,
                    error: 'Private IP addresses are not allowed'
                };
            }
        }
    }

    // Check for common localhost variations
    if (hostname.endsWith('.local') || hostname.endsWith('.localhost')) {
        return {
            valid: false,
            error: 'Local domain addresses are not allowed'
        };
    }

    // URL is valid
    return {
        valid: true,
        normalizedUrl: parsedUrl.href
    };
}

module.exports = {
    validateUrl,
    MAX_URL_LENGTH
};
