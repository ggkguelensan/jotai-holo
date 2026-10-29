import quickstart from '../../../examples/quickstart.tsx?raw';
import atoms from '../../../examples/atoms-or-models.tsx?raw';
import business from '../../../examples/analytics/search-model.ts?raw';
import analytics from '../../../examples/analytics/search.analytics.ts?raw';
import provider from '../../../examples/analytics/application-analytics.ts?raw';
import recording from '../../../examples/docs/analytics-recording.ts?raw';
import type { GraphScene } from './contracts';

const ref = (source: string, anchor: string) => ({ source, anchor });
export const scenes: Readonly<Record<string, GraphScene>> = {
  'holo-basics': {
    id: 'holo-basics',
    title: 'holo',
    article: '/topics/holo#mental-model',
    sources: { quickstart: { file: 'examples/quickstart.tsx', text: quickstart } },
    groups: [],
    nodes: [
      { id: 'parent', kind: 'react', label: 'Parent', refs: [], position: [110, 450] },
      {
        id: 'name',
        kind: 'atom',
        label: '$name',
        refs: [ref('quickstart', 'export const $name')],
        position: [450, 160],
      },
      {
        id: 'binding',
        kind: 'holo',
        label: 'NameField',
        refs: [ref('quickstart', 'export const NameField')],
        position: [450, 450],
      },
      {
        id: 'view',
        kind: 'react',
        label: 'NameView',
        refs: [ref('quickstart', 'export function NameView'), ref('quickstart', 'view: NameView')],
        position: [790, 450],
      },
    ],
    edges: [
      { from: 'parent', to: 'binding', kind: 'props' },
      { from: 'name', to: 'binding', kind: 'read' },
      { from: 'binding', to: 'name', kind: 'write' },
      { from: 'binding', to: 'view', kind: 'props' },
      { from: 'view', to: 'binding', kind: 'write' },
    ],
  },
  'shared-atoms': {
    id: 'shared-atoms',
    title: 'atoms',
    article: '/topics/atoms-and-models#global-state-and-events-just-atoms',
    sources: { atoms: { file: 'examples/atoms-or-models.tsx', text: atoms } },
    groups: [],
    nodes: [
      {
        id: 'theme',
        kind: 'atom',
        label: '$theme',
        refs: [ref('atoms', 'export const $theme')],
        position: [340, 130],
      },
      {
        id: 'help',
        kind: 'atom',
        label: 'helpRequested',
        refs: [ref('atoms', 'export const helpRequested')],
        position: [690, 130],
      },
      {
        id: 'themeBinding',
        kind: 'holo',
        label: 'ThemeControl',
        refs: [ref('atoms', 'const ThemeControl = holo')],
        position: [340, 340],
      },
      {
        id: 'helpBinding',
        kind: 'holo',
        label: 'Help',
        refs: [ref('atoms', 'const Help = holo')],
        position: [690, 340],
      },
      {
        id: 'themeView',
        kind: 'react',
        label: 'ThemeView',
        refs: [ref('atoms', 'function ThemeView'), ref('atoms', 'view: ThemeView')],
        position: [340, 540],
      },
      {
        id: 'helpView',
        kind: 'react',
        label: 'HelpView',
        refs: [ref('atoms', 'function HelpView'), ref('atoms', 'view: HelpView')],
        position: [690, 540],
      },
      {
        id: 'parent',
        kind: 'react',
        label: 'ToolbarView',
        refs: [ref('atoms', 'function ToolbarView')],
        position: [100, 340],
      },
    ],
    edges: [
      { from: 'parent', to: 'themeBinding', kind: 'props' },
      { from: 'parent', to: 'helpBinding', kind: 'props' },
      { from: 'theme', to: 'themeBinding', kind: 'read' },
      { from: 'themeBinding', to: 'theme', kind: 'write' },
      { from: 'helpBinding', to: 'help', kind: 'write' },
      { from: 'themeBinding', to: 'themeView', kind: 'props' },
      { from: 'helpBinding', to: 'helpView', kind: 'props' },
      { from: 'themeView', to: 'themeBinding', kind: 'write' },
      { from: 'helpView', to: 'helpBinding', kind: 'write' },
    ],
  },
  'catalog-analytics': {
    id: 'catalog-analytics',
    title: 'analytics',
    article: '/topics/analytics#map-facts-to-engines',
    demo: 'analytics',
    sources: {
      business: { file: 'examples/analytics/search-model.ts', text: business },
      analytics: { file: 'examples/analytics/search.analytics.ts', text: analytics },
      provider: { file: 'examples/analytics/application-analytics.ts', text: provider },
      recording: { file: 'examples/docs/analytics-recording.ts', text: recording },
    },
    groups: [
      {
        id: 'business',
        kind: 'model',
        refs: [ref('recording', 'export const $$recordedSearch')],
        label: '$$recordedSearch',
        registry: true,
        bounds: [25, 95, 265, 450],
      },
      {
        id: 'analytics',
        kind: 'model',
        refs: [ref('analytics', 'export function createSearchAnalyticsModel')],
        label: 'createSearchAnalyticsModel',
        branch: 'analytics',
        bounds: [325, 95, 300, 450],
      },
      {
        id: 'provider',
        kind: 'resource',
        refs: [ref('provider', 'return createAnalytics({')],
        label: 'createAnalytics',
        branch: 'analytics',
        bounds: [665, 55, 300, 530],
      },
    ],
    nodes: [
      {
        id: 'searchFact',
        kind: 'atom',
        label: 'searchCompleted',
        group: 'business',
        refs: [ref('business', 'const searchCompleted = eventAtom')],
        position: [155, 230],
      },
      {
        id: 'gameFact',
        kind: 'atom',
        label: 'gameOpened',
        group: 'business',
        refs: [ref('business', 'const gameOpened = eventAtom')],
        position: [155, 440],
      },
      {
        id: 'searchMapping',
        kind: 'resource',
        label: 'analytics.event · searchCompleted',
        group: 'analytics',
        branch: 'analytics',
        refs: [ref('analytics', 'const searchCompleted = analytics.event')],
        position: [475, 230],
      },
      {
        id: 'gameMapping',
        kind: 'resource',
        label: 'analytics.event · gameOpened',
        group: 'analytics',
        branch: 'analytics',
        refs: [ref('analytics', 'const gameOpened = analytics.event')],
        position: [475, 440],
      },
      {
        id: 'amplitude',
        kind: 'resource',
        label: 'Amplitude',
        group: 'provider',
        branch: 'analytics',
        refs: [ref('analytics', 'amplitude: (fact)')],
        position: [815, 170],
      },
      {
        id: 'warehouse',
        kind: 'resource',
        label: 'Warehouse',
        group: 'provider',
        branch: 'analytics',
        refs: [ref('analytics', 'warehouse: (fact)')],
        position: [815, 320],
      },
      {
        id: 'posthog',
        kind: 'resource',
        label: 'PostHog',
        group: 'provider',
        branch: 'analytics',
        refs: [ref('analytics', 'posthog: (fact)')],
        position: [815, 470],
      },
    ],
    edges: [
      { from: 'searchFact', to: 'searchMapping', kind: 'fact' },
      { from: 'gameFact', to: 'gameMapping', kind: 'fact' },
      { from: 'searchMapping', to: 'amplitude', kind: 'delivery' },
      { from: 'searchMapping', to: 'warehouse', kind: 'delivery' },
      { from: 'gameMapping', to: 'posthog', kind: 'delivery' },
    ],
  },
};
export function getScene(id: string): GraphScene {
  const scene = scenes[id];
  if (!scene) throw new Error(`Unknown graph scene: ${id}`);
  return scene;
}

/** Load generated source graphs only when their example becomes visible. */
export async function loadScene(id: string): Promise<GraphScene> {
  if (scenes[id]) return scenes[id];
  const generated = import.meta.glob<{ default: GraphScene }>('./.generated/code-*.json');
  const load = generated[`./.generated/${id}.json`] ?? generated[`.generated/${id}.json`];
  if (!load) throw new Error(`Unknown graph scene: ${id}`);
  return (await load()).default;
}
