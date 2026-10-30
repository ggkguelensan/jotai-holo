import assert from 'node:assert/strict';
import { buildSourceScene } from '../docs/.vitepress/graph/source-scene.mjs';

const scene = buildSourceScene({
  id: 'composition',
  article: '/topics/atoms-and-models',
  sources: {
    model: {
      file: 'examples/model.ts',
      text: `export const createCounterModel = defineModel(() => {
        const $count = stateAtom(0);
        const increment = actionAtom((get, set) => set($count, get($count) + 1));
        return { $count, increment };
      });
      const countReceived = eventAtom();
      export const $$counter = pipe(createCounterModel, modelConnection(counter => [bond({trigger: countReceived, write: counter.increment})]), modelRegistry());`,
    },
    component: {
      file: 'examples/component.tsx',
      text: `import { $$counter } from './model';
      const Counter = holo({
        models: { counter: (props) => $$counter({ key: props.id }) },
        view: CounterView,
        read: ({ counter }) => ({ count: counter.$count }),
        write: ({ counter }) => ({ onIncrement: counter.increment }),
      });
      function Page() { return <Counter id="a" />; }
      function Unrelated() { const $count = stateAtom(99); return $count; }`,
    },
  },
});
const node = (label) =>
  scene.nodes.find((item) => item.label === label && item.group === model.id) ??
  scene.nodes.find((item) => item.label === label);
const edge = (from, to, kind) =>
  scene.edges.some((item) => item.from === from.id && item.to === to.id && item.kind === kind);
const model = scene.groups.find((group) => group.label === '$$counter');
assert.equal(model.label, '$$counter');
assert.equal(model.registry, true);
const count = scene.nodes.find((item) => item.label === '$count' && item.group === model.id);
assert.ok(edge(count, node('Counter'), 'read'));
assert.ok(edge(node('Counter'), node('increment'), 'write'));
assert.ok(edge(node('Page'), node('Counter'), 'props'));
assert.ok(edge(node('Counter'), node('CounterView'), 'props'));
assert.ok(edge(count, node('increment'), 'read'));
assert.ok(edge(node('increment'), count, 'write'));
assert.ok(edge(node('countReceived'), node('increment'), 'fact'));
assert.ok(
  !scene.edges.some(
    (item) => item.from === scene.nodes.find((item) => item.label === '$count' && !item.group).id,
  ),
);
for (const item of [...scene.nodes, ...scene.groups]) {
  for (const ref of item.refs) assert.ok(scene.sources[ref.source].text.includes(ref.anchor));
}

const query = buildSourceScene({
  id: 'query',
  article: '/',
  sources: {
    main: {
      file: 'main.tsx',
      text: `const $$query = createQueryModel({prism: {$games: result => result.data}});
      const Games = holo({view: GamesView, read: {games: $$query.$games}});
      const changed = eventAtom(); const received = eventAtom();
      bond({trigger: changed, write: received});
      const Unknown = holo({view: UnknownView, read: {data: $$imported.$data}});`,
    },
  },
});
assert.equal(query.groups[0].label, '$$query');
assert.ok(
  query.edges.some(
    (item) =>
      item.from === query.nodes.find((item) => item.label === '$games').id && item.kind === 'read',
  ),
);
assert.ok(
  query.edges.some(
    (item) =>
      item.from === query.nodes.find((item) => item.label === 'changed').id &&
      item.to === query.nodes.find((item) => item.label === 'received').id,
  ),
);
assert.ok(!query.nodes.some((item) => item.label === '$data'));
assert.ok(
  !query.edges.some(
    (item) =>
      !query.nodes.some((node) => node.id === item.from) ||
      !query.nodes.some((node) => node.id === item.to),
  ),
);

// Declarations without initializers appear in API examples and type contracts.
const sparse = buildSourceScene({
  id: 'sparse',
  article: '/',
  sources: {
    main: {
      file: 'sparse.ts',
      text: `let request;
declare const $value: Atom<number>;
function createFirstModel() { const $error = stateAtom(null); return {$error}; }
function createSecondModel() { const $error = stateAtom(null); return {$error}; }
`,
    },
  },
});
assert.equal(sparse.nodes.length, 2);
assert.deepEqual(
  sparse.nodes.map((node) => node.refs[0].occurrence),
  [0, 1],
);
assert.notEqual(sparse.nodes[0].group, sparse.nodes[1].group);
assert.deepEqual(
  sparse.groups.map((group) => group.label),
  ['createFirstModel', 'createSecondModel'],
);

const surfaces = buildSourceScene({
  id: 'surfaces',
  article: '/',
  sources: {
    main: {
      file: 'surface.tsx',
      text: `
import { queryClientAtom } from 'jotai-holo/query';
const client = new QueryClient(); const store = createStore(); store.set(queryClientAtom, client);
const { $name, $email } = prism($draft, {$name: x => x.name, $email: x => x.email});
const $$profile = pipe(createProfileModel, modelRegistry());
const Form = holoForm({view: FormView});
const List = holoList({source: $name, view: ItemView, empty: EmptyView});
const Match = holoMatch({source: $email, cases: {ready: ReadyView}});
const analytics = createAnalytics({engines: {}});
const sent = analytics.event({trigger: unknownFact, map: {}});
function FieldView() { return <input />; }
export function modelFeed(feed) { return source => pipe(source, modelConnection(feed)); }
modelAnalytics(() => loadFactory);
`,
    },
  },
});
for (const label of [
  '$name',
  '$email',
  'Form',
  'List',
  'Match',
  'FieldView',
  '$$profile',
  'sent',
  'analytics',
  'modelFeed',
  'modelAnalytics',
  'queryClientAtom',
]) {
  assert.ok(
    surfaces.nodes.some((node) => node.label === label),
    label,
  );
}
assert.equal(surfaces.groups.find((group) => group.label === '$$profile').registry, true);
assert.ok(surfaces.nodes.find((node) => node.label === '$$profile').kind === 'resource');
assert.ok(
  surfaces.edges.some(
    (edge) =>
      edge.from === surfaces.nodes.find((node) => node.label === '$email').id &&
      edge.to === surfaces.nodes.find((node) => node.label === 'Match').id,
  ),
);
assert.ok(
  surfaces.edges.some(
    (edge) => edge.to === surfaces.nodes.find((node) => node.label === 'ReadyView').id,
  ),
);
assert.ok(
  surfaces.edges.some(
    (edge) =>
      edge.from === surfaces.nodes.find((node) => node.label === 'store').id &&
      edge.to === surfaces.nodes.find((node) => node.label === 'queryClientAtom').id,
  ),
);

