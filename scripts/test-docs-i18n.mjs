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
import { transformMacros } from '../docs/.vitepress/i18n/macros.mjs';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';
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
    for (const part of markdownParts(original)) {
      if (part.type !== 'heading' || !part.anchor) continue;
      assert.equal(
        markdownParts(translated).filter(
          (heading) => heading.type === 'heading' && heading.anchor === part.anchor,
        ).length,
        1,
        `${code}/${file}: preserve explicit #${part.anchor} exactly once`,
      );
    }
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
// Explicit anchors are syntax, not translatable prose. Preserve them exactly once.
const anchored = '# New title {#old-title}\n\n[Jump](#old-title).\n<span id="legacy"></span>\n';
assert.deepEqual(
  markdownMessages(anchored).map(({ value }) => value),
  ['New title', '[Jump](#old-title).'],
);
assert.equal(
  translateMarkdown(
    anchored,
    (value) => 'DE: ' + value,
    () => 'new-title',
  ),
  '# DE: New title {#old-title}\n\nDE: [Jump](#old-title).\n<span id="legacy"></span>\n',
);
const extracted = [];
extractor.extract(
  'example.mts',
  'const value = t("One {name}", {name}); const dynamic = t(variable);',
  (message) => extracted.push(message),
);
assert.deepEqual(
  extracted.map(({ id }) => id),
  ['One {name}'],
);
// Macro compilation and catalog extraction must agree on the generated IDs.
const example = await readFile('examples/docs/ion.tsx', 'utf8');
const compiled = await transformMacros(example, process.cwd() + '/examples/docs/ion.tsx');
assert.doesNotMatch(compiled.code, /@lingui\/react\/macro/);
const quantityId = generateMessageId('Quantity');
assert.ok(compiled.code.includes(quantityId));
for (const { code } of locales) {
  const entries = po.parse(await readFile(`docs/.vitepress/i18n/locales/${code}/ui.po`, 'utf8'));
  assert.ok(entries[quantityId]);
  assert.equal(
    (await loadCatalog(code, 'ui'))._(quantityId),
    entries[quantityId].translation || 'Quantity',
  );
}
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
