# ion

Объединяет фиксированную структуру читаемых атомов в один derived atom. Импорт из корня или vanilla entry.

<Demo kind="ion">

<<< @/../examples/docs-demos.tsx#ion

</Demo>

<<< @/../examples/documentation.tsx#ion

## Контракт

`ion(atom | record | tuple, project?) → Atom`

Без project выход повторяет структуру источника. С project содержит его результат. Поддерживаются один атом, объект и кортеж. Источники могут быть нативными атомами или атомами наших утилит.

При необходимом пересчёте читаются все объявленные входы, даже если ветка projector использует одно поле. Для условных зависимостей используйте stateAtom(get => …) или нативный atom. Projector ленив и чист; уведомления определяет Object.is. Входные Promise остаются Promise: в async-projector ожидайте их явно.

## Почему такой API

Нативный derived atom уже умеет объединять данные. Ion явно задаёт источники на границе объявления и сокращает mapping нескольких входов. Он не добавляет auto-await или планировщик. Новый объект результата всё равно меняет ссылку.

## Аналогии и материалы

- [Effector combine](https://effector.dev/en/api/effector/combine/) — аналогия структуры и projector; планирование остаётся у Jotai.
- [Jotai atom](https://jotai.org/docs/core/atom) — исходные контракты primitive, read-only и write-only атомов.

- [Jotai: Composing atoms](https://jotai.org/docs/guides/composing-atoms) — показывает композицию derived и action-атомов, на которую опирается эта тонкая утилита.
