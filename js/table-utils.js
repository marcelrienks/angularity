/**
 * Shared table utilities for dynamic HTML table generation.
 */

export function _th(row, text, extraClass = '') {
  const th = document.createElement('th');
  th.className = `sub-header${extraClass ? ' ' + extraClass : ''}`;
  th.textContent = text;
  row.appendChild(th);
  return th;
}
