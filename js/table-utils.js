/**
 * Shared table utilities for dynamic HTML table generation.
 */

export function _th(row, text, extraClass = '', isHTML = false) {
  const th = document.createElement('th');
  th.className = `sub-header${extraClass ? ' ' + extraClass : ''}`;
  if (isHTML) {
    th.innerHTML = text;
  } else {
    th.textContent = text;
  }
  row.appendChild(th);
  return th;
}
