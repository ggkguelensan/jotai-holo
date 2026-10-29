import { createRoot } from 'react-dom/client';
import { Provider } from 'jotai';
import { NameField } from './quickstart.js';
import { BasicCounter } from './basic.js';
import { EffectCounter } from './effect.js';
import { ModelCounters } from './models.js';
import { ModelEffectCounter } from './model-effect.js';
import { AsyncExample } from './async.js';
import { OperatorsExample } from './operators.js';
import { AnalyticsSearch } from './analytics/search.js';
import './style.css';

// For SSR, create a separate Jotai store per request.
const root = document.getElementById('root');
if (!root) throw new Error('Missing root');
createRoot(root).render(
  <Provider>
    <main>
      <h1>jotai-holo</h1>
      <p>Plain React views. Declarative Jotai bindings.</p>
      <section>
        <h2>Getting started</h2>
        <NameField />
      </section>
      <BasicCounter />
      <OperatorsExample />
      <EffectCounter />
      <ModelCounters />
      <ModelEffectCounter />
      <AnalyticsSearch initialTerm="starfall" />
      <AsyncExample />
    </main>
  </Provider>,
);
