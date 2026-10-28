import { sourceAliases } from '../../scripts/source-aliases.js';
import { defineConfig, type DefaultTheme } from 'vitepress';
import { locales } from './i18n/locales.mjs';
import { loadCatalog } from './i18n/catalog.mjs';
import { linguiMacros } from './i18n/macros.mjs';
import { logicalCodeBlocks } from './code-blocks.mjs';
import { sourceLinks } from './source-links.mjs';

const sources = sourceLinks();

const groups = (t: (message: string) => string) => [
  { title: t('State'), names: ['stateAtom', 'ion', 'prism', 'eq', 'and', 'or', 'some', 'sum'] },
  { title: t('Commands & events'), names: ['actionAtom', 'eventAtom', 'bond'] },
  {
    title: t('React bindings'),
    names: ['holo', 'useImperativeHolo', 'input', 'holoList', 'holoMatch'],
  },
  {
    title: t('Integrations'),
    names: [
      'defineModel',
      'pipe',
      'modelRegistry',
      'modelLifecycle',
      'modelAnalytics',
      'createAnalytics',
      'modelConnection',
      'createQueryModel',
      'createMutationModel',
      'queryClientAtom',
      'createFormModel',
      'holoForm',
      'formAtom',
    ],
  },
];

async function localeConfig(code: string, label: string, prefix: string) {
  const catalog = await loadCatalog(code, 'ui');
  const t = (message: string) => catalog._(message);
  const link = (path: string) => `${prefix}${path}`;
  const sidebar: DefaultTheme.SidebarItem[] = [
    {
      text: t('Start here'),
      items: [
        { text: t('Getting started'), link: link('/guide/getting-started') },
        { text: t('Why jotai-holo'), link: link('/guide/motivation') },
        { text: t('Business logic and small Views'), link: link('/guide/business-logic') },
        { text: t('Choosing a tool'), link: link('/guide/ecosystem') },
      ],
    },
    {
      text: t('Overviews'),
      items: [
        { text: t('All topics'), link: link('/overview/') },
        { text: 'holo', link: link('/overview/holo') },
        { text: t('Atoms and models'), link: link('/guide/atoms-or-models') },
        { text: t('Models and registry'), link: link('/overview/models-and-registry') },
        { text: t('Model composition'), link: link('/guide/model-composition') },
        { text: t('holoMatch and holoList'), link: link('/overview/lists-and-branches') },
        { text: t('Analytics'), link: link('/overview/analytics') },
        { text: 'TanStack Query', link: link('/overview/tanstack-query') },
        { text: 'React Hook Form', link: link('/overview/react-hook-form') },
        { text: t('Jotai operators'), link: link('/overview/jotai-operators') },
        { text: 'bond', link: link('/overview/bond') },
      ],
    },
    {
      text: 'API',
      collapsed: true,
      items: groups(t).map(({ title, names }) => ({
        text: title,
        collapsed: true,
        items: names.map((text) => ({ text, link: link(`/reference/${text}`) })),
      })),
    },
    {
      text: t('Examples'),
      items: [
        { text: t('All examples'), link: link('/recipes/') },
        { text: t('Server data, forms and saving'), link: link('/recipes/server-data') },
        { text: t('Profile: creation and editing'), link: link('/recipes/profile-composition') },
        { text: t('Profile: command → fact → reaction'), link: link('/recipes/profile') },
        { text: t('Effects and model lifetime'), link: link('/recipes/integrations') },
        { text: t('Spreadsheet formulas'), link: link('/recipes/spreadsheet') },
      ],
    },
    {
      text: t('Engineering notes (English)'),
      collapsed: true,
      items: [
        { text: t('Compatibility'), link: '/compatibility' },
        { text: t('Bundle measurements'), link: '/bundle-size' },
        { text: t('Aggregation'), link: '/aggregation' },
        { text: t('Laziness and isolation audit'), link: '/laziness-isolation' },
        { text: t('Detailed contracts'), link: '/api' },
        { text: t('Operator contracts'), link: '/operators' },
        { text: t('Hosting the docs'), link: link('/guide/hosting') },
      ],
    },
  ];
  return {
    label,
    lang: code,
    description: t('Plain React views. Native Jotai models. Declarative connections.'),
    themeConfig: {
      nav: [
        { text: t('Start here'), link: link('/guide/getting-started') },
        { text: t('Overviews'), link: link('/overview/') },
        { text: 'API', link: link('/reference/holo') },
        { text: t('Examples'), link: link('/recipes/') },
      ],
      sidebar,
      docFooter: { prev: t('Previous page'), next: t('Next page') },
      returnToTopLabel: t('Return to top'),
      sidebarMenuLabel: t('Menu'),
      darkModeSwitchLabel: t('Appearance'),
      lightModeSwitchTitle: t('Switch to light theme'),
      darkModeSwitchTitle: t('Switch to dark theme'),
      langMenuLabel: t('Change language'),
      lastUpdated: { text: t('Last updated') },
      editLink: {
        pattern:
          code === 'en'
            ? `${sources.edit}/docs/:path`
            : `${sources.edit}/docs/.vitepress/i18n/locales/${code}/docs.po`,
        text: t('Edit this page'),
      },
      notFound: {
        title: t('Page not found'),
        quote: t('This page may have moved. Find the guide or an API reference in the navigation.'),
        linkLabel: t('Go to home'),
        linkText: t('Go to home'),
      },
      docsUi: {
        liveExample: t('Live example'),
        viewCode: t('View example code'),
        fullSource: t('Complete source with imports'),
        engineeringNotice: t('This engineering report is maintained in English.'),
        englishReport: t('Read the English report'),
      },
    },
    search: {
      translations: {
        button: { buttonText: t('Search'), buttonAriaLabel: t('Search') },
        modal: {
          noResultsText: t('No results for'),
          resetButtonTitle: t('Clear search'),
          displayDetails: t('Display detailed list'),
          backButtonTitle: t('Close search'),
          footer: {
            selectText: t('to select'),
            navigateText: t('to navigate'),
            closeText: t('to close'),
          },
        },
      },
    },
  };
}
const resolved = await Promise.all(
  locales.map(
    async ({ code, label, prefix }) =>
      [code === 'en' ? 'root' : code, await localeConfig(code, label, prefix)] as const,
  ),
);
const localeOptions = Object.fromEntries(
  resolved.map(([key, { search, ...config }]) => [key, config]),
);
const searchLocales = Object.fromEntries(resolved.map(([key, config]) => [key, config.search]));

