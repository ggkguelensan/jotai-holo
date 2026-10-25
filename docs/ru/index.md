---
layout: home
hero:
  name: jotai-holo
  text: Нативные атомы. Обычные View.
  tagline: Опишите связь модели Jotai с React. Сохраните явные команды, факты и lifecycle.
  image:
    src: /mark.svg
    alt: Молекулярный знак с React в центре
  actions:
    - theme: brand
      text: Начать
      link: /ru/guide/getting-started
    - theme: alt
      text: Открыть API
      link: /ru/reference/holo
features:
  - title: Обычные View
    details: Строки, объекты и колбэки. Объявляйте привязки вне render, тестируйте View с обычными пропсами.
  - title: Нативные атомы
    details: Используйте существующие атомы Jotai, эффекты и async-чтения без миграции модели и нового рантайма.
  - title: Явное владение
    details: Связи событий в конкретном store, committed lifecycle-входы и опциональные scope Bunshi.
---

## Попробуйте модель

Измените количество или включите скидку. `ion` пересчитывает сумму, `holo` передаёт значения и колбэки в обычный View.

<Demo kind="ion">

<<< @/../examples/docs-demos.tsx#ion

</Demo>

## Начните с задачи

- [Связать View](/ru/reference/holo) без forwarding-хука.
- [Сохранить профиль](/ru/recipes/profile) и отреагировать на подтверждённый факт.
- [Выбрать готовый инструмент экосистемы](/ru/guide/ecosystem) перед добавлением абстракции.
- [Понять ленивость проекций и рендеринг](/ru/guide/rendering).

::: info Документация разрабатываемой версии
Сайт описывает текущую реализацию, а не опубликованный npm-релиз. Сначала прочитайте [доступность и требования](/ru/guide/getting-started#доступность-и-требования). Руководство и API есть на двух языках, технические отчёты — на английском.
:::
