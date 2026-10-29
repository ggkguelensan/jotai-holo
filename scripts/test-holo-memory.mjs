import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = `${root}.model-runtime-memory`;
let server, browser;
try {
  await mkdir(fixture, { recursive: true });
  await writeFile(
    `${fixture}/index.html`,
    '<div id="root"></div><script type="module" src="/main.js"></script>',
  );
  await writeFile(
    `${fixture}/main.js`,
    `
import {createElement as h,useEffect,useMemo,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {atom,createStore,Provider,useAtomValue,useSetAtom,useStore} from 'jotai';
import {holo,useHoloEvents,eventAtom} from '../dist/index.js';
import {pipe,modelRegistry,modelConnection} from '../dist/model.js';
const store=createStore();const $shared=atom('shared');let refs;let active=0;let subscriptions=0;
function createRuntime(){
 const $count=atom(0),$pending=atom(new Promise(()=>{}));
 $count.onMount=()=>{subscriptions++;return()=>{subscriptions--}};
 const increment=atom(null,(_get,set)=>set($count,n=>n+1));
 const model={$count,$pending,increment,changed:eventAtom()};
 refs.models.push(new WeakRef(model));refs.atoms.push(new WeakRef($count),new WeakRef($pending));return model;
}
function definition(retainTime){return pipe(createRuntime,modelRegistry({retainTime}),modelConnection(()=>{active++;return()=>{active--}}))}
const finite=definition(0),permanent=definition(Infinity);
function View({count,increment}){useEffect(()=>{refs.callbacks.push(new WeakRef(increment))},[increment]);return h('button',{onClick:increment},count)}
function ImperativeView({events,...props}){useHoloEvents(events,{changed(){props.increment()}});useEffect(()=>{refs.handles.push(new WeakRef(events.current))},[events]);return h(View,props)}
const Modern=holo({models:{counter:props=>finite({key:[props.instanceKey]})},view:ImperativeView,read:({counter})=>({shared:$shared,count:counter.$count}),write:({counter})=>({increment:counter.increment}),events:({counter})=>({changed:counter.changed})});
const Pending=holo({models:{counter:props=>finite({key:[props.instanceKey]})},view:ImperativeView,read:({counter})=>({shared:$shared,count:counter.$pending}),write:({counter})=>({increment:counter.increment}),events:({counter})=>({changed:counter.changed})});
const Default=holo({models:{counter:permanent},view:ImperativeView,read:({counter})=>({shared:$shared,count:counter.$count}),write:({counter})=>({increment:counter.increment}),events:({counter})=>({changed:counter.changed})});
const DefaultPending=holo({models:{counter:permanent},view:ImperativeView,read:({counter})=>({shared:$shared,count:counter.$pending}),write:({counter})=>({increment:counter.increment}),events:({counter})=>({changed:counter.changed})});
function Native({pending,instanceKey}){const current=useStore();const selected=useMemo(()=>finite({key:[instanceKey]}),[instanceKey]);const model=useAtomValue(selected);const shared=useAtomValue($shared);const count=useAtomValue(pending?model.$pending:model.$count);const increment=useSetAtom(model.increment);useEffect(()=>finite.acquire(current,{key:[instanceKey]}).release,[current,instanceKey]);return h(View,{count,increment,shared})}
const tick=()=>new Promise(r=>setTimeout(r,0));window.samples={};
window.run=async(mode,cycles)=>{
 refs={models:[],atoms:[],callbacks:[],handles:[]};const root=createRoot(document.getElementById('root'));const pending=mode.endsWith('-suspended');
 const Page=mode.startsWith('default-')?(pending?DefaultPending:Default):mode.startsWith('modern')?(pending?Pending:Modern):Native;
 for(let i=0;i<cycles;i++){
  flushSync(()=>root.render(h(Provider,{store:mode.startsWith('default-')?createStore():store},h(Suspense,{fallback:'pending'},h(Page,{pending,instanceKey:mode+':'+i})))));
  await tick();flushSync(()=>root.render(null));await tick();
 }
 flushSync(()=>root.unmount());await tick();window.samples[mode]=refs;return{created:refs.models.length,active,subscriptions};
};
window.retained=mode=>Object.fromEntries(Object.entries(window.samples[mode]).map(([key,values])=>[key,values.filter(ref=>ref.deref()!==undefined).length]));window.ready=true;
`,
  );
  await build({
    configFile: false,
    root: fixture,
    logLevel: 'silent',
    build: { outDir: 'output', emptyOutDir: true, target: 'es2022' },
  });
  server = await preview({
    configFile: false,
    root: fixture,
    logLevel: 'silent',
    build: { outDir: 'output' },
    preview: { host: '127.0.0.1', port: 0 },
  });
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => window.ready);
  const cdp = await page.context().newCDPSession(page),
    report = {};
  for (const mode of [
    'native',
    'native-suspended',
    'modern',
    'modern-suspended',
    'default-discarded-store',
    'default-discarded-store-suspended',
  ]) {
    const lifecycle = await page.evaluate(({ mode, cycles }) => window.run(mode, cycles), {
      mode,
      cycles: 200,
    });
    assert.ok(lifecycle.created >= 200);
    assert.equal(lifecycle.active, 0);
    assert.equal(lifecycle.subscriptions, 0);
    for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
    const retained = await page.evaluate((mode) => window.retained(mode), mode);
    report[mode] = { ...lifecycle, retained };
    assert.deepEqual(
      retained,
      { models: 0, atoms: 0, callbacks: 0, handles: 0 },
      JSON.stringify(report),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { mode: 'production React + Chromium forced GC', cyclesPerCase: 200, report },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => (server ? server.httpServer.close(resolve) : resolve()));
  await rm(fixture, { recursive: true, force: true });
}
