const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  
  try {
    await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('SCRIPT_ERROR:', err);
  }
  
  await browser.close();
})();
