# holoMolecule

Выбирает нативные атомы из scoped-модели Bunshi без объявления holo во время render. Импорт **только** из `jotai-holo/bunshi`.

<Demo kind="bunshi">

<<< @/../examples/docs-bunshi.tsx#bunshi

</Demo>

<<< @/../examples/bunshi.tsx

## Контракт

`const select = holoMolecule(Molecule)`; `select(model => model.$atom)` создаёт дескриптор привязки. Это не атом: его нельзя передать в store.get/set или ion. Размещайте его в holo.state или holo.actions. Можно смешивать дескрипторы и нативные атомы.

Один адаптер разделяет разрешение модели между своими привязками в экземпляре holo. Bunshi управляет injector, scope и lifecycle модели; Jotai хранит значения в store. Смена выбранной scope-модели переключает подписки и колбэки, сохраняя идентичность View. Одна смена модели не перезапускает cage.

Holo не вставляет ScopeProvider и не владеет injector. Context содержит только обычные cage-пропсы, **не разрешённую молекулу**. Текущий адаптер напрямую не решает передачу cage-входов в scoped-модель. В основном holo нет полей molecule/scope.

Опциональные Bunshi-импорты не нужны обычным привязкам. Для SSR создавайте injector/store на каждый запрос. Отчёт о памяти описывает измеренные случаи очистки, а не гарантирует отсутствие любых утечек.

## Почему такой API

Bunshi уже решает scoped DI. Адаптер позволяет обычному holo разрешать atom targets через Bunshi-хуки внутри привязки. Основной API сохраняется, не нужен компонент внутри useMemo, а приложения без Bunshi не получают его рантайм.

## Аналогии и материалы

- [Bunshi repository](https://github.com/saasquatch/bunshi) — исходная реализация molecules, scope и lifecycle.
- [React rules of hooks](https://react.dev/reference/rules/rules-of-hooks) — почему разрешение через хуки выполняется в смонтированном адаптере, а не при загрузке модуля.
