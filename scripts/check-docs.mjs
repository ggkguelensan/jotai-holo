import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { createMarkdownRenderer } from 'vitepress';
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
  // DOM focus/measurement and local UI synchronization belong in View files.
  if (!file.endsWith('-views.tsx'))
    assert.doesNotMatch(
      await readFile(file, 'utf8'),
      /\buse(?:Layout)?Effect\b/,
      `React effects do not own public example resources: ${file}`,
    );
  assert.doesNotMatch(
    await readFile(file, 'utf8'),
    /\bcreateModel\b/,
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
const markdown = await createMarkdownRenderer(root);
const anchors = new Map();
async function headingIds(file) {
  if (!anchors.has(file)) {
    const text = (await readFile(file, 'utf8')).replace(/^<<< .*$/gm, '');
    const rendered = markdown.render(text);
    anchors.set(file, new Set([...rendered.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])));
  }
  return anchors.get(file);
}
let snippets = 0;
for (const file of pages) {
  const text = await readFile(file, 'utf8');
  assert.doesNotMatch(text, /\bcreateModel\b/, `Retired model constructor in ${file}`);
  assert.doesNotMatch(
    text,
    /\b(?:core|bindProps|cage)\s*:|^\s*(?:props|staticProps|inputProps)\s*:|ctx\.props|holo\.inputProps\b|\/reference\/(?:cage|inputProps)\b/m,
    `Retired holo syntax in ${file}`,
  );
  if (file.includes('/reference/') && !text.startsWith('---\nsearch: false')) {
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
  if (
    file.includes('/reference/') ||
    file.includes('/guide/') ||
    file.includes('/topics/') ||
    file.includes('/recipes/')
  ) {
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
  for (const match of text.matchAll(/\]\(([^\s)]*)#([^\s)]+)\)/g)) {
    const [, href, fragment] = match;
    if (/^[a-z]+:/i.test(href)) continue;
    let target = !href
      ? file
      : href.startsWith('/')
        ? path.join(root, href)
        : path.resolve(path.dirname(file), href);
    if (!path.extname(target)) target += '.md';
    if (target.endsWith('.md')) {
      assert.ok(
        (await headingIds(target)).has(decodeURIComponent(fragment)),
        `Missing heading #${fragment} in ${target}, linked from ${file}`,
      );
    }
  }
}

// TypeScript resolves re-exports and distinguishes runtime utilities from types.
// Derive entry points from the package manifest so optional integrations cannot drift.
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const entries = Object.values(manifest.exports)
  .filter((entry) => typeof entry === 'object' && entry.import)
  .map((entry) => entry.import.replace('./dist/', 'src/').replace(/\.js$/, '.ts'));
const program = ts.createProgram(entries, {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
});
const checker = program.getTypeChecker();
const exported = new Set();
for (const entry of entries) {
  const source = program.getSourceFile(entry);
  for (let symbol of checker.getExportsOfModule(checker.getSymbolAtLocation(source))) {
    const name = symbol.name;
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    if (!(symbol.flags & ts.SymbolFlags.Value)) continue;
    exported.add(name);
    await access(path.join(root, 'reference', `${name}.md`));
  }
}
for (const file of localized.filter((file) => /^(?:topics|reference)\//.test(file))) {
  const source = await readFile(path.join(root, file), 'utf8');
  assert.doesNotMatch(source, /<Demo\b/, `Full applications belong in examples: ${file}`);
}
assert.equal(
  (await readdir(path.join(root, 'topics'))).filter(
    (file) => file.endsWith('.md') && file !== 'index.md',
  ).length,
  7,
);

console.log(
  `Documentation: ${pages.length} pages, ${localized.length} public pages in ${locales.length} languages, ${snippets} source snippets and ${exported.size} public utilities checked.`,
);
