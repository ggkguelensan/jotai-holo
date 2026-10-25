# cage

Необязательный lifecycle-раздел holo, а не отдельная экспортируемая функция. Передаёт committed входные пропсы в действия модели.

<<< @/../examples/documentation.tsx#cage

## Контракт

`onMount(get, set, ctx)`, `onChange(get, set, ctx)`, `onUnmount(get, set, ctx)` синхронны и ничего не возвращают. Async-обработчики и cleanup return не поддерживаются. Вызывайте действия; async-политиками управляет модель.

Для committed экземпляра/store порядок такой: mount → первый change → последующие shallow изменения входов → unmount. Изменения state сами по себе не вызывают onChange. `ctx.props` объединяет публичные входы и bindProps, исключает выходы state/actions и содержит последние committed-входы при unmount.

Cage использует passive effects React. StrictMode может повторять mount/change/unmount; обработчики должны это допускать. SSR и отброшенные render не публикуют lifecycle-записи. Смена store Jotai закрывает старый cage и открывает новый. Обычное скрытие через Suspense не закрывает его; первый Suspense откладывает commit.

**Текущее ограничение:** входы выводятся из пропсов View. Даже lifecycle-only вход нужно объявлять в View, как `term` выше. Отдельной схемы входов cage нет. Cage не может инициализировать данные, блокирующие его первый render, и не получает scoped-модель Bunshi через ctx.

## Почему такой API

Gate-подобную передачу пропсов в модель удобно держать рядом с View-привязкой без forwarding-хука. Это не Effector Gate: общего объекта open/close/status нет. Для ресурсов по подписке и реактивных эффектов store используйте jotai-effect, а не cleanup из cage.

## Аналогии и материалы

- [Effector useGate](https://effector.dev/en/api/effector-react/usegate/) — аналогия передачи пропсов в модель без эквивалентного lifecycle-объекта.
- [React useEffect](https://react.dev/reference/react/useEffect) — ограничения commit, cleanup и StrictMode.
- [Jotai effect](https://jotai.org/docs/extensions/effect) — альтернатива для владения ресурсами.
