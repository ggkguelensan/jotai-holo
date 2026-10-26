import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { locales } from '../docs/.vitepress/i18n/locales.mjs';
import { sourcePages } from './localize-docs.mjs';
const root = path.resolve('docs');
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'public') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await files(full)));
    else if (entry.name.endsWith('.md')) result.push(full);
  }
  return result;
}
const pages = await files(root);
const localized = await sourcePages();
for (const { prefix } of locales.filter((locale) => locale.code !== 'en')) {
  for (const file of localized) await access(path.join(root, prefix, file));
  for (const file of pages.filter((file) => file.startsWith(root + prefix + path.sep))) {
    await access(path.join(root, path.relative(root + prefix, file)));
    assert.match(await readFile(file, 'utf8'), /<!-- Generated from .*Lingui/);
  }
}
let snippets = 0;
for (const file of pages) {
  const text = await readFile(file, 'utf8');
  assert.doesNotMatch(
    text,
    /\b(?:bunshi|holoMolecule|ScopeProvider|useMolecule)\b/i,
    `Retired integration in ${file}`,
  );
  if (file.includes('/reference/')) {
    const translated = locales.some(
      (locale) => locale.prefix && file.startsWith(root + locale.prefix + path.sep),
    );
    for (const [heading, anchor] of [
      ['Contract', 'contract'],
      ['Why this API', 'why-this-api'],
      ['Analogies and reading', 'analogies-and-reading'],
    ]) {
      assert.match(
        text,
        translated
          ? new RegExp(`^## .+ \\{#${anchor}\\}$`, 'm')
          : new RegExp(`^## ${heading}$`, 'm'),
        file,
      );
    }
    assert.match(text, /\]\(https:\/\//, file);
  }
  for (const match of text.matchAll(/^<<< @\/([^\s#]+)(?:#([\w-]+))?/gm)) {
    const source = await readFile(path.resolve(root, match[1]), 'utf8');
    if (match[2]) {
      assert.ok(
        source.includes(`// #region ${match[2]}`),
        `Missing region in ${file}: ${match[2]}`,
      );
      assert.ok(
        source.includes(`// #endregion ${match[2]}`),
        `Unclosed region in ${file}: ${match[2]}`,
      );
    }
    snippets++;
  }
  for (const match of text.matchAll(/\]\((\/[^)#]+)(?:#[^)]*)?\)/g)) {
    const target = path.join(root, match[1]);
    await access(
      target.endsWith('.md')
        ? target
        : match[1].endsWith('/')
          ? path.join(target, 'index.md')
          : `${target}.md`,
    );
  }
}

for (const entry of ['src/index.ts', 'src/model.ts', 'src/query.ts', 'src/rhf.ts']) {
  const source = await readFile(entry, 'utf8');
  const names = entry.endsWith('index.ts')
    ? [...source.matchAll(/export \{ (\w+) \}/g)].map((match) => match[1])
    : [...source.matchAll(/export (?:function|const) (\w+)/g)].map((match) => match[1]);
  for (const name of names) await access(path.join(root, 'reference', `${name}.md`));
}

console.log(
  `Documentation: ${pages.length} pages, ${localized.length} public pages in ${locales.length} languages, ${snippets} source snippets checked.`,
);
