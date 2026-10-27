import assert from 'node:assert/strict';
import { splitCode } from '../docs/.vitepress/code-blocks.mjs';

const source = `import { atom } from 'jotai';
import { holo } from 'jotai-holo';

// The model owns its state.
const $count = stateAtom(0);
const $double = stateAtom(get => get($count) * 2);

const increment = actionAtom((get, set) => {
  set($count, get($count) + 1);
});

type Props = { count: number };
function View({ count }: Props) {
  const label = 'keep blank lines';

  return <div>{count}{label}</div>;
}

const Counter = holo({ view: View, read: { count: $count } });
export default Counter;
`;
const blocks = splitCode(source);
assert.equal(blocks.length, 5);
assert.match(blocks[0], /import.*atom[\s\S]*import.*holo/);
assert.match(blocks[1], /model owns[\s\S]*\$count[\s\S]*\$double/);
assert.match(blocks[2], /^const increment/);
assert.match(blocks[3], /^type Props[\s\S]*function View[\s\S]*\n\n  return/);
assert.match(blocks[4], /const Counter[\s\S]*export default Counter/);
assert.equal(blocks.join('').replace(/\s/g, ''), source.replace(/\s/g, ''));
assert.deepEqual(splitCode('const value = (', 'ts'), ['const value = (']);
assert.deepEqual(splitCode('type Value = number;', 'ts'), ['type Value = number;']);
console.log('Logical code blocks: declarations, comments, JSX and source preservation passed.');