export default defineConfig({
  title: 'jotai-holo',
  vite: {
    plugins: [linguiMacros()],
    resolve: {
      alias: sourceAliases(),
      dedupe: ['react', 'react-dom', 'jotai'],
    },
  },
  description: 'Plain React views. Native Jotai models. Declarative connections.',
  base: process.env.DOCS_BASE || '/',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    [
      'link',
      { rel: 'icon', type: 'image/svg+xml', href: `${process.env.DOCS_BASE || '/'}mark.svg` },
    ],
  ],
  locales: localeOptions,
  themeConfig: {
    sourceBase: sources.blob,
    logo: '/mark.svg',
    socialLinks: [{ icon: 'github', link: sources.repository }],
    search: { provider: 'local', options: { locales: searchLocales } },
    aside: false,
    outline: false,
  },
  markdown: {
    config(md) {
      logicalCodeBlocks(md);
      // Keep repository file links useful both on GitHub and in the static site.
      const render = md.renderer.rules.link_open;
      md.renderer.rules.link_open = (tokens, index, options, env, self) => {
        const token = tokens[index]!;
        const href = token.attrGet('href');
        if (href?.startsWith('../') && !href.endsWith('.md') && !href.includes('.md#')) {
          const path = href.slice(3);
          token.attrSet('href', `${sources.blob}/${path}`);
        } else if (href?.startsWith('../README.md')) {
          token.attrSet('href', `${sources.repository}#public-api`);
        }
        return render
          ? render(tokens, index, options, env, self)
          : self.renderToken(tokens, index, options);
      };
    },
  },
});
