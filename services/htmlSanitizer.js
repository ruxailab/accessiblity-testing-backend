// services/htmlSanitizer.js
// HTML sanitization service for static snapshot generation

const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * Inline JavaScript event handlers to remove
 */
const INLINE_JS_ATTRIBUTES = [
    'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
    'onmousemove', 'onmouseout', 'onmouseenter', 'onmouseleave',
    'onkeydown', 'onkeypress', 'onkeyup',
    'onfocus', 'onblur', 'onchange', 'oninput', 'onsubmit', 'onreset',
    'onload', 'onerror', 'onabort', 'onunload', 'onbeforeunload',
    'onscroll', 'onresize', 'onhashchange', 'onpopstate',
    'ondrag', 'ondragstart', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondrop',
    'oncopy', 'oncut', 'onpaste',
    'ontouchstart', 'ontouchmove', 'ontouchend', 'ontouchcancel',
    'onanimationstart', 'onanimationend', 'onanimationiteration',
    'ontransitionend', 'onwheel', 'oncontextmenu'
];

/**
 * Tags to completely remove
 */
const REMOVE_TAGS = ['script', 'noscript'];

/**
 * Sanitizes HTML content for static snapshot display
 * @param {string} html - Raw HTML content
 * @param {string} baseUrl - Base URL for resolving relative URLs
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html, baseUrl, options = {}) {
    const {
        disableAnimations = true,
        freezeFixedElements = true,
        removeThirdPartyIframes = true
    } = options;

    const $ = cheerio.load(html, {
        decodeEntities: false,
        xmlMode: false
    });

    // Remove script and noscript tags
    REMOVE_TAGS.forEach(tag => {
        $(tag).remove();
    });

    // Remove inline JavaScript event handlers from all elements
    $('*').each((_, elem) => {
        const $elem = $(elem);
        INLINE_JS_ATTRIBUTES.forEach(attr => {
            $elem.removeAttr(attr);
        });
        // Remove javascript: protocol hrefs
        const href = $elem.attr('href');
        if (href && href.toLowerCase().startsWith('javascript:')) {
            $elem.attr('href', '#');
        }
    });

    // Disable form submissions
    $('form').attr('onsubmit', null).attr('action', '#');
    $('button[type="submit"], input[type="submit"]').attr('type', 'button');

    // Remove third-party iframes if enabled
    if (removeThirdPartyIframes) {
        const baseHostname = new URL(baseUrl).hostname;
        $('iframe').each((_, elem) => {
            const $iframe = $(elem);
            const src = $iframe.attr('src');
            if (src) {
                try {
                    const iframeUrl = new URL(src, baseUrl);
                    if (iframeUrl.hostname !== baseHostname) {
                        $iframe.remove();
                    }
                } catch {
                    // Invalid URL, remove iframe
                    $iframe.remove();
                }
            }
        });
    }

    // Rewrite relative URLs to absolute
    rewriteUrls($, baseUrl, 'a', 'href');
    rewriteUrls($, baseUrl, 'img', 'src');
    rewriteUrls($, baseUrl, 'img', 'srcset', true);
    rewriteUrls($, baseUrl, 'link', 'href');
    rewriteUrls($, baseUrl, 'source', 'src');
    rewriteUrls($, baseUrl, 'source', 'srcset', true);
    rewriteUrls($, baseUrl, 'video', 'src');
    rewriteUrls($, baseUrl, 'video', 'poster');
    rewriteUrls($, baseUrl, 'audio', 'src');
    rewriteUrls($, baseUrl, 'object', 'data');
    rewriteUrls($, baseUrl, 'embed', 'src');
    rewriteUrls($, baseUrl, 'track', 'src');

    // Rewrite background images in style attributes
    $('[style]').each((_, elem) => {
        const $elem = $(elem);
        let style = $elem.attr('style');
        if (style) {
            style = rewriteStyleUrls(style, baseUrl);
            $elem.attr('style', style);
        }
    });

    // Add CSS to disable animations if enabled
    if (disableAnimations) {
        const animationCss = `
            <style id="a11y-snapshot-disable-animations">
                *, *::before, *::after {
                    animation-duration: 0s !important;
                    animation-delay: 0s !important;
                    transition-duration: 0s !important;
                    transition-delay: 0s !important;
                }
            </style>
        `;
        $('head').append(animationCss);
    }

    // Freeze fixed/sticky elements if enabled
    if (freezeFixedElements) {
        const fixedCss = `
            <style id="a11y-snapshot-freeze-fixed">
                [style*="position: fixed"],
                [style*="position:fixed"],
                [style*="position: sticky"],
                [style*="position:sticky"] {
                    position: absolute !important;
                }
            </style>
        `;
        $('head').append(fixedCss);
    }

    // Add meta tag indicating this is a static snapshot
    $('head').prepend('<meta name="a11y-snapshot" content="static-visual-snapshot">');

    // Add base tag for any remaining relative URLs
    if ($('head base').length === 0) {
        $('head').prepend(`<base href="${baseUrl}">`);
    }

    return $.html();
}

/**
 * Rewrites relative URLs to absolute in specific elements/attributes
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {string} baseUrl - Base URL
 * @param {string} selector - CSS selector
 * @param {string} attribute - Attribute name
 * @param {boolean} isSrcset - Whether this is a srcset attribute
 */
function rewriteUrls($, baseUrl, selector, attribute, isSrcset = false) {
    $(selector).each((_, elem) => {
        const $elem = $(elem);
        const value = $elem.attr(attribute);
        
        if (!value) return;

        if (isSrcset) {
            // Handle srcset format: "url1 1x, url2 2x"
            const rewritten = value.split(',').map(entry => {
                const parts = entry.trim().split(/\s+/);
                if (parts.length >= 1) {
                    parts[0] = resolveUrl(parts[0], baseUrl);
                }
                return parts.join(' ');
            }).join(', ');
            $elem.attr(attribute, rewritten);
        } else {
            $elem.attr(attribute, resolveUrl(value, baseUrl));
        }
    });
}

/**
 * Resolves a potentially relative URL to absolute
 * @param {string} url - URL to resolve
 * @param {string} baseUrl - Base URL
 * @returns {string} Absolute URL
 */
function resolveUrl(url, baseUrl) {
    if (!url) return url;
    
    // Skip data URLs, javascript:, mailto:, tel:, etc.
    if (url.startsWith('data:') || 
        url.startsWith('javascript:') || 
        url.startsWith('mailto:') ||
        url.startsWith('tel:') ||
        url.startsWith('#') ||
        url.startsWith('//')) {
        return url;
    }

    try {
        return new URL(url, baseUrl).href;
    } catch {
        return url;
    }
}

/**
 * Rewrites URLs in CSS style strings
 * @param {string} style - CSS style string
 * @param {string} baseUrl - Base URL
 * @returns {string} Style with rewritten URLs
 */
function rewriteStyleUrls(style, baseUrl) {
    // Match url() in CSS
    const urlRegex = /url\(['"]?([^'")]+)['"]?\)/gi;
    
    return style.replace(urlRegex, (match, url) => {
        const resolved = resolveUrl(url.trim(), baseUrl);
        return `url("${resolved}")`;
    });
}

module.exports = {
    sanitizeHtml,
    resolveUrl,
    INLINE_JS_ATTRIBUTES,
    REMOVE_TAGS
};
