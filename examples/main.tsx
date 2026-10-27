import { createRoot } from 'react-dom/client';
import { Provider } from 'jotai';
import { BasicCounter } from './basic.js';
import { EffectCounter } from './effect.js';
import { ModelCounters } from './models.js';
import { ModelEffectCounter } from './model-effect.js';
import { AsyncExample } from './async.js';
import { OperatorsExample } from './operators.js';
import './style.css';

// For SSR, create a separate Jotai store per request.
const root = document.getElementById('root');
if (!root) throw new Error('Missing root');
createRoot(root).render(
  <Provider>
    <main>
      <h1>jotai-holo</h1>
      <p>Plain React views. Declarative Jotai bindings.</p>
      <BasicCounter />
      <OperatorsExample />
      <EffectCounter />
      <ModelCounters />
      <ModelEffectCounter />
      <AsyncExample />
    </main>
  </Provider>,
);
