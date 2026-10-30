import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.DOCS_GRAPH_ORIGIN ?? 'http://127.0.0.1:4189';
const server = process.env.DOCS_GRAPH_ORIGIN
  ? undefined
  : spawn(
      process.execPath,
      [
        'node_modules/vitepress/bin/vitepress.js',
        'preview',
        'docs',
        '--host',
        '127.0.0.1',
        '--port',
        '4189',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
let browser;
try {
  if (server)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Docs preview timeout')), 15000);
      server.once('error', reject);
      server.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('Built site served')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const locale of ['', 'ru/', 'de/', 'kk/']) {
    for (const [article, scene, node, source] of [
      ['holo', 'holo-basics', '$name', 'export const $name'],
      ['atoms-and-models', 'shared-atoms', '$theme', 'export const $theme'],
      ['analytics', 'catalog-analytics', 'Warehouse', 'warehouse: (fact)'],
    ]) {
      await page.goto(`${origin}/${locale}topics/${article}`);
      const wrapper = page.locator(`.graph-example[data-graph-scene="${scene}"]`);
      await wrapper.locator('.graph-example-rail').scrollIntoViewIfNeeded();
      const circle = wrapper.getByRole('button', { name: node, exact: true });
      await circle.waitFor();
      await circle.focus();
      assert.match(
        await wrapper.locator('.graph-source-selected').innerText(),
        new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      );
      if (scene === 'shared-atoms') {
        const composition = wrapper
          .locator('[data-code-source] pre')
          .filter({ hasText: 'function ToolbarView' });
        assert.equal(await composition.count(), 1);
        assert.match(await composition.innerText(), /<ThemeControl\s*\/>/);
        assert.match(await composition.innerText(), /<Help\s*\/>/);
        await wrapper.getByRole('button', { name: 'ToolbarView', exact: true }).focus();
        assert.match(
          await wrapper.locator('.graph-source-selected').innerText(),
          /function ToolbarView/,
        );
        await circle.focus();
      }
      await circle.press('Enter');
      const open = wrapper.locator('.graph-example-sticky>header>a');
      const url = new URL(await open.getAttribute('href'), origin);
      assert.equal(url.searchParams.get('scene'), scene);
      assert.ok(url.searchParams.get('node'));
      await open.click();
      await page.locator('.graph-map').waitFor();
      assert.equal(new URL(page.url()).searchParams.get('scene'), scene);
      const selection = page.locator('.graph-map-source>header strong');
      assert.equal(await selection.innerText(), node);
      const mapped = page.locator(`.graph-map .mini-node[aria-label="${node}"]`);
      await mapped.waitFor();
      await mapped.dispatchEvent('click');
      await selection.hover();
      assert.equal(await selection.innerText(), node, 'Pointer selection must remain pinned');
      const selectedLine = page.locator('.graph-source-lines .graph-source-selected');
      assert.equal(await selectedLine.count(), 1);
      const back = await page.locator('.graph-back').getAttribute('href');
      assert.ok(back.includes(`/${locale}topics/`));
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
  // Generated source graphs are lazy-loaded beside ordinary snippets and keep
  // their exact displayed source when expanded into a full map.
  for (const locale of ['', 'ru/', 'de/', 'kk/']) {
    for (const article of ['guide/getting-started', 'reference/stateAtom']) {
      await page.goto(`${origin}/${locale}${article}`);
      const examples = page.locator('.graph-example[data-graph-scene^="code-"]');
      assert.ok(await examples.count(), `${locale}${article}: missing generated graphs`);
      for (const wrapper of await examples.all()) {
        await wrapper.locator('.graph-example-rail').scrollIntoViewIfNeeded();
        const circle = wrapper.locator('.mini-node').first();
        await circle.waitFor();
        await circle.focus();
        assert.ok(
          await wrapper.locator('.graph-source-selected').count(),
          `${locale}${article}: generated selection must highlight displayed source`,
        );
      }
      const wrapper = examples.first();
      const scene = await wrapper.getAttribute('data-graph-scene');
      const displayedCode = await wrapper.locator('pre').first().innerText();
      await wrapper.locator('.graph-example-sticky>header>a').click();
      await page.locator('.graph-map').waitFor();
      assert.equal(new URL(page.url()).searchParams.get('scene'), scene);
      const fullSource = await page.locator('.graph-source-lines').innerText();
      const firstCodeLine = displayedCode.split('\n').find((line) => line.trim());
      assert.ok(fullSource.includes(firstCodeLine));
      assert.ok(
        (await page.locator('.graph-back').getAttribute('href')).includes(`/${locale}${article}`),
      );
    }
  }
  for (const article of [
    'examples/game-catalog',
    'examples/player-notifications',
    'examples/view-bindings',
    'examples/view-methods',
    'examples/model-instances',
    'examples/profile-fields',
    'examples/gift-copies',
    'recipes/profile',
  ]) {
    await page.goto(`${origin}/${article}`);
    await page.mouse.move(0, 0);
    const examples = page.locator('.graph-example[data-graph-scene^="code-"]');
    assert.ok(await examples.count(), `${article}: missing generated graphs`);
    for (const wrapper of await examples.all()) {
      await wrapper.locator('.graph-example-rail').scrollIntoViewIfNeeded();
      await wrapper.locator('.mini-node').first().waitFor();
      const sceneId = await wrapper.getAttribute('data-graph-scene');
      const generated = JSON.parse(
        await readFile(
          new URL(`../docs/.vitepress/graph/.generated/${sceneId}.json`, import.meta.url),
          'utf8',
        ),
      );
      const circles = await wrapper.locator('.mini-node').all();
      for (const [index, circle] of circles.entries()) {
        await circle.focus();
        await wrapper.locator('.graph-source-selected').first().waitFor();
        assert.equal(
          await wrapper.locator('.graph-source-selected').count(),
          1,
          `${article}/${await circle.getAttribute('aria-label')}: one exact source line`,
        );
        const ref = generated.nodes[index].refs[0];
        await page
          .waitForFunction(
            ({ sceneId, file, anchor, occurrence }) => {
              const root = document.querySelector(`[data-graph-scene="${sceneId}"]`);
              const matches = [...root.querySelectorAll('[data-code-source] pre .line')].filter(
                (line) =>
                  line.closest('[data-code-source]').dataset.codeSource === file &&
                  line.textContent.includes(anchor),
              );
              return matches[occurrence ?? 0]?.classList.contains('graph-source-selected');
            },
            { ...ref, sceneId, file: generated.sources[ref.source].file },
          )
          .catch(async (error) => {
            throw new Error(
              `${article}/${sceneId}/${generated.nodes[index].label}: expected ${JSON.stringify(ref)}, selected ${await wrapper.locator('.graph-source-selected').allTextContents()}`,
              { cause: error },
            );
          });
      }
    }
  }
  // Code-to-node hovering must not scroll the code away from the pointer.
  await page.goto(`${origin}/examples/graph?scene=shared-atoms&node=theme`);
  await page.locator('.graph-source-lines [data-line]').first().waitFor();
  const viewBinding = page
    .locator('.graph-source-lines [data-line]')
    .filter({ hasText: 'view: ThemeView' });
  await viewBinding.scrollIntoViewIfNeeded();
  const codeScroll = await page.locator('.graph-source-lines').evaluate((node) => node.scrollTop);
  await viewBinding.hover();
  assert.equal(await page.locator('.graph-map-source>header strong').innerText(), 'ThemeView');
  assert.equal(
    await page.locator('.graph-source-lines').evaluate((node) => node.scrollTop),
    codeScroll,
  );
  await page.goto(`${origin}/examples/graph?scene=catalog-analytics&node=warehouse`);
  await page.locator('[data-demo="analytics"] button[type="submit"]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.docs-graph-group').length === 3);
  await page.evaluate(() => {
    window.__graphDeliveries = [];
    const root = document.querySelector('.graph-map-picture');
    const observer = new MutationObserver(() => {
      window.__graphDeliveries.push(
        [...root.querySelectorAll('.graph-active')].map((node) => node.getAttribute('aria-label')),
      );
    });
    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
    window.__graphObserver = observer;
  });
  await page.locator('[data-demo="analytics"] button[type="submit"]').click();
  await page.waitForFunction(() =>
    window.__graphDeliveries.some(
      (nodes) => nodes.includes('Amplitude') && nodes.includes('Warehouse'),
    ),
  );
  await page.evaluate(() => window.__graphObserver.disconnect());
  // Locale navigation must retain the same scene and selected node.
  await page.getByRole('button', { name: 'Warehouse', exact: true }).click();
  await page.locator('.VPNavBarTranslations button').hover();
  const ru = page.locator('.VPNavBarTranslations a[href^="/ru/examples/graph"]').first();
  await ru.hover();
  assert.equal(
    new URL(await ru.getAttribute('href'), origin).searchParams.get('scene'),
    'catalog-analytics',
  );
  await ru.click();
  await page.locator('.graph-map').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('scene'), 'catalog-analytics');
  assert.equal(new URL(page.url()).searchParams.get('node'), 'warehouse');
  await page.goto(`${origin}/ru/topics/atoms-and-models`);
  await page
    .locator('[data-graph-scene="shared-atoms"] .graph-example-rail')
    .scrollIntoViewIfNeeded();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mini-hit').first().waitFor();
  const hit = await page.locator('.mini-hit').first().boundingBox();
  assert.ok(hit && hit.width >= 44);
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const locale of ['', 'ru/', 'de/', 'kk/']) {
    await page.goto(`${origin}/${locale}examples/spreadsheet`);
    assert.equal(await page.locator('.graph-example').count(), 1);
    const system = page.locator('[data-graph-scene="spreadsheet-system"]');
    await page.locator('#shared-computations').scrollIntoViewIfNeeded();
    const rail = await system.locator('.graph-example-sticky').boundingBox();
    assert.ok(
      rail && rail.y >= 60 && rail.y < 200,
      'One system miniature stays alongside the article',
    );
    // Keyboard expansion keeps the pointer away from source-hover inspection.
    await page.mouse.move(0, 0);
    const expression = system.getByRole('button', { name: '$expression · ion', exact: true });
    await expression.waitFor();
    await expression.focus();
    await expression.press('Enter');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.graph-source-selected')].some((line) =>
        line.textContent.includes('const $expression = ion'),
      ),
    );
    const expand = system.locator('.graph-example-sticky>header>a');
    await expand.focus();
    await expand.press('Enter');
    await page.locator('.graph-map .docs-graph-group').nth(3).waitFor();
    assert.equal(await page.locator('.graph-map .docs-graph-group').count(), 4);
    assert.equal(
      await page.locator('.graph-map-source>header strong').innerText(),
      '$expression · ion',
    );
    await page.locator('.graph-back').click();
    await page.locator('.graph-example[data-graph-scene="spreadsheet-system"]').waitFor();
    assert.equal(await page.locator('.graph-example').count(), 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('[data-graph-scene="spreadsheet-system"] .docs-graph').waitFor();
  assert.equal(await page.locator('.graph-example').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '.vercel/spreadsheet-system-mobile.png', fullPage: true });
  await page.goto(`${origin}/examples/graph?scene=missing`);
  await page.getByText('The graph is unavailable. The example code remains readable.').waitFor();
  assert.equal(await page.locator('.docs-graph').count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'Documentation graphs: authored and generated scenes in 4 locales; source highlights, expansion, pinned inspection, mobile, theme, live deliveries and locale continuity passed.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
