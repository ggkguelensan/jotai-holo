import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, build, preview } from 'vite';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('..', import.meta.url));
const directory = path.join(root, '.react-compat');
await mkdir(directory, { recursive: true });
execFileSync('pnpm', ['pack', '--out', path.join(directory, 'library.tgz')], {
  cwd: root,
  stdio: 'pipe',
});
const versions = process.env.REACT_VERSION
  ? [process.env.REACT_VERSION]
  : ['18.0.0', '18.3.1', '19.3.1'];
const browser = await chromium.launch();
try {
  for (const version of versions) {
    const fixture = path.join(directory, version);
    await mkdir(fixture, { recursive: true });
    await writeFile(
      path.join(fixture, 'package.json'),
      JSON.stringify({
        private: true,
        type: 'module',
        dependencies: {
          'jotai-holo': 'file:../library.tgz',
          react: version,
          'react-dom': version,
          jotai: '3.0.1',
          bunshi: '2.2.0',
          '@types/react': version.startsWith('18.') ? '18.3.31' : '19.3.0',
          '@types/react-dom': version.startsWith('18.') ? '18.3.7' : '19.3.0',
        },
      }),
    );
    execFileSync(
      'pnpm',
      ['install', '--dir', fixture, '--ignore-scripts', '--no-frozen-lockfile'],
      { cwd: root, stdio: 'pipe' },
    );
    await copyFile(
      path.join(root, 'tests/fixtures/react-compat.tsx'),
      path.join(fixture, 'main.tsx'),
    );
    await writeFile(
      path.join(fixture, 'index.html'),
      '<div id="root"></div><script type="module" src="/main.tsx"></script>',
    );
    await writeFile(
      path.join(fixture, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          strict: true,
          skipLibCheck: false,
          noEmit: true,
          types: ['react', 'react-dom'],
        },
        include: ['main.tsx'],
      }),
    );
    execFileSync(
      path.join(root, 'node_modules/.bin/tsc'),
      ['-p', path.join(fixture, 'tsconfig.json')],
      { cwd: fixture, stdio: 'inherit' },
    );
    const ssr = `import assert from 'node:assert/strict';
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { holo, stateAtom } from 'jotai-holo';
import { holoMolecule } from 'jotai-holo/bunshi';
import { molecule } from 'bunshi/react';
const C = holo({ core: ({ value }) => React.createElement('b', null, value), state: { value: stateAtom(Promise.resolve('server-ready')) } });
const select = holoMolecule(molecule(() => ({ value: stateAtom(Promise.resolve('adapted-ready')) })));
const Adapted = holo({ core: ({ value }) => React.createElement('i', null, value), state: { value: select(model => model.value) } });
let html = '';
await new Promise((resolve, reject) => {
 const out = new PassThrough(); out.on('data', chunk => { html += chunk; }); out.on('end', resolve);
 const stream = renderToPipeableStream(React.createElement(React.Suspense, { fallback: 'waiting' }, React.createElement('div', null, React.createElement(C), React.createElement(Adapted))), { onAllReady() { stream.pipe(out); }, onError: reject });
});
assert.match(html, /server-ready/);
assert.match(html, /adapted-ready/);
`;
    await writeFile(path.join(fixture, 'ssr.mjs'), ssr);
    execFileSync(process.execPath, [path.join(fixture, 'ssr.mjs')], {
      cwd: fixture,
      stdio: 'inherit',
      timeout: 15000,
    });
    const config = { root: fixture, configFile: false, logLevel: 'error' };
    for (const mode of ['development', 'production']) {
      let server;
      if (mode === 'development') {
        server = await createServer({ ...config, server: { host: '127.0.0.1', port: 0 } });
        await server.listen();
      } else {
        await build(config);
        server = await preview({ ...config, preview: { host: '127.0.0.1', port: 0 } });
      }
      const port = (server.httpServer ?? server.server).address().port;
      const page = await browser.newPage();
      const errors = [];
      const consoleErrors = [];
      let expectingRejection = false;
      page.on('console', (message) => {
        if (!['error', 'warning'].includes(message.type())) return;
        const text = message.text();
        if (
          expectingRejection &&
          (text.includes('expected rejection') || text.includes('The above error occurred'))
        )
          return;
        consoleErrors.push(text);
      });
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(`http://127.0.0.1:${port}`);
        await page.locator('#loading').waitFor();
        await page.locator('#counter').click();
        await page.getByText('counter:1/2/1', { exact: true }).waitFor();
        await page.evaluate(() => window.compat.resolve());
        await page.getByText('a:1/ready', { exact: true }).waitFor();
        let state = await page.evaluate(() => window.compat.snapshot());
        assert.equal(state.ref, 'ref works');
        assert.equal(state.adaptedRef, 'a:1');
        await page.evaluate(() => {
          window.compat.emit(4);
          window.compat.emit(4);
        });
        await page.getByText('a:4/ready', { exact: true }).waitFor();
        assert.equal((await page.evaluate(() => window.compat.snapshot())).deliveries, 2);
        await page.evaluate(() => window.compat.replace('sync'));
        await page.getByText('a:4/sync', { exact: true }).waitFor();
        await page.evaluate(() => window.compat.replace(Promise.resolve('async-again')));
        await page.getByText('a:4/async-again', { exact: true }).waitFor();
        await page.evaluate(() => window.compat.scope('b'));
        await page.getByText('b:4/async-again', { exact: true }).waitFor();
        assert.equal((await page.evaluate(() => window.compat.snapshot())).adaptedRef, 'b:4');
        await page.evaluate(() => window.compat.reorder());
        assert.deepEqual(await page.locator('li').allTextContents(), ['2', '1']);
        expectingRejection = true;
        await page.evaluate(() => window.compat.reject());
        await page.locator('#error').waitFor();
        await page.evaluate(() => window.compat.unmount());
        state = await page.evaluate(() => window.compat.snapshot());
        assert.equal(state.lifecycle.at(-1), 'unmount');
        assert.ok(
          !errors.some((error) => !error.includes('expected rejection')),
          JSON.stringify(errors),
        );
        assert.deepEqual(consoleErrors, []);
        console.log(
          `React ${version} ${mode}: packed types, SSR, state/actions/events, refs, Suspense/rejection, Bunshi scopes, list/match and cleanup passed.`,
        );
      } finally {
        await page.close();
        await (server.close
          ? server.close()
          : new Promise((resolve) => server.httpServer.close(resolve)));
      }
    }
  }
} finally {
  await browser.close();
  await rm(directory, { recursive: true, force: true });
}
