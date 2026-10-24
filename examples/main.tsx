import { createRoot } from 'react-dom/client';
import { Provider } from 'jotai';
import { createInjector, InjectorProvider } from 'bunshi/react';
import { BasicCounter } from './basic.js';
import { EffectCounter } from './effect.js';
import { BunshiCounters } from './bunshi.js';
import { BunshiEffectCounter } from './bunshi-effect.js';
import { AsyncExample } from './async.js';
import './style.css';

// For SSR, create both the injector and Jotai store per request.
const injector = createInjector();
const root = document.getElementById('root');
if (!root) throw new Error('Missing root');
createRoot(root).render(
  <InjectorProvider value={() => injector}>
    <Provider>
      <main>
        <h1>jotai-holo</h1>
        <p>Plain React cores. Declarative Jotai bindings.</p>
        <BasicCounter />
        <EffectCounter />
        <BunshiCounters />
        <BunshiEffectCounter />
        <AsyncExample />
      </main>
    </Provider>
  </InjectorProvider>,
);
