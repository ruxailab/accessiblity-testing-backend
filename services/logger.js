// services/logger.js
// Structured JSON logging service with correlation ID support

const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

// Create base logger instance
const baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label };
        }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
        service: 'accessibility-testing-api',
        version: '3.0.0'
    },
    // Redact sensitive fields
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token'],
        remove: true
    }
});

/**
 * Creates a child logger with a correlation ID
 * @param {string} [correlationId] - Optional correlation ID, generates new one if not provided
 * @returns {object} Child logger with correlation ID bound
 */
function createRequestLogger(correlationId = null) {
    const id = correlationId || uuidv4();
    return baseLogger.child({ correlationId: id });
}

/**
 * Generates a new correlation ID
 * @returns {string} UUID v4 correlation ID
 */
function generateCorrelationId() {
    return uuidv4();
}

/**
 * Express middleware to attach logger to request
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
function loggerMiddleware(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
    const startTime = Date.now();

    // Attach logger and correlation ID to request
    req.correlationId = correlationId;
    req.logger = createRequestLogger(correlationId);

    // Set correlation ID in response header
    res.setHeader('x-correlation-id', correlationId);

    // Log request start
    req.logger.info({
        event: 'request_start',
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent']
    });

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        req.logger.info({
            event: 'request_complete',
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: duration
        });
    });

    next();
}

/**
 * Error codes for the accessibility API
 */
const ErrorCodes = {
    INVALID_URL: 'INVALID_URL',
    PAGE_LOAD_TIMEOUT: 'PAGE_LOAD_TIMEOUT',
    PAGE_LOAD_FAILED: 'PAGE_LOAD_FAILED',
    BROWSER_FAILURE: 'BROWSER_FAILURE',
    AUDIT_FAILED: 'AUDIT_FAILED',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Maps error types to appropriate error codes
 * @param {Error} error - The error object
 * @returns {string} Error code
 */
function classifyError(error) {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('timeout') || message.includes('timed out')) {
        return ErrorCodes.PAGE_LOAD_TIMEOUT;
    }

    if (message.includes('net::err_') || 
        message.includes('dns') || 
        message.includes('ssl') ||
        message.includes('certificate') ||
        message.includes('failed to navigate')) {
        return ErrorCodes.PAGE_LOAD_FAILED;
    }

    if (message.includes('browser') || 
        message.includes('chromium') || 
        message.includes('puppeteer')) {
        return ErrorCodes.BROWSER_FAILURE;
    }

    if (message.includes('pa11y') || message.includes('axe')) {
        return ErrorCodes.AUDIT_FAILED;
    }

    return ErrorCodes.INTERNAL_ERROR;
}

module.exports = {
    logger: baseLogger,
    createRequestLogger,
    generateCorrelationId,
    loggerMiddleware,
    ErrorCodes,
    classifyError
};
