/**
 * Shared error/warning banner utilities.
 */

export function _showError(msg) {
  const el = document.getElementById('error-banner');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

export function _hideError() {
  const el = document.getElementById('error-banner');
  if (el) el.classList.remove('visible');
}

export function _showWarning(msg) {
  const el = document.getElementById('warning-banner');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

export function _hideWarning() {
  const el = document.getElementById('warning-banner');
  if (el) el.classList.remove('visible');
}
