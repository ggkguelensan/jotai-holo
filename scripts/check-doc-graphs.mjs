import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { exampleSections } from '../docs/.vitepress/graph/document-graphs.mjs';

async function loadSceneSource(file) {
  const sourceUrl = new URL(file, import.meta.url);
  let source = await readFile(sourceUrl, 'utf8');
  for (const [statement, name, raw] of source.matchAll(/import (\w+) from '([^']+)\?raw';/g)) {
    const text = await readFile(new URL(raw, sourceUrl), 'utf8');
    source = source.replace(statement, () => `const ${name}=${JSON.stringify(text)};`);
  }
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}
const { scenes: existing } = await loadSceneSource('../docs/.vitepress/graph/scenes.ts');
const { spreadsheetScene } = await loadSceneSource('../docs/.vitepress/graph/spreadsheet-scene.ts');
const scenes = { ...existing, [spreadsheetScene.id]: spreadsheetScene };
for (const [id, scene] of Object.entries(scenes)) {
  assert.equal(scene.id, id);
  const ids = new Set();
  const groups = new Set(scene.groups.map((group) => group.id));
  for (const node of [...scene.nodes, ...scene.groups]) {
    assert.ok(!ids.has(node.id), `${id}: duplicate ${node.id}`);
    ids.add(node.id);
    if (node.group) assert.ok(groups.has(node.group), `${id}: missing group ${node.group}`);
    for (const ref of node.refs) {
      const file = scene.sources[ref.source];
      assert.ok(file, `${id}: missing source ${ref.source}`);
      const lines = file.text.split('\n').filter((line) => line.includes(ref.anchor));
      assert.equal(lines.length, 1, `${id}/${node.id}: missing or ambiguous ${ref.anchor}`);
    }
  }
  for (const edge of scene.edges) {
    assert.ok(ids.has(edge.from), `${id}: missing ${edge.from}`);
    assert.ok(ids.has(edge.to), `${id}: missing ${edge.to}`);
  }
  for (const file of Object.values(scene.sources))
    assert.equal(file.text, await readFile(new URL(`../${file.file}`, import.meta.url), 'utf8'));
  const [article, anchor] = scene.article.split('#');
  const markdown = await readFile(new URL(`../docs${article}.md`, import.meta.url), 'utf8');
  assert.ok(
    new RegExp(`<GraphExample[^>]*scene="${id}"[^>]*>`).test(markdown),
    `${id}: missing article wrapper`,
  );
  assert.ok(
    markdown.includes(`{#${anchor}}`) || markdown.includes(`id="${anchor}"`),
    `${id}: missing return anchor`,
  );
}

const workbookArticle = await readFile('docs/examples/spreadsheet.md', 'utf8');
assert.equal(
  exampleSections(workbookArticle).length,
  0,
  'One authored system graph replaces snippet graphs',
);
assert.equal([...workbookArticle.matchAll(/<GraphExample\b/g)].length, 1);
assert.equal(spreadsheetScene.groups.filter((group) => group.registry).length, 4);
for (const node of spreadsheetScene.nodes) {
  if (!node.group) continue;
  const [x, y, width, height] = spreadsheetScene.groups.find(
    (group) => group.id === node.group,
  ).bounds;
  assert.ok(
    node.position[0] >= x &&
      node.position[0] <= x + width &&
      node.position[1] >= y &&
      node.position[1] <= y + height,
    `Model placement: ${node.id}`,
  );
}

// The solver must separate coincident starts and pull distant linked nodes together.
const forceSource = await readFile(
  new URL('../docs/.vitepress/graph/force-layout.ts', import.meta.url),
  'utf8',
);
const forceCode = ts.transpileModule(forceSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { stepLayout } = await import(
  `data:text/javascript;base64,${Buffer.from(forceCode).toString('base64')}`
);
const pair = [
  { id: 'a', x: 150, y: 150, vx: 0, vy: 0 },
  { id: 'b', x: 150, y: 150, vx: 0, vy: 0 },
];
for (let i = 0; i < 180; i++) stepLayout(pair, [], 300, 320);
assert.ok(Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) > 40);
const linked = [
  { id: 'a', x: 28, y: 28, vx: 0, vy: 0 },
  { id: 'b', x: 272, y: 292, vx: 0, vy: 0 },
];
for (let i = 0; i < 400; i++) stepLayout(linked, [{ from: 'a', to: 'b' }], 300, 320);
assert.ok(Math.hypot(linked[0].x - linked[1].x, linked[0].y - linked[1].y) < 180);
assert.ok(
  linked.every(
    (node) =>
      Number.isFinite(node.x) && node.x >= 28 && node.x <= 272 && node.y >= 28 && node.y <= 292,
  ),
);

const dense = spreadsheetScene.nodes.map((node, index, nodes) => ({
  id: node.id,
  x: 150 + Math.cos((index / nodes.length) * Math.PI * 2) * 87,
  y: 160 + Math.sin((index / nodes.length) * Math.PI * 2) * 105,
  vx: 0,
  vy: 0,
}));
for (let i = 0; i < 650; i++) stepLayout(dense, spreadsheetScene.edges, 300, 320);
assert.ok(
  dense.filter((node) => node.x <= 29 || node.x >= 271 || node.y <= 29 || node.y >= 291).length < 5,
  'A whole-system miniature must not settle into a rectangular boundary cage',
);
for (let i = 0; i < dense.length; i++)
  for (let j = i + 1; j < dense.length; j++)
    assert.ok(
      Math.hypot(dense[i].x - dense[j].x, dense[i].y - dense[j].y) > 10,
      'System graph dots must remain visually separate',
    );

console.log(
  `Graph scenes: ${Object.keys(scenes).length} scenes, source anchors, node/group IDs, edges and return links checked.`,
);
