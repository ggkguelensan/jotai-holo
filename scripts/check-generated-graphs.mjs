import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  prepareDocumentGraphs,
  exampleSections,
} from '../docs/.vitepress/graph/document-graphs.mjs';

const { coverage } = await prepareDocumentGraphs();
let nodes = 0;
let edges = 0;
for (const item of coverage) {
  const page = await readFile(`docs/${item.page}`, 'utf8');
  const section = exampleSections(page)[item.index];
  assert.equal(section.blocks.length, item.blocks);
  if (!item.id) {
    assert.ok(item.reason, `${item.page}: exclusions must have a reason`);
    continue;
  }
  const scene = JSON.parse(
    await readFile(`docs/.vitepress/graph/.generated/${item.id}.json`, 'utf8'),
  );
  const ids = new Set([...scene.nodes, ...scene.groups].map((item) => item.id));
  assert.equal(ids.size, scene.nodes.length + scene.groups.length);
  assert.ok(scene.nodes.length, `${item.id}: empty miniature`);
  for (const node of [...scene.nodes, ...scene.groups]) {
    if (node.group) assert.ok(scene.groups.some((group) => group.id === node.group));
    for (const ref of node.refs) {
      const source = scene.sources[ref.source];
      assert.ok(source);
      const matches = source.text.split('\n').filter((line) => line.includes(ref.anchor));
      assert.ok(matches[ref.occurrence ?? 0], `${item.id}/${node.label}: missing displayed source`);
      if (matches.length > 1)
        assert.ok(Number.isInteger(ref.occurrence), `${item.id}: ambiguous anchor`);
    }
  }
  for (const edge of scene.edges) {
    assert.ok(ids.has(edge.from));
    assert.ok(ids.has(edge.to));
  }
  nodes += scene.nodes.length;
  edges += scene.edges.length;
}
console.log(
  `Source graphs: ${coverage.filter((item) => item.id).length} miniatures, ${nodes} nodes, ${edges} evidenced connections; ${coverage.length} logical examples inventoried.`,
);
