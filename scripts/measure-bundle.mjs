import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const fixture = `${root}/.bundle-size`;
const manifest = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
const sizes = (code) => ({
  minified: Buffer.byteLength(code),
  gzip: gzipSync(code, { level: 9 }).length,
  brotli: brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
});
const common = `
import {createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {atom,Provider,useAtomValue,useSetAtom} from 'jotai';
function CounterView({count,double,onIncrement,title}){return h('button',{onClick:onIncrement},title+': '+count+'/'+double)}
`;
function app({
  holo = false,
  helpers = false,
  input = false,
  imperative = false,
  model = false,
} = {}) {
  return (
    common +
    `
${holo || helpers || imperative ? "import {holo,stateAtom,actionAtom,eventAtom,useImperativeHolo} from '../dist/index.js';" : ''}
${model ? "import {modelRegistry,pipe} from '../dist/model.js';" : ''}
const $count=${helpers ? 'stateAtom' : 'atom'}(0);
const $double=${helpers ? 'stateAtom' : 'atom'}(get=>get($count)*2);
const increment=${helpers ? 'actionAtom(' : 'atom(null,'}(_get,set)=>{set($count,n=>n+1)});
${model ? 'const $$counter=pipe(()=>({$count,$double,increment}),modelRegistry());' : ''}
${imperative ? "const completed=eventAtom(); function ImperativeView({imperative,...props}){useImperativeHolo(imperative,{onCompleted(){console.log('completed')}});return h(CounterView,props)}" : ''}
${
  holo
    ? `const Counter=holo({view:${imperative ? 'ImperativeView' : 'CounterView'},
${model ? 'models:{counter:$$counter},read:({counter})=>({count:counter.$count,double:counter.$double}),write:({counter})=>({onIncrement:counter.increment}),' : 'read:{count:$count,double:$double},write:{onIncrement:increment},'}
static:{title:'Counter'},
${input ? 'input:{title:atom(null,(_get,_set,title)=>console.log(title))},' : ''}
${imperative ? 'imperative:{onCompleted:completed},' : ''}
});`
    : `function Counter(){const count=useAtomValue($count);const double=useAtomValue($double);const onIncrement=useSetAtom(increment);return h(CounterView,{count,double,onIncrement,title:'Counter'})}`
}
createRoot(document.getElementById('root')).render(h(Provider,null,h(Counter)));
`
  );
}
function inspect(result) {
  const chunks = (Array.isArray(result) ? result.flatMap((r) => r.output) : result.output).filter(
    (o) => o.type === 'chunk',
  );
  const modules = chunks.flatMap((c) => Object.keys(c.modules));
  return {
    ...sizes(chunks.map((c) => c.code).join('\n')),
    modules: modules
      .filter((id) => id.startsWith(`${root}/dist/`))
      .map((id) => id.slice(root.length + 1)),
  };
}
const results = {},
  optionalEntries = {};
try {
  await mkdir(fixture, { recursive: true });
  await writeFile(
    `${fixture}/index.html`,
    '<div id="root"></div><script type="module" src="/main.js"></script>',
  );
  for (const [name, options] of [
    ['native', {}],
    ['helpers', { helpers: true }],
    ['holo', { holo: true }],
    ['holo-and-helpers', { holo: true, helpers: true }],
    ['holo-input', { holo: true, input: true }],
    ['holo-imperative', { holo: true, imperative: true }],
    ['holo-models', { holo: true, model: true }],
  ]) {
    await writeFile(`${fixture}/main.js`, app(options));
    results[name] = inspect(
      await build({
        configFile: false,
        root: fixture,
        logLevel: 'silent',
        build: { write: false, target: 'es2022', minify: 'oxc', modulePreload: false },
      }),
    );
  }
  for (const [name, entry, exports] of [
    ['stateAtom', 'vanilla', ['stateAtom']],
    ['actionAtom', 'vanilla', ['actionAtom']],
    ['eventAtom', 'vanilla', ['eventAtom']],
    ['imperative', 'index', ['useImperativeHolo']],
    ['model', 'model', ['pipe', 'modelRegistry']],
    ['modelLifecycle', 'model', ['modelLifecycle']],
    ['analytics', 'analytics', ['createAnalytics', 'modelAnalytics']],
    ['amplitude', 'analytics-amplitude', ['createAmplitudeAdapter']],
    ['persist', 'persist', ['persist', 'localStorageAdapter']],
    ['query', 'query', ['createQueryModel', 'queryClientAtom']],
    ['mutation', 'query', ['createMutationModel', 'queryClientAtom']],
    ['rhf', 'rhf', ['createFormModel', 'holoForm', 'formAtom']],
  ]) {
    const input = `${fixture}/optional.js`;
    await writeFile(input, `export {${exports.join(',')}} from '../dist/${entry}.js';`);
    optionalEntries[name] = inspect(
      await build({
        configFile: false,
        root,
        logLevel: 'silent',
        build: {
          write: false,
          target: 'es2022',
          minify: 'oxc',
          rolldownOptions: {
            input,
            preserveEntrySignatures: 'strict',
            external: (id) =>
              /^(?:react|jotai|react-hook-form|@tanstack\/query-core)(?:\/|$)/.test(id),
          },
        },
      }),
    );
  }
  for (const name of ['holo', 'holo-input', 'holo-imperative'])
    assert.ok(
      !results[name].modules.some((id) =>
        /\/(?:model|model-composition|analytics|query|rhf|persist)\.js$/.test(id),
      ),
      'Optional infrastructure must stay out of ordinary holo.',
    );
  for (const result of Object.values(results))
    assert.ok(
      !result.modules.some((id) =>
        /(?:bunshi|holo-cage|model-binding|state-binding-atom|\/binding\.js)/.test(id),
      ),
      'Retired runtime must not enter any fixture.',
    );
  const increments = Object.fromEntries(
    Object.entries(results)
      .filter(([name]) => name !== 'native')
      .map(([name, value]) => [
        name,
        Object.fromEntries(
          ['minified', 'gzip', 'brotli'].map((metric) => [
            metric,
            value[metric] - results.native[metric],
          ]),
        ),
      ]),
  );
  console.log(
    JSON.stringify(
      {
        tooling: {
          vite: manifest.devDependencies.vite,
          react: manifest.devDependencies.react,
          jotai: manifest.devDependencies.jotai,
        },
        units: 'bytes; JS only; gzip level 9; Brotli quality 11',
        results,
        increments,
        optionalEntries,
      },
      null,
      2,
    ),
  );
} finally {
  await rm(fixture, { recursive: true, force: true });
}
