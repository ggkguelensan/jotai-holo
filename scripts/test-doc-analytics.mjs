import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const base = process.env.DOCS_BASE || '/';
const origin = 'http://127.0.0.1:4184';
const server = spawn(
  process.execPath,
  [
    'node_modules/vitepress/bin/vitepress.js',
    'preview',
    'docs',
    '--host',
    '127.0.0.1',
    '--port',
    '4184',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Docs preview timeout.')), 15000);
    server.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Built site served')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  browser = await chromium.launch();
  for (const { locale, reference } of ['', 'ru/', 'de/', 'kk/'].flatMap((locale) =>
    ['createAnalytics', 'modelAnalytics'].map((reference) => ({ locale, reference })),
  )) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}${base}${locale}reference/${reference}`);
    assert.equal(await page.locator('.example-preview').count(), 0);
    await page.locator('.vp-doc a[href$="/overview/analytics"]').first().click();
    await page.waitForURL(`${origin}${base}${locale}overview/analytics`);
    const demo = page.locator('[data-demo="analytics"]');
    await demo.locator('input').waitFor();
    // Model analytics loads after commit; wait for that module before producing facts.
    await page.waitForFunction(() =>
      performance
        .getEntriesByType('resource')
        .some((entry) => /search\.analytics/.test(entry.name)),
    );
    const consolePane = demo.locator('.demo-analytics-console');
    const catalog = demo.locator('.demo-analytics-catalog');
    if (reference === 'createAnalytics') await catalog.locator('input').press('Enter');
    else await catalog.locator('button').first().click();
    await consolePane.locator('li').nth(1).waitFor();
    assert.equal(await consolePane.locator('li').count(), 2);
    assert.match(await consolePane.innerText(), /amplitude/);
    assert.match(await consolePane.innerText(), /warehouse/);
    assert.match(await consolePane.innerText(), /"items_found": 2/);
    await catalog.locator('li button').first().click();
    await consolePane.locator('li').nth(2).waitFor();
    assert.match(await consolePane.innerText(), /posthog/);
    assert.match(await consolePane.innerText(), /"product_id": "oak-desk"/);
    assert.equal(await catalog.locator('article').count(), 1);
    await page.evaluate(() => document.fonts.ready);
    const window = await demo.boundingBox();
    const panels = await demo.locator('.demo-analytics').boundingBox();
    assert.ok(Math.abs(window.width - panels.width) < 2, 'Panels must fill the live window.');
    const left = await catalog.boundingBox();
    const right = await consolePane.boundingBox();
    assert.ok(right.x >= left.x + left.width - 1, 'Console must be to the right.');
    if (locale === 'ru/' && reference === 'createAnalytics') {
      await demo
        .locator('..')
        .screenshot({ path: '.vercel/analytics-desktop.png', animations: 'disabled' });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileLeft = await catalog.boundingBox();
    const mobileRight = await consolePane.boundingBox();
    assert.ok(mobileRight.y >= mobileLeft.y + mobileLeft.height - 1);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
    if (locale === 'ru/' && reference === 'createAnalytics') {
      await demo
        .locator('..')
        .screenshot({ path: '.vercel/analytics-mobile.png', animations: 'disabled' });
    }
    await consolePane.locator('header button').click();
    assert.equal(await consolePane.locator('li').count(), 0);
    assert.equal(
      await catalog.locator('article').count(),
      1,
      'Clearing logs must not reset the catalog.',
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    'Analytics console: deliveries, engine mapping, clearing and responsive layout passed through both API links to one analytics overview in 4 locales.',
  );
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'close');
}
