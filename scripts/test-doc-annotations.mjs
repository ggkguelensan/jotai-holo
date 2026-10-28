import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const base = process.env.DOCS_BASE || '/';
const origin = 'http://127.0.0.1:4183';
const server = spawn(
  process.execPath,
  [
    'node_modules/vitepress/bin/vitepress.js',
    'preview',
    'docs',
    '--host',
    '127.0.0.1',
    '--port',
    '4183',
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
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  let layouts = 0;
  for (const locale of ['', 'ru/', 'de/', 'kk/']) {
    await page.goto(`${origin}${base}${locale}recipes/profile-composition`);
    await page.waitForSelector('.code-notes[data-aligned]');
    assert.equal(await page.locator('.VPDoc .aside').count(), 0);
    assert.equal(await page.locator('.code-note').count(), 3);
    for (const width of [2048, 1920, 1600, 1440, 1280, 960, 768, 390]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (let frame = 0; frame < 4; frame++)
          await new Promise((resolve) => requestAnimationFrame(resolve));
      });
      const layout = await page.locator('.code-notes').evaluate((root) => ({
        aligned: root.dataset.aligned === 'true',
        width: root.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        codeOverflow: [...root.querySelectorAll('pre')].some(
          (pre) => pre.scrollWidth > pre.clientWidth + 1,
        ),
        notes: [...root.querySelectorAll('.code-note')].map((note) => {
          const line = document.getElementById(note.dataset.codeTarget);
          const block = line.closest('[class*="language-"]');
          const noteRect = note.getBoundingClientRect();
          const lineRect = line.getBoundingClientRect();
          return {
            anchor: note.dataset.codeAnchor,
            linked: line.getAttribute('aria-describedby') === note.id,
            top: noteRect.top,
            bottom: noteRect.bottom,
            targetTop: lineRect.top,
            left: noteRect.left,
            sourceRight: block.getBoundingClientRect().right,
            right: noteRect.right,
          };
        }),
      }));
      assert.equal(layout.pageOverflow, false, `${locale}${width}: page overflow`);
      assert.equal(layout.codeOverflow, false, `${locale}${width}: code overflow`);
      assert.equal(layout.aligned, layout.width >= 1100);
      for (const [index, note] of layout.notes.entries()) {
        assert.ok(note.linked);
        if (layout.aligned) {
          assert.ok(
            Math.abs(note.top - note.targetTop) < 3,
            `${locale}${width}: ${note.anchor} missed its line by ${note.top - note.targetTop}px`,
          );
          assert.ok(note.left >= note.sourceRight + 16);
          assert.ok(note.right <= width);
          if (index) assert.ok(note.top >= layout.notes[index - 1].bottom + 16);
        }
      }
      layouts++;
    }
    const location = page.locator('.code-note-location').first();
    assert.ok(await location.isVisible());
    const href = await location.getAttribute('href');
    await location.click();
    assert.ok(page.url().endsWith(href));
    assert.ok(await page.locator(href).count());
    await page.locator('.code-notes button.copy').first().click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(copied.includes('createProfileModel'));
    assert.ok(copied.includes('const receive'));
    assert.ok(!copied.includes('Input port') && !copied.includes('Входной порт'));
    await page.goto(`${origin}${base}${locale}reference/holo`);
    assert.equal(await page.locator('.VPDoc .aside').count(), 0);
  }
  console.log(
    `Code annotations: ${layouts} localized layouts, aligned anchors, mobile links and clean copy passed.`,
  );
} finally {
  await browser?.close();
  const stopped = once(server, 'close');
  server.kill('SIGTERM');
  await stopped;
}
