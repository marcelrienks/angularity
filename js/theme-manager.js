const THEME_STORAGE_KEY = 'angularity-theme';
const VALID_THEMES = ['light', 'dark'];

export function initTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const theme = VALID_THEMES.includes(stored) ? stored : null;
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function setTheme(value) {
  if (!VALID_THEMES.includes(value)) return;
  localStorage.setItem(THEME_STORAGE_KEY, value);
  document.documentElement.setAttribute('data-theme', value);
}

export function buildConfigMenu() {
  const listItem = document.createElement('li');
  listItem.className = 'theme-config-item';

  const button = document.createElement('button');
  button.id = 'theme-toggle';
  button.className = 'theme-toggle';
  button.textContent = '⚙';
  button.setAttribute('aria-label', 'Theme configuration');

  const dropdown = document.createElement('div');
  dropdown.id = 'theme-dropdown';
  dropdown.className = 'theme-dropdown';

  const lightBtn = document.createElement('button');
  lightBtn.className = 'theme-option';
  lightBtn.textContent = 'Light';
  lightBtn.addEventListener('click', () => {
    setTheme('light');
    dropdown.classList.remove('visible');
  });

  const darkBtn = document.createElement('button');
  darkBtn.className = 'theme-option';
  darkBtn.textContent = 'Dark';
  darkBtn.addEventListener('click', () => {
    setTheme('dark');
    dropdown.classList.remove('visible');
  });

  dropdown.appendChild(lightBtn);
  dropdown.appendChild(darkBtn);

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('visible');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('visible');
  });

  listItem.appendChild(button);
  listItem.appendChild(dropdown);

  return listItem;
}
