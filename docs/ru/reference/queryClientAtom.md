# queryClientAtom

Передать QueryClient приложения в Jotai store.

<Demo kind="query">

<<< @/../examples/docs-infrastructure.tsx#query

</Demo>

```ts
import { QueryClient } from '@tanstack/react-query';
import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
const client = new QueryClient();
const store = createStore();
store.set(queryClientAtom, client);
// Тот же client — в QueryClientProvider, store — в Jotai Provider.
```

## Контракт

Нативный writable `Atom<QueryClient | null>`, начальное значение null. Query-привязка без явного client выбрасывает понятную ошибку, если клиент не задан. Замена переносит mounted-подписки. Для SSR создавайте отдельную пару client/store на запрос. Передача клиента сама по себе не вызывает mount или fetch.

## Почему такой API

Явное владение сохраняет общий кеш и hydration с нативным React Query. Явный client в queryAtoms удобен для отдельного виджета, этот атом — для конфигурации приложения.

## Аналогии и материалы

- [QueryClientProvider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider) — владение клиентом.
- [Jotai hydration](https://jotai.org/docs/utilities/ssr) — заполнение store значениями при SSR.
