import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { locales } from '../docs/.vitepress/i18n/locales.mjs';
import { loadCatalog } from '../docs/.vitepress/i18n/catalog.mjs';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';
import { sourcePages } from './localize-docs.mjs';

// Exercise the built site, including localized routes and an optional hosting base.
const base = process.env.DOCS_BASE || '/';
const origin = `http://127.0.0.1:4179${base}`;
const server = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/vitepress/bin/vitepress.js', import.meta.url)),
    'preview',
    'docs',
    '--host',
    '127.0.0.1',
    '--port',
    '4179',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Docs preview timeout')), 15000);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Preview exited: ${code}`)));
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Built site served')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  const url = (prefix, route = '') => `${origin}${prefix ? prefix.slice(1) + '/' : ''}${route}`;
  async function layout() {
    const overflow = await page
      .locator('.vp-doc pre')
      .evaluateAll((blocks) =>
        blocks
          .filter((block) => block.scrollWidth > block.clientWidth + 1)
          .map((block) => block.innerText),
      );
    assert.deepEqual(overflow, [], page.url());
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      page.url(),
    );
    assert.equal(await page.locator('details.example-source').count(), 0);
    const narrow = await page
      .locator('.vp-doc div[class*="language-"] > pre')
      .evaluateAll((blocks) => {
        if (innerWidth < 1280) return [];
        const canvas = document.createElement('canvas').getContext('2d');
        return blocks.flatMap((block, index) => {
          const code = block.querySelector('code');
          if (!code || !canvas) return [];
          const style = getComputedStyle(code);
          canvas.font = `${style.fontSize} ${style.fontFamily}`;
          const available =
            code.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          return available + 1 < canvas.measureText('0'.repeat(80)).width ? [index] : [];
        });
      });
    assert.deepEqual(narrow, [], `Code reserves 80 columns: ${page.url()}`);
  }
  const pages = await sourcePages();
  let routes = 0;
  for (const { code, prefix } of locales) {
    const ui = await loadCatalog(code, 'ui');
    const label = (text) => ui._(Object.hasOwn(ui.messages, text) ? text : generateMessageId(text));
    for (const file of pages) {
      const route = file.replace(/(?:index)?\.md$/, '');
      await page.goto(url(prefix, route));
      const moved = (await readFile(`docs/${file}`, 'utf8')).match(/^redirect: (.+)$/m)?.[1];
      if (moved) await page.waitForURL(url(prefix, moved.slice(1)));
      assert.equal(await page.locator('html').getAttribute('lang'), code);
      if (file !== 'index.md') await page.locator('h1').waitFor();
      await layout();
      if (/^(topics|reference)\//.test(file))
        assert.equal(await page.locator('.example-preview').count(), 0, page.url());
      if (file.startsWith('examples/')) {
        for (const preview of await page.locator('.example-preview').all())
          await preview.locator(':is(button,input)').first().waitFor();
      }
      routes++;
    }
    // The five sections are separate; a topic sidebar has seven topics, not all APIs.
    await page.goto(url(prefix, 'topics/holo'));
    const nav = page.locator('.VPNavBarMenu > a');
    assert.equal(await nav.count(), 5);
    assert.deepEqual(
      await nav.evaluateAll((links) => links.map((a) => new URL(a.href).pathname)),
      ['/guide/getting-started', '/topics/', '/recipes/', '/reference/holo', '/examples/'].map(
        (path) => `${base.replace(/\/$/, '')}${prefix}${path}`,
      ),
    );
    assert.equal(await page.locator('.VPSidebar a[href*="/reference/"]').count(), 0);
    assert.equal(await page.locator('.VPSidebar a[href*="/topics/"]').count(), 7);
    await page.goto(url(prefix, 'overview/analytics'));
    await page.waitForURL(url(prefix, 'topics/analytics'));

    await page.goto(url(prefix, 'examples/gift-copies'));
    let demo = page.locator('[data-demo="ion"]');
    await demo.getByRole('spinbutton').fill('4');
    await demo.getByRole('checkbox').check();
    await demo.getByText('$80.00', { exact: true }).waitFor();

    await page.goto(url(prefix, 'examples/player-notifications'));
    demo = page.locator('[data-demo="form"]');
    await demo
      .getByRole('button', { name: label('Save preferences'), exact: true })
      .first()
      .click();
    await demo.getByText(label('Enter a valid email'), { exact: true }).waitFor();
    await demo.locator('input').first().fill('ada@example.com');
    await demo
      .getByRole('button', { name: label('Save preferences'), exact: true })
      .first()
      .click();
    await demo.getByText(`${label('Saved:')} ada@example.com`, { exact: true }).waitFor();
    assert.equal(await demo.locator('input').last().inputValue(), '');

    await page.goto(url(prefix, 'examples/game-catalog'));
    demo = page.locator('[data-demo="query"]');
    await demo.getByText(`${label('Starfall')} · $25`, { exact: true }).waitFor();
    await demo.getByRole('button', { name: label('Moon Harbor'), exact: true }).click();
    await demo.getByText(`${label('Moon Harbor')} · $15`, { exact: true }).waitFor();

    // Client navigation tears down live examples; returning starts a fresh store.
    await page.goto(url(prefix, 'examples/view-bindings'));
    demo = page.locator('[data-demo="counter"]');
    await demo.getByRole('button', { name: label('Increment'), exact: true }).click();
    await demo.locator('output').getByText('1', { exact: true }).waitFor();
    await page.locator('.VPSidebar a[href$="/examples/profile-fields"]').click();
    await page.locator('[data-demo="prism"] input').waitFor();
    await page.locator('.VPSidebar a[href$="/examples/view-bindings"]').click();
    await page.locator('[data-demo="counter"] output').getByText('0', { exact: true }).waitFor();

    await page.getByRole('button', { name: label('Search'), exact: true }).click();
    await page.locator('#localsearch-input').fill('profileSaved');
    await page.waitForFunction(
      () => document.querySelectorAll('.VPLocalSearchBox .result').length > 0,
    );
    const hit = await page.locator('.VPLocalSearchBox .result').first().getAttribute('href');
    assert.ok(hit?.startsWith(`${base.replace(/\/$/, '')}${prefix}/`), hit);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of [
      'guide/architecture',
      'topics/holo',
      'reference/holo',
      'recipes/',
      'examples/catalog-analytics',
    ]) {
      await page.goto(url(prefix, route));
      await layout();
    }
    await page.screenshot({
      path: `.vitest-attachments/docs-sections-${code}.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  // Keep interaction coverage when moving demos between documentation sections.
  async function openDemo(route, kind) {
    await page.goto(url('', `examples/${route}`));
    const demo = page.locator(`[data-demo="${kind}"]`);
    await demo.locator(':is(button,input)').first().waitFor();
    return demo;
  }
  let live = await openDemo('view-bindings', 'input');
  await live.getByRole('textbox').fill('react');
  await live.getByText('$query: react', { exact: true }).waitFor();
  await live.getByRole('checkbox').uncheck();
  await live.getByRole('textbox').fill('hidden');
  await live.getByText('$query: react', { exact: true }).waitFor();
  await live.getByRole('checkbox').check();
  await live.getByText('$query: hidden', { exact: true }).waitFor();

  live = await openDemo('lists-and-branches', 'list');
  await live.getByRole('checkbox').first().check();
  await live.getByRole('button', { name: 'Reverse wishlist', exact: true }).click();
  assert.equal(await live.getByRole('checkbox').last().isChecked(), true);

  live = await openDemo('order-confirmation', 'bond');
  await live.getByRole('button', { name: 'Buy gift copies', exact: true }).click();
  await live.getByText('Receipt for order #100', { exact: true }).waitFor();
  await live.getByRole('checkbox').uncheck();
  await live.getByRole('button', { name: 'Buy gift copies', exact: true }).click();
  assert.match(await live.locator('output').innerText(), /#100/);

  live = await openDemo('order-confirmation', 'imperative');
  await live.getByRole('spinbutton').fill('2');
  await live.getByRole('button', { name: 'Place order', exact: true }).click();
  await live.getByRole('heading', { name: '#1001', exact: true }).waitFor();
  assert.ok((await live.innerText()).includes('$50.00'));
  await live.getByRole('button', { name: 'Back to cart', exact: true }).click();
  assert.equal(await live.getByRole('spinbutton').inputValue(), '2');

  live = await openDemo('view-methods', 'imperative-focus');
  await live.getByRole('button').click();
  assert.equal(
    await live.getByRole('searchbox').evaluate((input) => document.activeElement === input),
    true,
  );
  live = page.locator('[data-demo="imperative-animation"]');
  await live.getByRole('button').click();
  assert.equal(await live.locator('output').evaluate((node) => node.getAnimations().length), 1);
  await page.locator('[data-demo="imperative-share"] button').waitFor();

  live = await openDemo('model-instances', 'model');
  await live.getByRole('button', { name: 'Add a gift copy', exact: true }).first().click();
  await live.locator('output').first().getByText('6', { exact: true }).waitFor();
  assert.equal(await live.locator('output').last().innerText(), '5');

  live = await openDemo('sale-campaign', 'mutation');
  await live.getByRole('spinbutton').fill('30');
  await live.getByRole('button', { name: 'Save campaign', exact: true }).click();
  await live
    .getByRole('alert')
    .getByText('Demo policy limits campaign discounts to 25%.')
    .waitFor();
  await live.getByRole('spinbutton').fill('15');
  await live.getByRole('button', { name: 'Save campaign', exact: true }).click();
  await live.getByText('Saved campaign discount: 15%', { exact: true }).waitFor();
  await live.getByRole('button', { name: 'Clear feedback', exact: true }).click();
  assert.equal(await live.locator('output').innerText(), '');

  live = await openDemo('spreadsheet', 'spreadsheet');
  const cell = (address) => live.getByRole('textbox', { name: address, exact: true });
  await cell('B1').fill('20');
  await cell('B1').press('Enter');
  assert.equal((await cell('D1').inputValue()).replace(/\D/g, ''), '1600');
  await cell('D1').click();
  await cell('D1').fill('=D1');
  await cell('D1').press('Enter');
  assert.equal(await cell('D1').inputValue(), '#CYCLE!');
  await live.getByRole('button', { name: 'Reset sheet', exact: true }).click();
  assert.equal((await cell('D5').inputValue()).replace(/\D/g, ''), '4136');

  // Language switching keeps the same example article.
  await page.goto(url('', 'examples/catalog-analytics'));
  await page.locator('.VPNavBarTranslations button').click();
  await page.getByRole('link', { name: 'Русский', exact: true }).click();
  await page.waitForURL(url('/ru', 'examples/catalog-analytics'));
  assert.deepEqual(errors, []);
  console.log(
    `Docs browser: ${routes} localized routes, five sections, redirects, search, live examples, teardown and mobile layout passed.`,
  );
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    const closed = once(server, 'close');
    server.kill('SIGTERM');
    await closed;
  }
}