const instances = buildSourceScene({
  id: 'instances',
  article: '/',
  sources: {
    main: {
      file: 'instances.tsx',
      text: `
const $global = atom('shared');
function createFiltersModel() { const $term = atom(''); const $size = ion($term, term => term.length); return {$term, $size, $global}; }
const $$catalog = createFiltersModel(); const $$wishlist = createFiltersModel();
const $$first = pipe(createFiltersModel, modelRegistry()); const $$second = pipe(createFiltersModel, modelConnection(connect));
const Catalog = holo({view: CatalogView, read:{term: $$catalog.$term, global: $$catalog.$global}});
const Wishlist = holo({view: WishlistView, read:{term: $$wishlist.$term, global: $$wishlist.$global}});
const $quantity = atom(2); const $discount = atom(1); const $total = ion({quantity: $quantity, discount: $discount}, x => x.quantity - x.discount);
`,
    },
  },
});
const named = (label) => instances.nodes.find((node) => node.label === label);
const instanceGroup = (label) => instances.groups.find((group) => group.label === label);
assert.ok(instanceGroup('$$catalog'));
assert.ok(instanceGroup('$$wishlist'));
assert.ok(instanceGroup('$$first').registry);
assert.equal(instanceGroup('$$second').registry, false);
assert.ok(instanceGroup('createFiltersModel'));
const reads = (label) =>
  instances.edges.filter((edge) => edge.to === named(label).id && edge.kind === 'read');
const catalogTerm = reads('Catalog').find(
  (edge) => instances.nodes.find((node) => node.id === edge.from).label === '$term',
).from;
const wishlistTerm = reads('Wishlist').find(
  (edge) => instances.nodes.find((node) => node.id === edge.from).label === '$term',
).from;
assert.notEqual(catalogTerm, wishlistTerm);
assert.equal(
  instances.nodes.find((node) => node.id === catalogTerm).group,
  instanceGroup('$$catalog').id,
);
assert.equal(
  instances.nodes.find((node) => node.id === wishlistTerm).group,
  instanceGroup('$$wishlist').id,
);
assert.ok(reads('Catalog').some((edge) => edge.from === named('$global').id));
assert.ok(reads('Wishlist').some((edge) => edge.from === named('$global').id));
assert.equal(instances.nodes.filter((node) => node.label === '$global').length, 1);
for (const group of instances.groups) {
  const [x, y, w, h] = group.bounds;
  assert.ok(x >= 0 && y >= 0 && x + w <= 1000 && y + h <= 650);
  for (const node of instances.nodes) {
    const inside =
      node.position[0] > x &&
      node.position[0] < x + w &&
      node.position[1] > y &&
      node.position[1] < y + h;
    assert.equal(inside, node.group === group.id, group.label + ':' + node.label);
  }
}
for (const label of ['$quantity', '$discount'])
  assert.ok(
    instances.edges.some((edge) => edge.from === named(label).id && edge.to === named('$total').id),
  );

const connections = buildSourceScene({
  id: 'connections',
  article: '/',
  sources: {
    main: {
      file: 'connections.ts',
      text: `
function createMModel(){const received=eventAtom();return {received};}
const a=eventAtom();const b=eventAtom();
const $$first=pipe(createMModel, modelConnection(m=>[bond({trigger:a,write:m.received})]));
const $$second=pipe(createMModel, modelConnection(m=>[bond({trigger:b,write:m.received})]));
`,
    },
  },
});
const facts = connections.edges.filter((edge) => edge.kind === 'fact');
assert.equal(facts.length, 2);
for (const [trigger, group] of [
  ['a', '$$first'],
  ['b', '$$second'],
]) {
  const source = connections.nodes.find((node) => node.label === trigger);
  const targetGroup = connections.groups.find((item) => item.label === group);
  const target = connections.nodes.find(
    (node) => node.label === 'received' && node.group === targetGroup.id,
  );
  assert.ok(facts.some((edge) => edge.from === source.id && edge.to === target.id));
}

const alternatives = buildSourceScene({
  id: 'alternatives',
  article: '/',
  sources: {
    main: {
      file: 'alternatives.tsx',
      text: `
const $value = atom('first');
const First = holo({view: FirstView, read: {value: $value}});
const $value = atom('second');
const Second = holo({view: SecondView, read: {value: $value}});
`,
    },
  },
});
assert.equal(alternatives.nodes.filter((node) => node.label === '$value').length, 2);
assert.equal(alternatives.edges.filter((edge) => edge.kind === 'read').length, 0);

console.log(
  'Source scene extraction: scope, registry, composition, bindings, adapters, declarations and source evidence passed.',
);
