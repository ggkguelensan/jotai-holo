import { readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { sourceDirectories } from '../content.mjs';
import { buildSourceScene } from './source-scene.mjs';

const generated = resolve('docs/.vitepress/graph/.generated');
const language = /^(?:ts|tsx|js|jsx)(?:\s|$)/;

// Keep one rail around a logical example, including its explanatory paragraphs.
// Demo and authored graph boundaries are containers, never crossed by a wrapper.
export function exampleSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let blocks = [];
  let authored = 0;
  let heading = '';
  let notesStart;
  const flush = () => {
    if (blocks.length) sections.push({ blocks, heading });
    blocks = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^<GraphExample\b/.test(line)) {
      flush();
      authored++;
      continue;
    }
    if (/^<\/GraphExample>/.test(line)) {
      authored--;
      continue;
    }
    if (authored) continue;
    if (/^<CodeNotes>/.test(line)) notesStart = i;
    if (/^<\/CodeNotes>/.test(line)) {
      if (blocks.length) blocks.at(-1).end = i;
      notesStart = undefined;
    }
    if (/^#{1,6}\s/.test(line)) {
      flush();
      heading = line.match(/\{#([^}]+)\}/)?.[1] ?? '';
      continue;
    }
    if (/^<\/?Demo\b/.test(line)) {
      flush();
      continue;
    }
    const snippet = line.match(/^<<<\s+@\/\.\.\/([^#\s]+)(?:#([^\s]+))?/);
    if (snippet) {
      blocks.push({
        start: blocks.length ? i : (notesStart ?? i),
        end: i,
        file: snippet[1],
        region: snippet[2],
      });
      continue;
    }
    const fence = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const start = i;
      while (++i < lines.length && !lines[i].startsWith(fence[1])) {}
      if (language.test(fence[2].trim()))
        blocks.push({ start, end: i, text: lines.slice(start + 1, i).join('\n') });
    }
  }
  flush();
  return sections;
}

function regionText(text, region) {
  if (!region) return text;
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.includes(`#region ${region}`));
  if (start < 0) throw new Error(`Missing graph source region ${region}`);
  let depth = 1;
  let end = start + 1;
  for (; end < lines.length; end++) {
    if (/#region\b/.test(lines[end])) depth++;
    if (/#endregion\b/.test(lines[end]) && --depth === 0) break;
  }
  return lines.slice(start + 1, end).join('\n');
}

const sceneId = (page, index) =>
  'code-' + createHash('sha256').update(`${page}:${index}`).digest('hex').slice(0, 12);

export async function prepareDocumentGraphs() {
  await mkdir(generated, { recursive: true });
  const plans = new Map();
  const coverage = [];
  const expected = new Set();
  for (const directory of sourceDirectories) {
    for (const name of (await readdir(`docs/${directory}`)).sort()) {
      if (!name.endsWith('.md')) continue;
      const page = `${directory}/${name}`;
      const markdown = await readFile(`docs/${page}`, 'utf8');
      const sections = exampleSections(markdown);
      const plan = [];
      for (const [index, section] of sections.entries()) {
        const sources = {};
        const id = sceneId(page, index);
        for (const [blockIndex, block] of section.blocks.entries()) {
          const file = block.file ?? `docs/${page}#inline-${index}-${blockIndex}`;
          const text = block.file
            ? regionText(await readFile(block.file, 'utf8'), block.region)
            : block.text;
          const key =
            Object.keys(sources).find((key) => sources[key].file === file) ??
            `source${Object.keys(sources).length}`;
          if (sources[key]) sources[key].text += '\n\n' + text;
          else sources[key] = { file, text };
          block.source = file;
        }
        const scene = buildSourceScene({
          id,
          article: '/' + page.replace(/\.md$/, '') + (section.heading ? '#' + section.heading : ''),
          sources,
        });
        const shown = scene.nodes.length > 0;
        plan.push(shown ? id : null);
        coverage.push({
          page,
          index,
          id: shown ? id : null,
          blocks: section.blocks.length,
          nodes: scene.nodes.length,
          edges: scene.edges.length,
          reason: shown
            ? undefined
            : 'No declared graph participants (types, imports or opaque API setup).',
        });
        if (shown) {
          const name = id + '.json';
          expected.add(name);
          const output = JSON.stringify(scene);
          let previous;
          try {
            previous = await readFile(`${generated}/${name}`, 'utf8');
          } catch {}
          if (previous !== output) await writeFile(`${generated}/${name}`, output);
        }
      }
      plans.set(page, plan);
    }
  }
  for (const file of await readdir(generated))
    if (file.endsWith('.json') && !expected.has(file) && file !== 'coverage.json')
      await rm(`${generated}/${file}`);
  await writeFile(`${generated}/coverage.json`, JSON.stringify(coverage, null, 2));
  return { plans, coverage };
}

export function documentGraphs(md, plans) {
  md.core.ruler.before('normalize', 'document-graphs', (state) => {
    const page = (
      state.env.relativePath ?? relative(resolve('docs'), state.env.path ?? '')
    ).replace(/^(?:ru|de|kk)\//, '');
    const plan = plans.get(page);
    if (!plan) return;
    const lines = state.src.split('\n');
    const sections = exampleSections(state.src);
    if (sections.length !== plan.length) throw new Error(`Graph section drift in ${page}`);
    for (let index = sections.length - 1; index >= 0; index--) {
      const id = plan[index];
      if (!id) continue;
      const blocks = sections[index].blocks;
      const end = blocks.at(-1).end;
      lines.splice(end + 1, 0, '\n</GraphExample>\n');
      for (let j = blocks.length - 1; j >= 0; j--) {
        const block = blocks[j];
        if (!block.file)
          lines.splice(block.start, 0, `<!-- graph-source: docs/${page}#inline-${index}-${j} -->`);
      }
      lines.splice(blocks[0].start, 0, `<GraphExample scene="${id}">\n`);
    }
    state.src = lines.join('\n');
  });
  md.core.ruler.after('block', 'graph-inline-source', (state) => {
    for (let i = 1; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      const previous = state.tokens[i - 1];
      if (token.type === 'fence' && previous.type === 'html_block')
        token.graphSource = previous.content.match(/<!-- graph-source: ([^\n]+) -->/)?.[1];
    }
  });
}
