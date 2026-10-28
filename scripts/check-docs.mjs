import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { locales } from '../docs/.vitepress/i18n/locales.mjs';
import { sourcePages } from './localize-docs.mjs';
const root = path.resolve('docs');
async function files(dir, extensions = ['.md']) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'public') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await files(full, extensions)));
    else if (extensions.some((extension) => entry.name.endsWith(extension))) result.push(full);
  }
  return result;
}
// Public examples must exercise the native model API.
for (const file of await files(path.resolve('examples'), ['.ts', '.tsx'])) {
  assert.doesNotMatch(
    await readFile(file, 'utf8'),
    /\buse(?:Layout)?Effect\b/,
    `React effects do not own public example resources: ${file}`,
  );
  assert.doesNotMatch(
    await readFile(file, 'utf8'),
    /\b(?:bunshi|holoMolecule|ScopeProvider|useMolecule|InjectorProvider|createModel)\b/i,
    `Retired integration in ${file}`,
  );
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
  assert.doesNotMatch(
    text,
    /\b(?:core|bindProps|cage)\s*:|ctx\.props|\/reference\/cage\b/,
    `Retired holo syntax in ${file}`,
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
  if (file.includes('/reference/') || file.includes('/guide/') || file.includes('/recipes/')) {
    assert.doesNotMatch(
      text,
      /\bcreateModel\b|\byield\s*:|\b(?:lifecycle|resources)\s*:/,
      `Retired public API in ${file}`,
    );
    for (const block of text.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)) {
      for (const line of block[1].split('\n')) {
        assert.ok([...line].length <= 80, `Code fence exceeds 80 columns in ${file}: ${line}`);
      }
    }
  }
  for (const match of text.matchAll(/^<<< @\/([^\s#]+)(?:#([\w-]+))?/gm)) {
    const source = await readFile(path.resolve(root, match[1]), 'utf8');
    for (const [index, line] of source.split('\n').entries()) {
      assert.ok(
        [...line].length <= 80,
        `Code example exceeds 80 columns: ${match[1]}:${index + 1}`,
      );
    }
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
    : entry.endsWith('model.ts')
      ? [...source.matchAll(/export \{ ([^}]+) \}/g)].flatMap((match) =>
          match[1].split(',').map((name) => name.trim()),
        )
      : [...source.matchAll(/export (?:function|const) (\w+)/g)].map((match) => match[1]);
  for (const name of names) await access(path.join(root, 'reference', `${name}.md`));
}

console.log(
  `Documentation: ${pages.length} pages, ${localized.length} public pages in ${locales.length} languages, ${snippets} source snippets checked.`,
);
