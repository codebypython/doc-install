/**
 * Cookie consent dialog selectors for various websites
 * These selectors help identify and handle cookie consent dialogs
 */

// Common cookie consent dialog selectors
export const COOKIE_SELECTORS = [
    // Class-based selectors
    '[class*="cookie"]',
    '[class*="consent"]', 
    '[class*="gdpr"]',
    '[class*="privacy"]',
    '[class*="banner"]',
    '[class*="overlay"]',
    '[class*="modal"]',
    '[class*="popup"]',
    
    // ID-based selectors
    '[id*="cookie"]',
    '[id*="consent"]',
    '[id*="gdpr"]',
    '[id*="privacy"]',
    '[id*="banner"]',
    
    // Button selectors
    'button[class*="accept"]',
    'button[class*="agree"]',
    'button[class*="consent"]',
    'button[class*="cookie"]',
    'button[class*="allow"]',
    
    // Data attribute selectors
    '[data-testid*="cookie"]',
    '[data-testid*="consent"]',
    '[data-testid*="gdpr"]',
    '[data-testid*="privacy"]',
    
    // Role-based selectors
    '[role="dialog"]',
    '[role="alertdialog"]',
    '[role="banner"]'
]

// Text patterns that indicate cookie consent dialogs
export const COOKIE_TEXT_PATTERNS = [
    'cookie',
    'consent',
    'privacy',
    'gdpr',
    'accept',
    'agree',
    'allow',
    'continue',
    'ok',
    'understand',
    'acknowledge'
]

// Button text patterns for accepting cookies
export const ACCEPT_BUTTON_PATTERNS = [
    'accept',
    'agree',
    'allow',
    'continue',
    'ok',
    'understand',
    'acknowledge',
    'proceed',
    'got it',
    'i understand',
    'accept all',
    'accept cookies',
    'allow all',
    'agree to all'
]

// Button text patterns for rejecting cookies
export const REJECT_BUTTON_PATTERNS = [
    'reject',
    'decline',
    'deny',
    'refuse',
    'reject all',
    'decline all',
    'deny all',
    'reject non-essential',
    'essential only'
]
