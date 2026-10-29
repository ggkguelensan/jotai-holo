import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const compiled = ts.transpileModule(
  await readFile(new URL('./force-layout.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
).outputText;
const { stepLayout } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

// Verify actual force semantics, including coincident starts and bounds.
const pair = [
  { id: 'a', x: 150, y: 150, vx: 0, vy: 0 },
  { id: 'b', x: 150, y: 150, vx: 0, vy: 0 },
];
for (let i = 0; i < 150; i++) stepLayout(pair, [], 300, 320);
assert.ok(Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) > 40);
const linked = [
  { id: 'a', x: 30, y: 30, vx: 0, vy: 0 },
  { id: 'b', x: 270, y: 290, vx: 0, vy: 0 },
];
for (let i = 0; i < 400; i++) stepLayout(linked, [{ from: 'a', to: 'b' }], 300, 320);
assert.ok(Math.hypot(linked[0].x - linked[1].x, linked[0].y - linked[1].y) < 180);
assert.ok(
  linked.every((p) => Number.isFinite(p.x) && p.x >= 28 && p.x <= 272 && p.y >= 28 && p.y <= 292),
);

const base = process.env.GRAPH_URL ?? 'http://127.0.0.1:5181';
await mkdir('.vercel/graph-check', { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/?mode=mini`);
  await page.waitForFunction(
    () => document.querySelector('.miniature')?.dataset.settled === 'true',
    { timeout: 14000 },
  );
  assert.equal(await page.locator('.mini-node').count(), 7);
  const theme = page.getByRole('button', { name: '$theme', exact: true });
  await theme.focus();
  assert.match(await page.locator('.article-highlight').innerText(), /export const \$theme/);
  await theme.press('Enter');
  await page.getByRole('button', { name: 'helpRequested', exact: true }).hover();
  assert.match(await page.locator('.article-highlight').innerText(), /export const \$theme/);
  await page.keyboard.press('Escape');
  await theme.hover();
  assert.match(await page.locator('.article-highlight').innerText(), /export const \$theme/);
  const before = await theme.getAttribute('transform');
  const bounds = await theme.boundingBox();
  assert.ok(bounds);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 - 50, bounds.y + bounds.height / 2 + 30, {
    steps: 8,
  });
  await page.mouse.up();
  assert.notEqual(await theme.getAttribute('transform'), before);
  await page.screenshot({ path: '.vercel/graph-check/mini-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Открыть полную карту' }).click();
  assert.equal(new URL(page.url()).searchParams.get('example'), 'atoms');
  await page.locator('.mini-node').first().waitFor();
  assert.equal(await page.locator('.mini-node').count(), 7);
  await page.screenshot({ path: '.vercel/graph-check/atoms-map.png', fullPage: true });
  await page.goto(`${base}/?mode=mini`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mini-hit').first().waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const hit = await page.locator('.mini-hit').first().boundingBox();
  assert.ok(hit && hit.width >= 44);
  await page.screenshot({ path: '.vercel/graph-check/mini-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector('.miniature')?.dataset.settled === 'true',
  );
  const still = await page.locator('.mini-node').first().getAttribute('transform');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.mini-node').first().getAttribute('transform'), still);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${base}/?mode=map`);
  const driver = page.locator('.test-driver');
  await page.waitForFunction(
    () => document.querySelector('.game-summary h3')?.textContent === 'Starfall',
  );
  await driver.getByRole('button', { name: 'Увеличить количество' }).click();
  await driver.getByRole('button', { name: 'Купить в подарок' }).click();
  await page.getByText('GIFT-1001 · $50').waitFor();
  assert.equal(await page.locator('.model-boundary.dormant').count(), 0, 'No empty analytics card');
  await page.getByRole('checkbox', { name: 'Ленивая аналитика' }).check();
  await page.locator('.analytics-toggle small.connected').waitFor();
  await driver.getByRole('button', { name: 'Купить в подарок' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.logs article').length === 2);
  await page.getByRole('checkbox', { name: 'Ленивая аналитика' }).uncheck();
  assert.equal(await page.locator('.node[aria-label="Amplitude adapter"]').count(), 0);
  await page.screenshot({ path: '.vercel/graph-check/map-desktop.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: repulsion, spring attraction, bounds, drag, settling, keyboard/source selection, matching expansion, mobile44px targets, reduced motion, map purchase and lazy analytics.',
  );
} finally {
  await browser.close();
}
