# Начало работы

jotai-holo связывает нативные модели Jotai с обычными React-компонентами. Начните с `holo`; добавляйте модельные утилиты там, где они делают код понятнее. Переписывать существующие атомы не требуется.

## Доступность и требования

Эта ветка содержит ещё не выпущенную реализацию. Примеры описывают её исходный код, а не опубликованную версию npm. До релиза используйте локальный репозиторий; команда `pnpm add jotai-holo` не гарантирует установку этого API.

Нужны Node 22.12+, React 18 или 19, Jotai 3.0.1+ в пределах v3 и TypeScript 5.9+ со `strict`. См. [проверенную совместимость](/compatibility) на английском.

```sh
git clone https://github.com/ggkguelensan/jotai-holo.git
cd jotai-holo
git switch docs/reference-site
corepack enable
pnpm install --frozen-lockfile
pnpm examples
```

## Объявите связь с View один раз

<<< @/../examples/documentation.tsx#state
<<< @/../examples/documentation.tsx#action
<<< @/../examples/documentation.tsx#prism
<<< @/../examples/documentation.tsx#holo

Отрисуйте `<NameField />`. View получает строки и колбэки и ничего не знает о Jotai. `state` читает атомы, `actions` записывает в них, `bindProps` передаёт фиксированные значения. Объявляйте связь вне React render. Непривязанные пропсы View остаются публичными пропсами компонента.

Фрагменты берутся из общего файла, проверяемого TypeScript; именованные утилиты импортируются из `jotai-holo`. Для моделей без React есть `jotai-holo/vanilla`. Адаптер Bunshi импортируется из `jotai-holo/bunshi`.

## Владение store

Используйте `<Provider store={store}>` из Jotai для изоляции виджета или приложения. Без Provider используется default store Jotai. На сервере создавайте store на каждый SSR-запрос; не помещайте данные разных запросов в общий глобальный store. Определения атомов можно разделять, их значения принадлежат store.

Специальный Provider holo не нужен. Обычные привязки не требуют `connect`. Явное подключение и освобождение нужны только [bond](/ru/reference/bond) и [внешним подпискам на события](/ru/reference/subscribeEvent).

Далее: [мотивация API](/ru/guide/motivation), [сохранение профиля](/ru/recipes/profile), [справочник holo](/ru/reference/holo).
