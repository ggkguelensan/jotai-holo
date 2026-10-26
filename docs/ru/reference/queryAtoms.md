# queryAtoms

Переиспользовать Query-фабрики и подписываться на независимые атомы результата.

<Demo kind="query">

<<< @/../examples/docs-infrastructure.tsx#query

</Demo>

## Подключение

Опциональный entry: `jotai-holo/query`. Требуется `@tanstack/query-core` v5 той же версии, что TanStack Query приложения.

## Контракт

`queryAtoms({ state?, query, prism, client? }) → именованные read-only атомы`

- `state` принимает атом, кортеж или объект атомов как ion. При расчёте options читаются все объявленные входы. Query-фабрика получает их значения.
- `query` возвращает полные нативные QueryObserverOptions. Передавайте результат `productDetailQO(params)` целиком. Ключи, queryFn, retry и ресурсные defaults остаются в фабрике. Runtime Query Kit не требуется.
- `prism` — **объект независимых селекторов**. Непрочитанные селекторы не запускаются. Одинаковая проекция не уведомляет потребителя при изменении isFetching в другом поле. Callback, вычисляющий все поля сразу, не поддерживается.
- `client` — QueryClient приложения или атом с ним. Иначе задайте [queryClientAtom](/ru/reference/queryClientAtom) в store. Скрытого клиента нет. Для совместимости с useQuery используйте тот же клиент в QueryClientProvider; жизненный цикл mount/unmount клиента принадлежит приложению.
- Объявление не создаёт observer. Чтение может создать observer и запись в Query cache, но не запускает fetch или подписку. Первая mounted-проекция подключает observer; остальные используют его же. Последняя отписка убирает observer из query. Отменой и gcTime кеша управляет query-core. При remount observer перепривязывается перед подпиской, в том числе после удаления query из кеша.
- Runtime принадлежит паре Jotai store/client. Смена ключа или клиента переносит подписку; запоздалые callback после cleanup игнорируются. Разные store могут намеренно разделять QueryClient, сохраняя собственные observers.
- `enabled`, skipToken, initialData, placeholderData, select, retry, AbortSignal и обычные options сохраняют семантику query-core. Ошибки по умолчанию остаются значениями; throwOnError включает исключение. Адаптер не создаёт Promise для Suspense. Здесь обычный QueryObserver, а не useSuspenseQuery, infinite queries или обёртка мутаций.
- Неподписанный атом кешируется Jotai и не является живой подпиской на внешний кеш. Для свежего императивного чтения используйте QueryClient.getQueryData. Mount сверяет снимок.

Явный notifyOnChangeProps также ограничивает уведомления нативного observer. Не задавайте узкий список, если проекции используют другие поля результата.

## Почему такой API

Отслеживание полей useQuery удобно внутри React-хуков. Для привязки обычного View через holo нужны именованные атомы. Независимые проекции переиспользуют prism и позволяют View с данными игнорировать изменения загрузки. Адаптер работает прямо с QueryObserver, сохраняя сетевую логику и кеш TanStack Query.

## Аналогии и материалы

- [Query Kit](https://github.com/ggkguelensan/tanstack-query-kit) — ресурсные фабрики options без дублирования ключей в потребителях.
- [Оптимизация TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations) — structural sharing, select и отслеживание полей useQuery.
- [Jotai Query](https://jotai.org/docs/extensions/query) — atomWithQuery подходит, когда нужен один атом полного результата.
- [QueryObserver](https://tanstack.com/query/latest/docs/reference/QueryObserver) — жизненный цикл подписки.
