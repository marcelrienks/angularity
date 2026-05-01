export default {
  launch: {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-resources',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled',
      '--allow-file-access-from-files',
      '--disable-security-extension'
    ],
    timeout: 60000,
    ignoreDefaultArgs: ['--disable-extensions']
  },
  server: {
    command: 'node js/server.js',
    port: 8080,
    launchTimeout: 30000,
    debug: false
  }
};
