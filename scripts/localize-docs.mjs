import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createMarkdownRenderer } from 'vitepress';
import { parse, stringify } from 'yaml';
import { loadCatalog } from '../docs/.vitepress/i18n/catalog.mjs';
import { locales } from '../docs/.vitepress/i18n/locales.mjs';
import { markdownParts, translateMarkdown } from '../docs/.vitepress/i18n/markdown.mjs';

export async function sourcePages() {
  const files = ['index.md'];
  for (const dir of ['guide', 'reference', 'recipes'])
    for (const file of (await readdir(`docs/${dir}`)).sort())
      if (file.endsWith('.md')) files.push(`${dir}/${file}`);
  return files;
}

export async function generateLocalizedDocs() {
  const markdown = await createMarkdownRenderer(resolve('docs'));
  const slugify = (heading) => {
    const html = markdown.render(`## ${heading}\n`);
    const id = html.match(/^<h2 id="([^"]+)"/);
    if (!id) throw new Error(`Cannot create canonical heading anchor: ${heading}`);
    return id[1];
  };
  const pages = await sourcePages();
  const reports = (await readdir('docs')).filter(
    (file) => file.endsWith('.md') && file !== 'index.md',
  );
  const source = new Map(
    await Promise.all(pages.map(async (path) => [path, await readFile(`docs/${path}`, 'utf8')])),
  );
  const routes = new Set(pages.map((file) => '/' + file.replace(/(?:index)?\.md$/, '')));
  for (const { code, prefix } of locales.filter((locale) => locale.code !== 'en')) {
    const catalog = await loadCatalog(code, 'docs');
    const t = (message) => catalog._(message);
    const anchors = new Map();
    for (const [file, content] of source) {
      const lookup = new Map();
      for (const part of markdownParts(content))
        if (part.type === 'heading') lookup.set(slugify(t(part.value)), slugify(part.value));
      anchors.set('/' + file.replace(/(?:index)?\.md$/, ''), lookup);
    }
    const localLink = (href) => {
      const [pathname, fragment] = href.split('#');
      if (!routes.has(pathname)) return href;
      const canonical = fragment ? (anchors.get(pathname)?.get(fragment) ?? fragment) : undefined;
      return `${prefix}${pathname}${canonical ? '#' + canonical : ''}`;
    };
    for (const [file, content] of source) {
      let translated = translateMarkdown(content, t, slugify);
      translated = translated.replace(/\]\((\/[^\s)]+)\)/g, (_, href) => `](${localLink(href)})`);
      // Frontmatter link values are data, not prose; localize destinations without translating them.
      if (translated.startsWith('---\n')) {
        const end = translated.indexOf('\n---\n', 4);
        const frontmatter = parse(translated.slice(4, end));
        const visit = (node) => {
          if (!node || typeof node !== 'object') return;
          for (const [key, value] of Object.entries(node)) {
            if (key === 'link' && typeof value === 'string') node[key] = localLink(value);
            else visit(value);
          }
        };
        visit(frontmatter);
        translated = `---\n${stringify(frontmatter)}---\n${translated.slice(end + 5)}`;
      }
      // Keep frontmatter first: a preceding HTML comment would disable VitePress frontmatter parsing.
      const generated =
        '<!-- Generated from English Markdown and Lingui docs.po. Do not edit. -->\n';
      const frontmatterEnd = translated.startsWith('---\n')
        ? translated.indexOf('\n---\n', 4) + 5
        : 0;
      translated =
        translated.slice(0, frontmatterEnd) + generated + translated.slice(frontmatterEnd);
      const path = `docs${prefix}/${file}`;
      await mkdir(resolve(path, '..'), { recursive: true });
      let previous;
      try {
        previous = await readFile(path, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (previous !== translated) await writeFile(path, translated);
    }
    // Language switching from an English-only report still resolves to a real page.
    const ui = await loadCatalog(code, 'ui');
    for (const file of reports) {
      const report = await readFile(`docs/${file}`, 'utf8');
      const title = report.match(/^# (.+)$/m)?.[1] ?? file;
      const stub = `<!-- Generated from Lingui ui.po. Do not edit. -->\n# ${title}\n\n${ui._('This engineering report is maintained in English.')}\n\n[${ui._('Read the English report')}](/${file.replace(/\.md$/, '')})\n`;
      const path = `docs${prefix}/${file}`;
      let previous;
      try {
        previous = await readFile(path, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (previous !== stub) await writeFile(path, stub);
    }
  }
  console.log(
    `Generated ${pages.length} pages × ${locales.length - 1} translated locales from Lingui catalogs.`,
  );
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname))
  await generateLocalizedDocs();
