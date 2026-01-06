// controllers/v3Controller.js
// V3 Accessibility Testing Controller with enhanced error handling

const { validateUrl } = require('../utils/urlValidator');
const { AccessibilityServiceV3, AccessibilityError } = require('../services/accessibilityServiceV3');
const { createRequestLogger, ErrorCodes, classifyError } = require('../services/logger');

/**
 * POST /api/v3/test
 * Run comprehensive accessibility test with visual snapshot
 */
exports.runAccessibilityTestV3 = async (req, res) => {
    const correlationId = req.correlationId || req.headers['x-correlation-id'] || generateCorrelationId();
    const logger = req.logger || createRequestLogger(correlationId);
    const startTime = Date.now();

    logger.info({ 
        event: 'v3_test_request_received',
        body: { url: req.body?.url }
    });

    try {
        // Step 1: Validate input
        const { url } = req.body;

        if (!url) {
            logger.warn({ event: 'validation_failed', reason: 'missing_url' });
            return res.status(400).json({
                error: {
                    code: ErrorCodes.INVALID_URL,
                    message: 'URL is required in request body'
                }
            });
        }

        const validation = validateUrl(url);
        if (!validation.valid) {
            logger.warn({ 
                event: 'validation_failed', 
                reason: 'invalid_url',
                detail: validation.error 
            });
            return res.status(400).json({
                error: {
                    code: ErrorCodes.INVALID_URL,
                    message: validation.error
                }
            });
        }

        const normalizedUrl = validation.normalizedUrl;
        logger.info({ event: 'validation_passed', url: normalizedUrl });

        // Step 2: Run accessibility test
        const service = new AccessibilityServiceV3(logger);
        const results = await service.runTest(normalizedUrl);

        // Step 3: Return successful response
        logger.info({ 
            event: 'v3_test_success',
            url: normalizedUrl,
            duration: Date.now() - startTime,
            issueCount: results.summary.total
        });

        return res.status(200).json(results);

    } catch (error) {
        return handleError(error, logger, res, startTime);
    }
};

/**
 * Handle errors and return appropriate response
 * @param {Error} error - The error
 * @param {object} logger - Logger instance
 * @param {object} res - Express response
 * @param {number} startTime - Request start time
 */
function handleError(error, logger, res, startTime) {
    const duration = Date.now() - startTime;

    // Determine error code and message
    let errorCode;
    let errorMessage;
    let statusCode;

    if (error instanceof AccessibilityError) {
        errorCode = error.code;
        errorMessage = error.message;
    } else {
        errorCode = classifyError(error);
        errorMessage = getErrorMessage(errorCode, error);
    }

    // Map error codes to HTTP status codes
    switch (errorCode) {
        case ErrorCodes.INVALID_URL:
            statusCode = 400;
            break;
        case ErrorCodes.PAGE_LOAD_TIMEOUT:
        case ErrorCodes.PAGE_LOAD_FAILED:
            statusCode = 502;
            break;
        case ErrorCodes.BROWSER_FAILURE:
        case ErrorCodes.AUDIT_FAILED:
            statusCode = 500;
            break;
        default:
            statusCode = 500;
            errorCode = ErrorCodes.INTERNAL_ERROR;
    }

    // Log error (with stack for server logs, not for response)
    logger.error({
        event: 'v3_test_error',
        errorCode: errorCode,
        errorMessage: errorMessage,
        duration: duration,
        stage: getFailureStage(errorCode),
        stack: error.stack // Server-side only
    });

    // Return error response (no stack trace to client)
    return res.status(statusCode).json({
        error: {
            code: errorCode,
            message: errorMessage
        }
    });
}

/**
 * Get user-friendly error message for error code
 * @param {string} code - Error code
 * @param {Error} error - Original error
 * @returns {string} User-friendly message
 */
function getErrorMessage(code, error) {
    switch (code) {
        case ErrorCodes.INVALID_URL:
            return 'The provided URL is invalid';
        case ErrorCodes.PAGE_LOAD_TIMEOUT:
            return 'The page did not load within 30 seconds';
        case ErrorCodes.PAGE_LOAD_FAILED:
            return 'Failed to load the page. Please check the URL is accessible.';
        case ErrorCodes.BROWSER_FAILURE:
            return 'Browser initialization failed. Please try again.';
        case ErrorCodes.AUDIT_FAILED:
            return 'Accessibility audit failed. Please try again.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}

/**
 * Get failure stage from error code
 * @param {string} code - Error code
 * @returns {string} Failure stage
 */
function getFailureStage(code) {
    switch (code) {
        case ErrorCodes.INVALID_URL:
            return 'validation';
        case ErrorCodes.PAGE_LOAD_TIMEOUT:
        case ErrorCodes.PAGE_LOAD_FAILED:
            return 'navigation';
        case ErrorCodes.BROWSER_FAILURE:
            return 'browser_init';
        case ErrorCodes.AUDIT_FAILED:
            return 'accessibility_scan';
        default:
            return 'unknown';
    }
}

/**
 * Generate a simple correlation ID
 * @returns {string} Correlation ID
 */
function generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Health check endpoint
 */
exports.healthCheck = async (req, res) => {
    return res.status(200).json({
        status: 'healthy',
        version: '3.0.0',
        timestamp: new Date().toISOString()
    });
};
