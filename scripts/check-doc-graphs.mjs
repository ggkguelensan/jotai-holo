import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const sourceUrl = new URL('../docs/.vitepress/graph/scenes.ts', import.meta.url);
let source = await readFile(sourceUrl, 'utf8');
const imports = [...source.matchAll(/import (\w+) from '([^']+)\?raw';/g)];
for (const [statement, name, file] of imports) {
  const text = await readFile(new URL(file, sourceUrl), 'utf8');
  source = source.replace(statement, () => `const ${name}=${JSON.stringify(text)};`);
}
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { scenes } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
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
  assert.ok(markdown.includes(`<GraphExample scene="${id}">`), `${id}: missing article wrapper`);
  assert.ok(markdown.includes(`{#${anchor}}`), `${id}: missing return anchor`);
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

console.log(
  `Graph scenes: ${Object.keys(scenes).length} scenes, source anchors, node/group IDs, edges and return links checked.`,
);
