import { sourceAliases } from '../../scripts/source-aliases.js';
import { defineConfig, type DefaultTheme } from 'vitepress';
import { locales } from './i18n/locales.mjs';
import { loadCatalog } from './i18n/catalog.mjs';
import { linguiMacros } from './i18n/macros.mjs';
import { logicalCodeBlocks } from './code-blocks.mjs';
import { sourceLinks } from './source-links.mjs';

const sources = sourceLinks();

const groups = (t: (message: string) => string) => [
  { title: t('State'), names: ['stateAtom', 'ion', 'prism'] },
  { title: t('Commands & events'), names: ['actionAtom', 'eventAtom', 'bond'] },
  { title: t('React bindings'), names: ['holo', 'useHoloEvents', 'holoList', 'holoMatch'] },
  {
    title: t('Models'),
    names: ['defineModel', 'pipe', 'modelRegistry', 'modelLifecycle', 'modelConnection'],
  },
  {
    title: 'TanStack Query',
    names: ['createQueryModel', 'createMutationModel', 'queryClientAtom'],
  },
  { title: 'React Hook Form', names: ['createFormModel', 'holoForm', 'formAtom'] },
  { title: t('Analytics'), names: ['createAnalytics', 'modelAnalytics', 'createAmplitudeAdapter'] },
  { title: t('Persistence'), names: ['persist', 'localStorageAdapter'] },
];

async function localeConfig(code: string, label: string, prefix: string) {
  const catalog = await loadCatalog(code, 'ui');
  const t = (message: string) => catalog._(message);
  const link = (path: string) => `${prefix}${path}`;
  const introduction: DefaultTheme.SidebarItem[] = [
    {
      text: t('Introduction'),
      items: [
        { text: t('Getting started'), link: link('/guide/getting-started') },
        { text: t('Why jotai-holo'), link: link('/guide/motivation') },
        { text: t('Architecture and stack'), link: link('/guide/architecture') },
      ],
    },
  ];
  const topics: DefaultTheme.SidebarItem[] = [
    {
      text: t('Topics'),
      items: [
        { text: 'holo', link: link('/topics/holo') },
        { text: t('Atoms and models'), link: link('/topics/atoms-and-models') },
        { text: t('Models and registry'), link: link('/topics/models-and-registries') },
        { text: 'TanStack Query', link: link('/topics/tanstack-models') },
        { text: 'React Hook Form', link: link('/topics/rhf-models') },
        { text: t('Analytics'), link: link('/topics/analytics') },
        { text: t('Model composition'), link: link('/topics/model-composition') },
      ],
    },
  ];
  const recipes: DefaultTheme.SidebarItem[] = [
    {
      text: t('Recipes'),
      items: [
        { text: t('Choose by the task'), link: link('/recipes/') },
        { text: t('Server data, forms and saving'), link: link('/recipes/server-data') },
        { text: t('Profile: creation and editing'), link: link('/recipes/profile-composition') },
        { text: t('Profile: command → fact → reaction'), link: link('/recipes/profile') },
        { text: t('Effects and model lifetime'), link: link('/recipes/integrations') },
        { text: t('Add an analytics engine'), link: link('/recipes/analytics-adapter') },
      ],
    },
  ];
  const examples: DefaultTheme.SidebarItem[] = [
    {
      text: t('Examples'),
      items: [
        { text: t('All examples'), link: link('/examples/') },
        ...[
          [t('Gift copies'), 'gift-copies'],
          [t('Independent profile fields'), 'profile-fields'],
          [t('Small Views and committed inputs'), 'view-bindings'],
          [t('Order confirmation'), 'order-confirmation'],
          [t('View methods'), 'view-methods'],
          [t('Independent gift drafts'), 'model-instances'],
          [t('Game catalog'), 'game-catalog'],
          [t('Sale campaign'), 'sale-campaign'],
          [t('Player notification settings'), 'player-notifications'],
          [t('Rows and screen states'), 'lists-and-branches'],
          [t('Catalog analytics'), 'catalog-analytics'],
          [t('Spreadsheet formulas'), 'spreadsheet'],
        ].map(([title, slug]) => ({ text: title!, link: link(`/examples/${slug}`) })),
      ],
    },
  ];
  const reference: DefaultTheme.SidebarItem[] = groups(t).map(({ title, names }) => ({
    text: title,
    items: names.map((text) => ({ text, link: link(`/reference/${text}`) })),
  }));
  const sidebar = Object.fromEntries(
    [
      ['guide', introduction],
      ['topics', topics],
      ['overview', topics],
      ['recipes', recipes],
      ['reference', reference],
      ['examples', examples],
    ].map(([section, items]) => [link(`/${section}/`), items]),
  );
  return {
    label,
    lang: code,
    description: t('Plain React views. Native Jotai models. Declarative connections.'),
    themeConfig: {
      nav: [
        { text: t('Introduction'), link: link('/guide/getting-started') },
        { text: t('Topics'), link: link('/topics/') },
        { text: t('Recipes'), link: link('/recipes/') },
        { text: 'API', link: link('/reference/holo') },
        { text: t('Examples'), link: link('/examples/') },
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
        graphAtoms: t('Atoms and models'),
        graphAnalytics: t('Analytics'),
        graph: {
          title: t('Example graph'),
          open: t('Open full map'),
          back: t('Back to the article'),
          loading: t('Loading graph…'),
          unavailable: t('The graph is unavailable. The example code remains readable.'),
          hint: t('Select a node to inspect its source.'),
          clear: t('Clear selection'),
          caller: t('External caller; its implementation is not part of this example.'),
          source: t('Source code'),
          structure: t('Connections describe dependencies, not execution order.'),
          live: t('Adapter deliveries highlight the corresponding branch.'),
          noReplay: t(
            'Observation starts after the analytics factory loads; earlier facts are not replayed.',
          ),
          kinds: {
            model: t('Model'),
            react: t('React component'),
            holo: t('holo binding'),
            atom: t('Atom'),
            resource: t('Managed resource'),
          },
        },
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
