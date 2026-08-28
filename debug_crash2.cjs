const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER_CONSOLE_ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  
  try {
    // Intercept API calls
    await page.route('**/api/v1/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ role: 'admin', email: 'admin@meledata.ng' })
      });
    });

    await page.route('**/api/v1/admin/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    // Go to the site to set localStorage
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('axis_token', 'mock_token');
    });

    // Go to admin
    console.log("Navigating to /admin...");
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Go to admin users
    console.log("Navigating to /admin/users...");
    await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
  } catch (err) {
    console.error('SCRIPT_ERROR:', err);
  }
  
  await browser.close();
})();
