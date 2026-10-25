import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
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
const localized = pages.filter((file) =>
  /^(guide|reference|recipes)\//.test(path.relative(root, file)),
);
for (const file of localized) await access(path.join(root, 'ru', path.relative(root, file)));
for (const file of pages.filter((file) => file.startsWith(path.join(root, 'ru') + path.sep))) {
  await access(path.join(root, path.relative(path.join(root, 'ru'), file)));
}
let snippets = 0;
for (const file of pages) {
  const text = await readFile(file, 'utf8');
  if (file.includes('/reference/')) {
    assert.match(text, /^## (Contract|Контракт)$/m, file);
    assert.match(text, /^## (Why this API|Почему такой API)$/m, file);
    assert.match(text, /^## (Analogies and reading|Аналогии и материалы)$/m, file);
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
    await access(target.endsWith('.md') ? target : `${target}.md`);
  }
}

for (const entry of ['src/index.ts', 'src/bunshi.ts']) {
  const source = await readFile(entry, 'utf8');
  const names = entry.endsWith('bunshi.ts')
    ? ['holoMolecule']
    : [...source.matchAll(/export \{ (\w+) \}/g)].map((match) => match[1]);
  for (const name of names) await access(path.join(root, 'reference', `${name}.md`));
}

console.log(
  `Documentation: ${pages.length} pages, ${localized.length + 1} translated page pairs, ${snippets} source snippets checked.`,
);
