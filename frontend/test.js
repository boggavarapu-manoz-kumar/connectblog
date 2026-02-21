import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => logs.push(`LOG: ${msg.text()}`));
    page.on('pageerror', error => logs.push(`ERROR: ${error.message}`));

    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 2000));

    // Click first post
    try {
        await page.click('a[href^="/posts/"]');
        await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
        logs.push(`SCRIPT ERROR: ${e.message}`);
    }

    fs.writeFileSync('browser_logs.txt', logs.join('\n'));
    await browser.close();
})();
