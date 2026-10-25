# eventAtom

Типизированное уведомление с одним payload без хранения состояния события. Импорт из корня или vanilla entry.

<Demo kind="event">

<<< @/../examples/docs-demos.tsx#event

</Demo>

<<< @/../examples/documentation.tsx#event

## Контракт

- `eventAtom<Payload>()` принимает один payload; `eventAtom()` — вызов без payload.
- `store.set(event, payload)` публикует в конкретном store. Одинаковые payload доставляются каждый раз.
- Читаемое значение всегда `null`. Нет последнего payload, replay, персистентности и рассылки между store.
- Функция или Promise передаются как данные без изменения. Событие не вызывает и не ожидает их.
- Подключение: `bond.trigger`, `holo.actions` или `subscribeEvent`. Нативный store.sub не наблюдает эти вызовы.
- Void-событие вызывайте явно в DOM-обработчике: `onClick={() => onOpen()}`, чтобы React event не попал в payload.

Называйте факты по случившемуся: `profileSaved`. Запросы называйте запросами: `saveRequested`; событие запроса не подтверждает успех.

## Почему такой API

Это тонкая обёртка над actionAtom без обработчика. Код публикации не импортирует очередь потребителей. Если потребителям нужно текущее значение, используйте state atom; eventAtom нужен для отдельных случаев, которые нельзя объединять из-за равных payload.

## Аналогии и материалы

- [Effector createEvent](https://effector.dev/en/api/effector/createevent/) — аналогия уведомления, без обещания одинакового рантайма.
- [Jotai atomWithListeners recipe](https://jotai.org/docs/recipes/atom-with-listeners) — рецепт состояния с подписчиками; наше событие не хранит state и явно принадлежит store.
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) — полезное различие между явным взаимодействием и реактивной синхронизацией.
