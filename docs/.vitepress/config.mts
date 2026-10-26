import { defineConfig, type DefaultTheme } from 'vitepress';
import { fileURLToPath } from 'node:url';
import { locales } from './i18n/locales.mjs';
import { loadCatalog } from './i18n/catalog.mjs';

const groups = (t: (message: string) => string) => [
  { title: t('State'), names: ['stateAtom', 'ion', 'prism', 'eq', 'and', 'or', 'some', 'sum'] },
  { title: t('Commands & events'), names: ['actionAtom', 'eventAtom', 'subscribeEvent', 'bond'] },
  { title: t('React bindings'), names: ['holo', 'cage', 'holoList', 'holoMatch'] },
  {
    title: t('Integrations'),
    names: [
      'createModel',
      'queryAtoms',
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
      text: t('Guide'),
      items: [
        { text: t('Getting started'), link: link('/guide/getting-started') },
        { text: t('Why jotai-holo'), link: link('/guide/motivation') },
        { text: t('Choosing a tool'), link: link('/guide/ecosystem') },
        { text: t('Rendering and async'), link: link('/guide/rendering') },
      ],
    },
    ...groups(t).map(({ title, names }) => ({
      text: title,
      items: names.map((text) => ({ text, link: link(`/reference/${text}`) })),
    })),
    {
      text: t('Recipes'),
      items: [
        { text: t('Profile: command → fact → reaction'), link: link('/recipes/profile') },
        { text: t('Effects and model lifetime'), link: link('/recipes/integrations') },
        { text: t('Hosting the docs'), link: link('/guide/hosting') },
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
      ],
    },
  ];
  return {
    label,
    lang: code,
    description: t('Plain React views. Native Jotai models. Declarative connections.'),
    themeConfig: {
      nav: [
        { text: t('Guide'), link: link('/guide/getting-started') },
        { text: 'API', link: link('/reference/holo') },
      ],
      sidebar,
      outline: { label: t('On this page') },
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
            ? 'https://github.com/ggkguelensan/jotai-holo/edit/docs/lingui-i18n/docs/:path'
            : `https://github.com/ggkguelensan/jotai-holo/edit/docs/lingui-i18n/docs/.vitepress/i18n/locales/${code}/docs.po`,
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
    resolve: {
      alias: [
        {
          find: 'jotai-holo/model',
          replacement: fileURLToPath(new URL('../../src/model.ts', import.meta.url)),
        },
        {
          find: 'jotai-holo/query',
          replacement: fileURLToPath(new URL('../../src/query.ts', import.meta.url)),
        },
        {
          find: 'jotai-holo/rhf',
          replacement: fileURLToPath(new URL('../../src/rhf.ts', import.meta.url)),
        },
        {
          find: 'jotai-holo',
          replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
        },
      ],
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
    logo: '/mark.svg',
    socialLinks: [{ icon: 'github', link: 'https://github.com/ggkguelensan/jotai-holo' }],
    search: { provider: 'local', options: { locales: searchLocales } },
    outline: [2, 3],
  },
  markdown: {
    config(md) {
      // Keep repository file links useful both on GitHub and in the static site.
      const render = md.renderer.rules.link_open;
      md.renderer.rules.link_open = (tokens, index, options, env, self) => {
        const token = tokens[index]!;
        const href = token.attrGet('href');
        if (href?.startsWith('../') && !href.endsWith('.md') && !href.includes('.md#')) {
          const path = href.slice(3);
          token.attrSet(
            'href',
            `https://github.com/ggkguelensan/jotai-holo/blob/docs/lingui-i18n/${path}`,
          );
        } else if (href?.startsWith('../README.md')) {
          token.attrSet('href', 'https://github.com/ggkguelensan/jotai-holo#public-api');
        }
        return render
          ? render(tokens, index, options, env, self)
          : self.renderToken(tokens, index, options);
      };
    },
  },
});
