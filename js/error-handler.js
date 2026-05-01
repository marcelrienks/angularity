/**
 * Error Handler: User-visible error notifications
 * 
 * Provides consistent error banner UI component that displays errors
 * to users instead of only logging to console.
 * 
 * Features:
 * - Fixed position banner with slide-in animation
 * - Auto-dismiss after configurable timeout
 * - Manual close button
 * - Non-blocking; doesn't prevent user interaction
 */

/**
 * Show error banner with message
 * 
 * Displays a fixed-position error banner at top-right of screen with message.
 * Banner auto-dismisses after timeout or on user close.
 * 
 * @param {string} message - Error message to display
 * @param {number} duration - Time in ms before auto-dismiss (default 5000)
 * 
 * @example
 * import { showErrorBanner } from './error-handler.js';
 * 
 * try {
 *   localStorage.setItem('data', JSON.stringify(obj));
 * } catch (err) {
 *   showErrorBanner('Failed to save data: ' + err.message);
 * }
 */
export function showErrorBanner(message, duration = 5000) {
  const banner = document.getElementById('error-banner');
  const messageEl = document.getElementById('error-message');
  const closeBtn = document.getElementById('error-close');
  
  if (!banner || !messageEl || !closeBtn) {
    console.error('Error banner elements not found in DOM');
    console.error('Error:', message);
    return;
  }
  
  messageEl.textContent = message;
  banner.style.display = 'flex';
  
  // Auto-dismiss after duration
  const timeout = setTimeout(() => {
    banner.style.display = 'none';
  }, duration);
  
  // Manual close button
  closeBtn.onclick = () => {
    clearTimeout(timeout);
    banner.style.display = 'none';
  };
  
  // Also log to console for debugging
  console.error('[Error Banner]', message);
}

/**
 * Hide error banner immediately
 */
export function hideErrorBanner() {
  const banner = document.getElementById('error-banner');
  if (banner) {
    banner.style.display = 'none';
  }
}

/**
 * Check if error banner is currently visible
 * 
 * @returns {boolean} True if banner is displayed
 */
export function isErrorBannerVisible() {
  const banner = document.getElementById('error-banner');
  return banner ? banner.style.display !== 'none' : false;
}
