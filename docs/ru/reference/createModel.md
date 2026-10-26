# createModel

Общий default-экземпляр или модель по ключу в Jotai store без дополнительного scope-провайдера.

<Demo kind="model">

<<< @/../examples/docs-infrastructure.tsx#model

</Demo>

## Использование

```ts
import { createModel } from 'jotai-holo/model';

const Proposal = createModel({
  initial: { seats: 5 },
  create: (initial) => createProposal(initial),
  gcTime: Infinity, // по умолчанию
  connect: ($$proposal, store) => $$proposal.saving.connect(store),
});

const $default = Proposal();
const $atlas = Proposal({ key: ['proposal', { id: 'atlas' }] });
const $$atlas = store.get($atlas); // чтение без подключения ресурсов
const lease = Proposal.acquire(store, { key: ['proposal', { id: 'atlas' }] });
lease.release();
Proposal.remove(store, { key: ['proposal', { id: 'atlas' }] });
```

## Контракт

- `create(initial)` — чистая синхронная фабрика объекта. Здесь объявляются атомы, действия и bond. Ресурсы подключаются в `connect(model, store)`.
- Одна definition, структурный ключ и store дают общий экземпляр. Другие definition или store изолируют модели. Без ключа выбирается default, пустой ключ отличается от default.
- Ключ — JSON-подобный массив: конечные числа, строки, boolean, null, массивы и простые объекты. Порядок свойств объекта не важен, порядок массива важен. Undefined, функции, symbol, Date, циклы и бесконечные числа отклоняются.
- `initial` применяется только при создании. Другой вызов с тем же ключом не сбрасывает общую модель. Изменения оформляются явными действиями.
- Простое чтение использует слабый кеш и не подключает ресурсы. Отброшенный render не становится владельцем. Неприобретённый экземпляр может быть создан повторно после GC.
- `acquire` возвращает lease. Первый владелец вызывает connect, последний release — синхронный cleanup. Release идемпотентен. Исключения распространяются; ошибка connect откатывает владельца. Async-работа приложения не отменяется автоматически.
- `gcTime: Infinity` сохраняет приобретённые экземпляры на время жизни store, но подписки отключаются после последнего владельца. Конечный gcTime отсчитывается от release и отменяется при reacquire. Ноль удаляет в следующей задаче, позволяя StrictMode безопасно переподключиться.
- `remove` возвращает false для активного или отсутствующего экземпляра; true после удаления. Старые selection-атомы при следующем чтении получают новое поколение модели. Для неограниченного набора ключей с Infinity нужно явное удаление.
- `holo({ model, … })` приобретает модель после commit и освобождает при cleanup. Выбор по props: `model: props => Proposal({key: […]})`. Фабрики state/actions/cage получают экземпляр. Смена его идентичности перемонтирует подключённый View.

В React lease сохраняется при временном скрытии Suspense. После настоящего unmount или смены модели release планируется в microtask после пассивных cleanup дочернего дерева: синхронный факт из cage.onUnmount успевает пройти через подключённый bond. Явный lease.release() вне React по-прежнему синхронный.

## Почему такой API

Jotai Provider уже определяет store. Реестр использует это владение и явные ключи; фабрика создаёт модель, а lease управляет ресурсами после commit. Если общая модель между виджетами не нужна, достаточно обычной фабрики атомов. Bunshi остаётся альтернативой для injector и автоматического разрешения зависимостей молекул; createModel этого не воспроизводит.

## Аналогии и материалы

- [Jotai store](https://jotai.org/docs/core/store) — владение значениями.
- [Ключи TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — структурная идентичность ресурса; реестр моделей не является сетевым кешем.
- [Bunshi](https://github.com/saasquatch/bunshi) — scopes и dependency injection.
