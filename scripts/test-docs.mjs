import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { locales } from '../docs/.vitepress/i18n/locales.mjs';
import { loadCatalog } from '../docs/.vitepress/i18n/catalog.mjs';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';

// Test the generated production site, including its configured subpath.
const base = process.env.DOCS_BASE || '/';
// Own the server process directly: terminating a pnpm wrapper can leave its
// preview child and inherited output pipes alive on Linux, keeping CI open.
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
  await Promise.race([
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Docs preview did not start')), 15000);
      server.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('Built site served')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      server.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Preview exited: ${code}`));
      });
    }),
    once(server, 'error').then(([error]) => {
      throw error;
    }),
  ]);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:4179') && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  const origin = `http://127.0.0.1:4179${base}`;
  async function checkCodeLayout() {
    assert.equal(await page.locator('details.example-source').count(), 0);
    for (const block of await page.locator('.example-source pre').all()) {
      assert.ok(await block.isVisible());
      assert.ok(await block.evaluate((el) => el.scrollHeight <= el.clientHeight + 1));
    }
    const failures = await page.locator('.vp-doc pre').evaluateAll((blocks) => {
      return blocks.flatMap((block, index) => {
        if (block.scrollWidth > block.clientWidth + 1)
          return [`Code block ${index} overflows horizontally`];
        const code = block.querySelector('code');
        if (!code || innerWidth < 1280) return [];
        const style = getComputedStyle(code);
        const canvas = document.createElement('canvas').getContext('2d');
        canvas.font = `${style.fontSize} ${style.fontFamily}`;
        const available =
          code.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return available + 1 < canvas.measureText('0'.repeat(80)).width
          ? [`Code block ${index} has less than 80 columns of space`]
          : [];
      });
    });
    assert.deepEqual(failures, [], page.url());
  }

  // Visit every public reference page in every locale, not just the home shell.
  const references = (await readdir('docs/reference')).filter((name) => name.endsWith('.md'));
  for (const { code, prefix } of locales) {
    await page.goto(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}`);
    assert.equal(await page.locator('html').getAttribute('lang'), code);
    await page.locator('.example-preview input[type="number"]').waitFor();
    assert.ok(await page.locator(`.VPHero a[href$="${prefix}/guide/getting-started"]`).count());
    for (const file of references) {
      await page.goto(
        `${origin}${prefix.slice(1)}${prefix ? '/' : ''}reference/${file.slice(0, -3)}`,
      );
      assert.match(await page.locator('h1').innerText(), new RegExp(file.slice(0, -3)));
      assert.equal(await page.locator('html').getAttribute('lang'), code);
      assert.ok(await page.locator('.vp-doc a[href^="https://"]').count());
      assert.equal(await page.locator('.example-preview').count(), 0);
      assert.ok(await page.locator('#contract').count(), page.url());
      assert.ok(
        await page
          .locator('.vp-doc a[href*="/overview/"], .vp-doc a[href$="/guide/model-composition"]')
          .count(),
        `API page links to a conceptual overview: ${page.url()}`,
      );
      await checkCodeLayout();
      if (file === 'useImperativeHolo.md') {
        await page.goto(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}overview/holo`);
        const demo = page.locator('[data-demo="imperative"]');
        const catalog = await loadCatalog(code, 'ui');
        const label = (text) => catalog._(generateMessageId(text));
        await demo.getByRole('spinbutton').fill('2');
        await demo.getByRole('button', { name: label('Place order'), exact: true }).click();
        await demo.getByRole('heading', { name: '#1001', exact: true }).waitFor();
        assert.ok((await demo.innerText()).includes('$250.00'));
        await demo.getByRole('button', { name: label('Back to cart'), exact: true }).click();
        assert.equal(await demo.getByRole('spinbutton').inputValue(), '2');
      }
      if (file === 'createMutationModel.md') {
        await page.goto(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}overview/tanstack-query`);
        const demo = page.locator('[data-demo="mutation"]');
        const catalog = await loadCatalog(code, 'ui');
        const label = (text) => catalog._(generateMessageId(text));
        const save = demo.getByRole('button', { name: label('Save proposal'), exact: true });
        await demo.getByRole('spinbutton').fill('30');
        await save.click();
        await demo
          .getByRole('alert')
          .getByText(label('Discounts above 25% need approval.'))
          .waitFor();
        await demo.getByRole('spinbutton').fill('15');
        await save.click();
        await demo.getByText(`${label('Saved discount')}: 15%`, { exact: true }).waitFor();
        await demo.getByRole('button', { name: label('Clear feedback'), exact: true }).click();
        assert.equal(await demo.locator('output').innerText(), '');
      }
    }
    for (const name of (await readdir('docs/overview')).filter((file) => file.endsWith('.md'))) {
      await page.goto(
        `${origin}${prefix.slice(1)}${prefix ? '/' : ''}overview/${name === 'index.md' ? '' : name.slice(0, -3)}`,
      );
      assert.equal(await page.locator('html').getAttribute('lang'), code);
      await page.locator('h1').waitFor();
      const kinds = [];
      for (const preview of await page.locator('.example-preview').all()) {
        await preview.locator(':is(button, input)').first().waitFor();
        kinds.push(await preview.getAttribute('data-demo'));
      }
      assert.equal(kinds.length, new Set(kinds).size, `No repeated demo in ${page.url()}`);
      for (const link of await page.locator('.example-file').all()) {
        assert.match(
          await link.getAttribute('href'),
          /github\.com\/.+\/blob\/[a-f0-9]{40,64}\/examples\/docs\/.+\.tsx$/,
        );
      }
      await checkCodeLayout();
    }
    await page.goto(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}recipes/`);
    assert.ok(await page.locator('.vp-doc a[href$="/recipes/spreadsheet"]').count());
    await page.goto(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}recipes/spreadsheet`);
    const sheetUi = await loadCatalog(code, 'ui');
    const sheetLabel = (text) => sheetUi._(generateMessageId(text));
    const input = (address) => page.getByRole('textbox', { name: address, exact: true });
    await input('B1').fill('20');
    await input('B1').press('Enter');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'B2',
    );
    assert.equal((await input('D1').inputValue()).replace(/\D/g, ''), '1600');
    // Ignore grouping separators when comparing the displayed integer.
    assert.equal((await input('D5').inputValue()).replace(/\D/g, ''), '4840');
    await input('D1').click();
    const formula = page.getByRole('textbox', {
      name: sheetLabel('Formula for the selected cell'),
      exact: true,
    });
    assert.equal(await formula.inputValue(), '=B1*C1');
    await formula.fill('=B2*C2');
    await input('B1').fill('30');
    await input('B1').press('Enter');
    assert.equal((await input('D1').inputValue()).replace(/\D/g, ''), '2280');
    await input('D1').click();
    await input('D1').fill('=D1');
    await input('D1').press('Enter');
    assert.equal(await input('D1').inputValue(), '#CYCLE!');
    assert.equal(await input('D5').inputValue(), '#CYCLE!');
    await page.getByRole('button', { name: sheetLabel('Reset sheet'), exact: true }).click();
    assert.equal((await input('D5').inputValue()).replace(/\D/g, ''), '4136');
    await checkCodeLayout();
    await page.goto(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}guide/model-composition`);
    const docsCatalog = await loadCatalog(code, 'docs');
    assert.equal(
      (await page.locator('h1').innerText()).replace(/\u200b/g, '').trim(),
      docsCatalog._('Model composition'),
    );
    assert.ok((await page.locator('.vp-doc pre').count()) >= 6);
    assert.deepEqual(
      await page
        .locator('.vp-doc pre')
        .evaluateAll((blocks) =>
          blocks
            .filter((block) => block.scrollWidth > block.clientWidth + 1)
            .map((block) => block.innerText),
        ),
      [],
      'Composition examples fit without horizontal scrolling',
    );
    if (code === 'ru')
      await page.screenshot({
        path: '.vitest-attachments/docs-model-composition-ru.png',
        fullPage: true,
      });
    console.log(`${code}: ${references.length} reference routes passed.`);
  }
  await page.goto(`${origin}kk/compatibility`);
  const reportUi = await loadCatalog('kk', 'ui');
  await page
    .getByText(reportUi._('This engineering report is maintained in English.'), { exact: true })
    .waitFor();
  await page
    .getByRole('link', { name: reportUi._('Read the English report'), exact: true })
    .click();
  await page.waitForURL(`${origin}compatibility`);
  // Exercise actual model-backed controls on the shared overview pages.
  const demoPages = {
    ion: 'overview/jotai-operators',
    input: 'overview/holo',
    list: 'overview/lists-and-branches',
    bond: 'overview/bond',
    model: 'overview/models-and-registry',
    query: 'overview/tanstack-query',
    form: 'overview/react-hook-form',
  };
  async function openDemo(kind) {
    await page.goto(`${origin}${demoPages[kind]}`);
    const demo = page.locator(`[data-demo="${kind}"]`);
    await demo.locator(':is(button, input)').first().waitFor();
    return demo;
  }
  let live = await openDemo('ion');
  await live.getByRole('spinbutton', { name: 'Quantity' }).fill('4');
  await live.getByRole('checkbox').check();
  await live.getByText('$80.00', { exact: true }).waitFor();
  live = await openDemo('input');
  await live.getByRole('textbox').fill('react');
  await live.getByText('$query: react', { exact: true }).waitFor();
  await live.getByRole('checkbox').uncheck();
  await live.getByText('$query: react', { exact: true }).waitFor();
  await live.getByRole('textbox').fill('ignored while hidden');
  await live.getByText('$query: react', { exact: true }).waitFor();
  await live.getByRole('checkbox').check();
  await live.getByText('$query: ignored while hidden', { exact: true }).waitFor();
  live = await openDemo('list');
  await live.getByRole('checkbox').first().check();
  await live.getByRole('button', { name: 'Reverse rows' }).click();
  assert.equal(await live.getByRole('checkbox').last().isChecked(), true);
  live = await openDemo('bond');
  await live.getByRole('button', { name: 'Submit demo order' }).click();
  await live.getByText('Receipt for order #100', { exact: true }).waitFor();
  await live.getByRole('checkbox').uncheck();
  await live.getByRole('button', { name: 'Submit demo order' }).click();
  assert.match(await live.locator('output').innerText(), /#100/);
  live = await openDemo('model');
  await live.getByRole('button', { name: 'Add a seat', exact: true }).first().click();
  await live.locator('output').first().getByText('6', { exact: true }).waitFor();
  assert.equal(await live.locator('output').last().innerText(), '5');
  live = await openDemo('query');
  await live.getByText('Oak desk · $240', { exact: true }).waitFor();
  await live.getByRole('button', { name: 'Lamp', exact: true }).click();
  await live.getByText('Desk lamp · $45', { exact: true }).waitFor();
  live = await openDemo('form');
  await live.getByRole('button', { name: 'Save contact', exact: true }).first().click();
  await live.getByText('Enter a valid email', { exact: true }).waitFor();
  await live.locator('input').first().fill('ada@example.com');
  await live.getByRole('button', { name: 'Save contact', exact: true }).first().click();
  await live.getByText('Saved: ada@example.com', { exact: true }).waitFor();
  await live.locator('input').first().fill('ada@work.example');
  await live.locator('input').first().press('Enter');
  await live.getByText('Saved: ada@work.example', { exact: true }).waitFor();
  assert.equal(await live.locator('input').last().inputValue(), '');
  await page.screenshot({ path: '.vitest-attachments/docs-form-infrastructure.png' });
  // Client navigation disposes demos even when the next topic has other demos.
  await page.goto(`${origin}overview/holo`);
  const counter = page.locator('[data-demo="counter"]');
  await counter.getByRole('button', { name: 'Increment', exact: true }).click();
  await counter.locator('output').getByText('1', { exact: true }).waitFor();
  await page.locator('.VPSidebar a[href$="/overview/jotai-operators"]').click();
  await page.locator('[data-demo="prism"] input').waitFor();
  await page.locator('.VPSidebar a[href$="/overview/holo"]').click();
  await page.locator('[data-demo="counter"] output').getByText('0', { exact: true }).waitFor();
  // Locale navigation preserves the corresponding article.
  await page.goto(`${origin}reference/prism`);
  await page.locator('.VPNavBarTranslations button').click();
  await page.getByRole('link', { name: 'Русский', exact: true }).click();
  await page.waitForURL(`${origin}ru/reference/prism`);
  await page.getByRole('button', { name: 'Поиск', exact: true }).click();
  await page.locator('#localsearch-input').fill('profileSaved');
  await page.locator('.VPBadge').count();
  await page.waitForFunction(
    () => document.querySelectorAll('.VPLocalSearchBox .result').length > 0,
  );
  await page.keyboard.press('Escape');
  // Each language translates the chrome, search and real React form validation.
  for (const { code, label, prefix } of locales) {
    const ui = await loadCatalog(code, 'ui');
    const t = (message) =>
      ui._(Object.hasOwn(ui.messages, message) ? message : generateMessageId(message));
    await page.locator('.VPNavBarTranslations button').click();
    if (code !== (await page.locator('html').getAttribute('lang'))) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await page.waitForURL(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}reference/prism`);
    } else await page.keyboard.press('Escape');
    const contract = (await loadCatalog(code, 'docs'))._('Contract');
    await page.waitForFunction(
      ({ code, contract }) =>
        document.documentElement.lang === code &&
        document.querySelector('#contract')?.textContent?.includes(contract),
      { code, contract },
    );
    await page.getByRole('button', { name: t('Search'), exact: true }).click();
    await page.locator('#localsearch-input').fill('profileSaved');
    await page.waitForFunction(
      () => document.querySelectorAll('.VPLocalSearchBox .result').length > 0,
    );
    const hits = await page.locator('.VPLocalSearchBox .result').first().getAttribute('href');
    assert.ok(
      hits?.includes(`${prefix}/recipes/profile`) ||
        hits?.includes(`${prefix}/reference/eventAtom`) ||
        hits?.includes(`${prefix}/overview/jotai-operators`),
      `${code}: locale-specific search result: ${hits}`,
    );
    await page.keyboard.press('Escape');
    await page.goto(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}overview/react-hook-form`);
    await page
      .getByRole('button', { name: t('Save contact'), exact: true })
      .first()
      .click();
    await page.getByText(t('Enter a valid email'), { exact: true }).waitFor();
    await page.locator('.example-preview input').first().fill('locale@example.com');
    await page
      .getByRole('button', { name: t('Save contact'), exact: true })
      .first()
      .click();
    await page.getByText(`${t('Saved:')} locale@example.com`, { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${code}: mobile overflow`,
    );
    await page.screenshot({ path: `.vitest-attachments/docs-${code}-form.png` });
    await page.setViewportSize({ width: 1440, height: 1000 });
    // Return to the same article before the next language-menu transition.
    await page.goto(`${origin}${prefix.slice(1)}${prefix ? '/' : ''}reference/prism`);
  }
  // Capture the finished reference layout as a review artifact.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`${origin}ru/overview/jotai-operators`);
  await page.locator('[data-demo="ion"]').getByRole('spinbutton').fill('4');
  await page.locator('[data-demo="ion"]').getByRole('checkbox').check();
  await page.locator('[data-demo="ion"]').getByText('$80.00', { exact: true }).waitFor();
  await page.screenshot({ path: '.vitest-attachments/docs-reactuse-inspired.png' });
  // Mobile navigation and content remain within the viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}ru/guide/getting-started`);
  assert.ok(await page.getByRole('button', { name: 'Меню', exact: true }).isVisible());
  await checkCodeLayout();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(`${origin}ru/overview/jotai-operators`);
  await page.locator('[data-demo="ion"]').getByRole('spinbutton').waitFor();
  await checkCodeLayout();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(`${origin}ru/recipes/spreadsheet`);
  await page.getByRole('textbox', { name: 'B1', exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(`${origin}ru/overview/react-hook-form`);
  await page.locator('.example-preview input').first().waitFor();
  await checkCodeLayout();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log(
    `Docs browser smoke: ${references.length * locales.length} reference routes, live controls, teardown, four-language switching/search/validation and mobile layout passed (base ${base}).`,
  );
} finally {
  try {
    await browser?.close();
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      const closed = once(server, 'close');
      server.kill('SIGTERM');
      await closed;
    }
  }
}
