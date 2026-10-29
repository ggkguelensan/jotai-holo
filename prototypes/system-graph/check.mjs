import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.GRAPH_URL ?? 'http://127.0.0.1:5181';
await mkdir('.vercel/graph-check', { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  for (const variant of [1, 2, 3]) {
    await page.goto(`${base}/?v=${variant}`);
    await page.locator('.checkout .buy').waitFor();
    await page.waitForFunction(
      () => document.querySelector('.game-summary h3')?.textContent === 'Starfall',
    );
    const increment = page
      .locator('.test-driver')
      .getByRole('button', { name: 'Увеличить количество' });
    const buy = page.locator('.test-driver .buy');
    await increment.click();
    assert.equal(
      await page
        .locator('.test-driver')
        .getByLabel('Количество копий', { exact: true })
        .textContent(),
      '2',
    );
    await buy.click();
    await page.getByText('GIFT-1001 · $50').waitFor();
    assert.equal(await page.locator('.logs article').count(), 0);
    await page.getByRole('checkbox', { name: 'Ленивая аналитика' }).check();
    await page.locator('.analytics-toggle small.connected').waitFor();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.logs article').count(), 0, 'No pre-import replay');
    await buy.click();
    await page.waitForFunction(() => document.querySelectorAll('.logs article').length === 2);
    assert.match(await page.locator('.logs').innerText(), /"total_cents": 5000/);
    await increment.click();
    if (variant === 3)
      assert.equal(
        await page
          .locator('.trace-steps [aria-current="step"]')
          .innerText()
          .then((text) => text.includes('Редактирование')),
        true,
      );
    const copiesNode = page.locator('.node[aria-label="$copies"]');
    await copiesNode.hover();
    assert.match(await page.locator('.selection-detail h2').innerText(), /\$copies/);
    assert.match(await page.locator('.code-selected').innerText(), /const \$copies/);
    await copiesNode.click();
    await page.locator('.node[aria-label="$total"]').hover();
    assert.match(await page.locator('.selection-detail h2').innerText(), /\$copies/);
    await page.keyboard.press('Escape');
    await page.locator('.node[aria-label="$total"]').hover();
    assert.match(await page.locator('.selection-detail h2').innerText(), /\$total/);
    await page.getByRole('checkbox', { name: 'Ленивая аналитика' }).uncheck();
    assert.equal(await page.locator('.node[aria-label="Amplitude adapter"]').count(), 0);
    await buy.click();
    await page.getByText('GIFT-1003 · $75').waitFor();
    assert.equal(
      await page.locator('.logs article').count(),
      2,
      'Last analytics owner disconnects',
    );
    await page.screenshot({ path: `.vercel/graph-check/desktop-${variant}.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    const bounds = await page.locator('.node-hit').first().boundingBox();
    assert.ok(bounds && bounds.width >= 44, `Touch target: ${bounds?.width}`);
    await page.screenshot({ path: `.vercel/graph-check/mobile-${variant}.png`, fullPage: true });
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
  await page.getByRole('textbox', { name: 'Email получателя' }).focus();
  await page.keyboard.press('1');
  assert.equal(new URL(page.url()).searchParams.get('v'), '3', 'Typing must not switch variant');
  await page.locator('.test-driver').getByRole('button', { name: 'Увеличить количество' }).focus();
  await page.keyboard.press('1');
  assert.equal(new URL(page.url()).searchParams.get('v'), '1');
  await page.locator('.test-driver').getByRole('button', { name: 'Увеличить количество' }).click();
  await page.keyboard.press('r');
  assert.equal(
    await page
      .locator('.test-driver')
      .getByLabel('Количество копий', { exact: true })
      .textContent(),
    '1',
    'Replay resets',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.locator('.node[aria-label="holo · Summary"]').focus();
  assert.match(await page.locator('.selection-detail h2').innerText(), /Summary/);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: 3 variants; shared state, purchases, mapping, lazy import, cleanup, source focus/pinning, mobile, keyboard, reduced motion.',
  );
} finally {
  await browser.close();
}
