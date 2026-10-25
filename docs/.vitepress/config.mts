import { defineConfig, type DefaultTheme } from 'vitepress';
import { fileURLToPath } from 'node:url';

const groups = [
  { en: 'State', ru: 'Состояние', names: ['stateAtom', 'ion', 'prism'] },
  {
    en: 'Commands & events',
    ru: 'Команды и события',
    names: ['actionAtom', 'eventAtom', 'subscribeEvent', 'bond'],
  },
  { en: 'React bindings', ru: 'Привязки React', names: ['holo', 'cage', 'holoList', 'holoMatch'] },
  { en: 'Integrations', ru: 'Интеграции', names: ['holoMolecule'] },
];
function sidebar(ru: boolean): DefaultTheme.SidebarItem[] {
  const root = ru ? '/ru' : '';
  return [
    {
      text: ru ? 'Руководство' : 'Guide',
      items: [
        { text: ru ? 'Начало работы' : 'Getting started', link: `${root}/guide/getting-started` },
        { text: ru ? 'Зачем jotai-holo' : 'Why jotai-holo', link: `${root}/guide/motivation` },
        { text: ru ? 'Выбор инструмента' : 'Choosing a tool', link: `${root}/guide/ecosystem` },
        { text: ru ? 'Рендеринг и async' : 'Rendering and async', link: `${root}/guide/rendering` },
      ],
    },
    ...groups.map((group) => ({
      text: ru ? group.ru : group.en,
      items: group.names.map((text) => ({ text, link: `${root}/reference/${text}` })),
    })),
    {
      text: ru ? 'Рецепты' : 'Recipes',
      items: [
        {
          text: ru ? 'Профиль: команда → факт → реакция' : 'Profile: command → fact → reaction',
          link: `${root}/recipes/profile`,
        },
        {
          text: ru ? 'Эффекты и Bunshi' : 'Effects and Bunshi',
          link: `${root}/recipes/integrations`,
        },
        {
          text: ru ? 'Публикация документации' : 'Hosting the docs',
          link: `${root}/guide/hosting`,
        },
      ],
    },
    {
      text: ru ? 'Технические отчёты (EN)' : 'Engineering notes',
      collapsed: true,
      items: [
        { text: 'Compatibility', link: '/compatibility' },
        { text: 'Bundle measurements', link: '/bundle-size' },
        { text: 'Aggregation', link: '/aggregation' },
        { text: 'Bunshi memory validation', link: '/bunshi-validation' },
        { text: 'Detailed contracts', link: '/api' },
        { text: 'Operator contracts', link: '/operators' },
      ],
    },
  ];
}
export default defineConfig({
  title: 'jotai-holo',
  vite: {
    resolve: {
      alias: [
        {
          find: 'jotai-holo/bunshi',
          replacement: fileURLToPath(new URL('../../src/bunshi.ts', import.meta.url)),
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
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'API', link: '/reference/holo' },
        ],
        sidebar: sidebar(false),
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru',
      description: 'Обычные React-компоненты. Нативные модели Jotai. Декларативные связи.',
      themeConfig: {
        nav: [
          { text: 'Руководство', link: '/ru/guide/getting-started' },
          { text: 'API', link: '/ru/reference/holo' },
        ],
        sidebar: sidebar(true),
        outline: { label: 'На этой странице' },
        docFooter: { prev: 'Предыдущая', next: 'Следующая' },
        returnToTopLabel: 'Наверх',
        sidebarMenuLabel: 'Меню',
        darkModeSwitchLabel: 'Оформление',
        lastUpdated: { text: 'Обновлено' },
      },
    },
  },
  themeConfig: {
    logo: '/mark.svg',
    socialLinks: [{ icon: 'github', link: 'https://github.com/ggkguelensan/jotai-holo' }],
    search: {
      provider: 'local',
      options: {
        locales: {
          ru: {
            translations: {
              button: { buttonText: 'Поиск', buttonAriaLabel: 'Поиск' },
              modal: {
                noResultsText: 'Ничего не найдено',
                resetButtonTitle: 'Очистить',
                footer: { selectText: 'выбрать', navigateText: 'перейти', closeText: 'закрыть' },
              },
            },
          },
        },
      },
    },
    editLink: {
      pattern: 'https://github.com/ggkguelensan/jotai-holo/edit/docs/reference-site/docs/:path',
    },
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
            `https://github.com/ggkguelensan/jotai-holo/blob/docs/reference-site/${path}`,
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
