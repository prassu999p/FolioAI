const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    const url = page.url();
    console.log(`📍 Current URL: ${url}`);
    
    // Take screenshot
    const screenshotPath = '/tmp/01-initial-page.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot: ${screenshotPath}`);
    
    // Check page content
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check for login form or dashboard
    const hasLoginForm = await page.locator('input[type="email"], input[name*="email"]').isVisible().catch(() => false);
    const hasDashboard = await page.locator('[role="main"], main').isVisible().catch(() => false);
    
    console.log(`🔐 Login form visible: ${hasLoginForm}`);
    console.log(`📊 Dashboard visible: ${hasDashboard}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
