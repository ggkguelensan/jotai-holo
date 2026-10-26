import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatter } from '@lingui/format-po';
import { setupI18n } from '@lingui/core';
import { locales } from '../docs/.vitepress/i18n/locales.mjs';
import { loadCatalog } from '../docs/.vitepress/i18n/catalog.mjs';
import { catalogFormatter } from '../docs/.vitepress/i18n/formatter.mjs';
import {
  markdownParts,
  markdownMessages,
  translateMarkdown,
  literalMessage,
  unliteralMessage,
} from '../docs/.vitepress/i18n/markdown.mjs';
import { extractor } from '../docs/.vitepress/i18n/extractor.mjs';
import { sourcePages } from './localize-docs.mjs';

const po = formatter();
let messages = 0;
for (const { code, prefix } of locales) {
  for (const name of ['docs', 'ui']) {
    const source = await readFile(`docs/.vitepress/i18n/locales/${code}/${name}.po`, 'utf8');
    const entries = po.parse(source, { locale: code, sourceLocale: 'en', filename: `${name}.po` });
    const runtime = await loadCatalog(code, name);
    for (const [id, entry] of Object.entries(entries)) {
      assert.ok(code === 'en' || entry.translation, `${code}/${name}: ${id}`);
      // Exercise actual Lingui compilation, including literal braces/apostrophes in Markdown.
      assert.equal(
        runtime._(id),
        entry.translation || entry.message || id,
        `${code}/${name}: ${id}`,
      );
      messages++;
    }
    const transformed = catalogFormatter.parse(source, {
      locale: code,
      sourceLocale: 'en',
      filename: `/locales/${code}/${name}.po`,
    });
    assert.equal(Object.keys(transformed).length, Object.keys(entries).length);
  }
  if (!prefix) continue;
  for (const file of await sourcePages()) {
    const original = await readFile(`docs/${file}`, 'utf8');
    const translated = await readFile(`docs${prefix}/${file}`, 'utf8');
    const shared = (content) =>
      markdownParts(content)
        .filter((part) => part.type === 'raw' && /^(?:```|~~~|<<<)/m.test(part.raw))
        .map((part) => part.raw);
    assert.deepEqual(
      shared(translated),
      shared(original),
      `${code}/${file}: code must remain shared`,
    );
    assert.doesNotMatch(translated, new RegExp(`${prefix}${prefix}/`));
  }
}
for (const text of [
  "Jotai's atom",
  '`{ signal }`',
  "'{'quoted'}'",
  "l'utilisateur: `{ id: 'new' }`",
  'x {value}',
]) {
  assert.equal(unliteralMessage(literalMessage(text)), text);
}
const sample =
  '---\nhero:\n  text: Welcome\n  actions:\n    - text: Start\n      link: /guide/getting-started\n---\n# Heading\n\nText `{ value }`.\n\n```tsx\nt("not extracted")\n```\n\n<Demo kind="state">\n<<< @/../examples/documentation.tsx#state\n</Demo>\n\n::: info Details\nBody.\n:::\n';
assert.deepEqual(
  markdownMessages(sample).map(({ value }) => value),
  ['Welcome', 'Start', 'Heading', 'Text `{ value }`.', 'Details', 'Body.'],
);
const translated = translateMarkdown(
  sample,
  (value) => 'DE: ' + value,
  () => 'heading',
);
assert.match(translated, /^---\n/);
assert.match(translated, /# DE: Heading \{#heading\}/);
assert.match(translated, /t\("not extracted"\)/);
const extracted = [];
extractor.extract(
  'example.tsx',
  'const value = t("One {name}", {name}); const dynamic = t(variable); const title = <Trans id="Fixed title" />; const incoming = <Trans id={variable} />;',
  (message) => extracted.push(message),
);
assert.deepEqual(
  extracted.map(({ id }) => id),
  ['One {name}', 'Fixed title'],
);
// Native UI ICU interpolation and plural forms remain supported by the formatter.
const uiCatalog = catalogFormatter.parse(
  'msgid "items"\nmsgstr "{count, plural, one {# item} other {# items}}"\n',
  { filename: '/en/ui.po', locale: 'en', sourceLocale: 'en' },
);
assert.equal(
  Object.values(uiCatalog)[0].translation,
  '{count, plural, one {# item} other {# items}}',
);
const isolated = setupI18n({ locale: 'de', messages: { de: { hello: ['Hallo'] } } });
assert.equal(isolated._('hello'), 'Hallo');
assert.equal((await loadCatalog('kk', 'ui'))._('Search'), 'Іздеу');
assert.equal(isolated._('hello'), 'Hallo');
console.log(
  `Lingui: ${messages} compiled messages, four isolated locales, shared code and Markdown contracts passed.`,
);
