import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Test the generated production site, including its configured subpath.
const base = process.env.DOCS_BASE || '/';
const server = spawn('pnpm', ['docs:preview', '--host', '127.0.0.1', '--port', '4179'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
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
  // Visit every public reference page in both locales, not just the home shell.
  const references = (await readdir('docs/reference')).filter((name) => name.endsWith('.md'));
  for (const locale of ['', 'ru/']) {
    for (const file of references) {
      await page.goto(`${origin}${locale}reference/${file.slice(0, -3)}`);
      assert.match(await page.locator('h1').innerText(), new RegExp(file.slice(0, -3)));
      assert.equal(await page.locator('html').getAttribute('lang'), locale ? 'ru' : 'en');
      assert.ok(await page.locator('.vp-doc a[href^="https://"]').count());
      await page.locator('.example-preview :is(button, input)').first().waitFor();
      assert.equal(await page.locator('.example-preview').count(), 1);
    }
  }
  // Exercise the actual library-backed controls, not just the Vue page shell.
  await page.goto(`${origin}reference/ion`);
  await page.getByRole('spinbutton', { name: 'Quantity' }).fill('4');
  await page.getByRole('checkbox').check();
  await page.getByText('$80.00', { exact: true }).waitFor();
  await page.goto(`${origin}reference/subscribeEvent`);
  await page.getByRole('button', { name: 'Receive message' }).click();
  await page.getByRole('button', { name: 'Receive message' }).click();
  await page.getByText('Deliveries: 2 · Hello, Jotai!', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Unsubscribe', exact: true }).click();
  await page.getByRole('button', { name: 'Receive message' }).click();
  assert.match(await page.locator('.example-preview output').innerText(), /Deliveries: 2/);
  await page.goto(`${origin}reference/cage`);
  await page.getByRole('textbox').fill('react');
  await page.getByText('mounted · $query: react', { exact: true }).waitFor();
  await page.getByRole('checkbox').uncheck();
  await page.getByText('unmounted · $query: ∅', { exact: true }).waitFor();
  await page.goto(`${origin}reference/holoList`);
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Reverse rows' }).click();
  assert.equal(await page.getByRole('checkbox').last().isChecked(), true);
  await page.goto(`${origin}reference/bond`);
  await page.getByRole('button', { name: 'Submit demo order' }).click();
  await page.getByText('Receipt for order #100', { exact: true }).waitFor();
  await page.getByRole('checkbox').uncheck();
  await page.getByRole('button', { name: 'Submit demo order' }).click();
  assert.match(await page.locator('.example-preview output').innerText(), /#100/);
  await page.goto(`${origin}reference/holoMolecule`);
  await page.locator('.example-preview button').first().click();
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.example-preview button')]
        .map((button) => button.textContent)
        .join(',') === '+ 1,+ 1,+ 0',
  );
  // Client navigation resets the demo store instead of retaining an abandoned root.
  await page.goto(`${origin}reference/stateAtom`);
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await page.locator('.example-preview output').getByText('1', { exact: true }).waitFor();
  await page.locator('.VPSidebar a[href$="/reference/prism"]').click();
  await page.locator('.example-preview input').waitFor();
  await page.locator('.VPSidebar a[href$="/reference/stateAtom"]').click();
  await page.locator('.example-preview output').getByText('0', { exact: true }).waitFor();
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
  // Capture the finished reference layout as a review artifact.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`${origin}ru/reference/ion`);
  await page.getByRole('spinbutton').fill('4');
  await page.getByRole('checkbox').check();
  await page.getByText('$80.00', { exact: true }).waitFor();
  await page.screenshot({ path: '.vitest-attachments/docs-reactuse-inspired.png' });
  // Mobile navigation and content remain within the viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}ru/guide/getting-started`);
  assert.ok(await page.getByRole('button', { name: 'Меню', exact: true }).isVisible());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(`${origin}ru/reference/ion`);
  await page.getByRole('spinbutton').waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log(
    `Docs browser smoke: ${references.length * 2} reference routes, live controls, teardown, locale switch, search and mobile layout passed (base ${base}).`,
  );
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
