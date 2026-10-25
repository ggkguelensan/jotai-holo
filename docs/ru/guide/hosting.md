# Публикация документации

## Локальная работа

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
pnpm docs:check
pnpm docs:build
pnpm docs:preview
# Requires Chromium: pnpm exec playwright install chromium
pnpm test:docs
```

VitePress создаёт статический сайт в `docs/.vitepress/dist`. Загрузите эту папку в любой static hosting. Runtime пакета не зависит от VitePress. Для сайта в корне домена base по умолчанию равен `/`.

## GitHub Pages

Для project site задайте base при сборке:

```sh
DOCS_BASE=/jotai-holo/ pnpm docs:build
```

В Settings → Pages выберите GitHub Actions. После попадания документации в default branch запустите workflow **Documentation** вручную. Он проверяет переводы и фрагменты кода, собирает сайт с repo-base и публикует Pages artifact. Создание этих файлов само по себе ничего не публикует; workflow не запускается на push. Чтобы включить автоматическую публикацию после merge, сопровождающий может добавить соответствующий push trigger.

## Сопровождение

Добавляйте справочные страницы одновременно в `docs/reference` и `docs/ru/reference`. Код включается через snippet regions из `examples/documentation.tsx` и других проверяемых примеров. API-страницы содержат назначение, контракт, мотивацию выбора и внешние материалы. Технические отчёты сохранены на английском и так помечены в меню.

`docs:check` проверяет паритет переводов, наличие разделов API, пути внутренних ссылок и snippet regions. `docs:build` дополнительно проверяет ссылки VitePress и создаёт индекс поиска. TypeScript и тесты проверяют исполняемый источник примеров. Проверка доступности внешних сайтов зависит от сети и не входит в локальную сборку.

Базовая ветка для ссылок Edit/source — `docs/reference-site`; после merge замените её в конфигурации сайта и ссылках на `main`.

Материалы: [VitePress deployment](https://vitepress.dev/guide/deploy), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-github-actions-to-create-a-github-pages-site).
