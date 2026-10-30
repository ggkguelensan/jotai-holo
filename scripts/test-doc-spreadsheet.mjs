import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';

const server = spawn(
  process.execPath,
  [
    'node_modules/vitepress/bin/vitepress.js',
    'preview',
    'docs',
    '--host',
    '127.0.0.1',
    '--port',
    '4194',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
const browserName = process.env.SPREADSHEET_BROWSER ?? 'chromium';
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview timeout')), 15_000);
    server.once('error', reject);
    server.stdout.on('data', (data) => {
      if (String(data).includes('Built site served')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  browser = await { chromium, firefox, webkit }[browserName].launch();
  for (const locale of ['', 'ru/', 'de/', 'kk/']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    try {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:4194/${locale}examples/spreadsheet`);
      const demo = page.locator('[data-demo="spreadsheet"]');
      const cell = (address) => demo.locator(`[data-address="${address}"]`);
      const value = async (address, expected) => {
        await cell(address).waitFor();
        await page.waitForFunction(
          ({ address, expected }) =>
            document.querySelector(`[data-demo="spreadsheet"] [data-address="${address}"]`)
              ?.value === expected,
          { address, expected },
        );
      };
      const edit = async (address, text) => {
        await cell(address).dblclick();
        await cell(address).fill(text);
        await cell(address).press('Enter');
      };
      const go = async (address) => {
        await demo.locator('.sheet-camera input').fill(address);
        await demo.locator('.sheet-camera form button').click();
      };
      const saved = () => demo.locator('.sheet-status[data-state="saved"]').waitFor();
      await value('B1', '12');
      assert.equal(await demo.locator('[data-address]').count(), 32);
      await edit('B1', '20');
      assert.equal((await cell('D1').inputValue()).replace(/\D/g, ''), '1600');
      await cell('B1').dblclick();
      await cell('B1').fill('99');
      await cell('B1').press('Escape');
      await value('B1', '20');

      // A selected right-edge cell stays in the same physical slot.
      await go('D5');
      await cell('D5').click();
      const before = await cell('D5').boundingBox();
      await cell('D5').press('ArrowRight');
      await cell('E5').waitFor();
      assert.equal(
        await cell('E5').evaluate((element) => document.activeElement === element),
        true,
      );
      const after = await cell('E5').boundingBox();
      assert.ok(Math.abs(before.x - after.x) < 1);
      assert.ok(Math.abs(before.y - after.y) < 1);
      await cell('E5').press('Tab');
      assert.equal(
        await cell('F5').evaluate((element) => document.activeElement === element),
        true,
      );
      await cell('F5').press('Shift+Tab');
      assert.equal(
        await cell('E5').evaluate((element) => document.activeElement === element),
        true,
      );

      await go('AA90');
      await edit('AA90', '9');
      await go('A1');
      await edit('A1', '=AA90*2');
      await value('A1', '18');
      assert.equal(await demo.locator('[data-address]').count(), 32);

      // Shrinking hides data; growing reveals it and repairs #REF!.
      const dimensions = demo.locator('.sheet-dimension input');
      await dimensions.nth(0).fill('4');
      await dimensions.nth(0).press('Enter');
      await value('A1', '#REF!');
      await dimensions.nth(0).fill('40');
      await dimensions.nth(0).press('Enter');
      await value('A1', '18');
      await dimensions.nth(0).fill('');
      assert.equal(await dimensions.nth(0).inputValue(), '');
      await dimensions.nth(0).fill('40');
      await dimensions.nth(0).press('Enter');

      await saved();
      await demo.locator('[data-sheet-id="scratch"]').click();
      await saved();
      await edit('A1', 'other sheet');
      await saved();
      await page.clock.install();
      await page.clock.fastForward(61_000);
      await demo.locator('[data-sheet-id="gifts"]').click();
      await value('A1', '18');
      await saved();
      await page.reload();
      await value('A1', '18');
      await demo.locator('[data-sheet-id="scratch"]').click();
      await value('A1', 'other sheet');

      // New sheets and their names survive a full browser reload.
      await demo.locator('.sheet-add').click();
      const rename = demo.locator('.sheet-tab > button:not([aria-pressed])');
      await rename.focus();
      await rename.press('Enter');
      await demo.locator('.sheet-tab input').fill('Library');
      await demo.locator('.sheet-tab input').press('Enter');
      await saved();
      await page.reload();
      await demo
        .locator('.sheet-tabs button[aria-pressed="true"]', { hasText: 'Library' })
        .waitFor();

      await page.setViewportSize({ width: 390, height: 844 });
      await go('A1');
      await page.waitForFunction(
        () => document.querySelectorAll('[data-demo="spreadsheet"] [data-address]').length === 16,
      );
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const viewportBox = await demo.locator('.sheet-viewport').boundingBox();
      const tableBox = await demo.locator('.sheet-table').boundingBox();
      const rightCell = await demo.locator('[data-address]').nth(1).boundingBox();
      assert.ok(tableBox.width <= viewportBox.width + 1);
      assert.ok(rightCell.x + rightCell.width <= viewportBox.x + viewportBox.width + 1);
      assert.deepEqual(errors, []);
      await context.tracing.stop();
      console.log(
        `Spreadsheet E2E: ${locale || 'en/'} editing, camera, persistence, tabs and mobile passed.`,
      );
    } catch (error) {
      await mkdir('.vercel', { recursive: true });
      const prefix = `.vercel/spreadsheet-${browserName}-${locale.replace('/', '') || 'en'}`;
      await page.screenshot({ path: `${prefix}.png`, fullPage: true }).catch(() => {});
      await context.tracing.stop({ path: `${prefix}.zip` }).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const closed = once(server, 'exit');
    server.kill('SIGTERM');
    await closed;
  }
}
