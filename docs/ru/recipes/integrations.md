# Эффекты и Bunshi

## Ресурс на время подписки

Используйте `withAtomEffect`, когда внешний ресурс должен жить, пока читается конкретный атом. В state нужно привязать **возвращённый атом**, а не исходный. Пример наблюдает состояние; на этом же месте эффект может вернуть cleanup ресурса.

<<< @/../examples/effect.tsx

Для эффекта на уровне приложения вызывайте `observe(effect, store)` при создании runtime и освобождайте возвращённый disposer. Используйте тот же store, что и в Provider. `atomEffect` подходит для эффекта, активного при подписке на его атом. Подробности — в [Jotai effect](https://jotai.org/docs/extensions/effect). Holo не добавляет effectAtom или поле effects.

## Модель в scope

<<< @/../examples/bunshi.tsx

`holoMolecule` описывает выбор атомов вне render и вызывает useMolecule внутри привязки. Идентичностью и ресурсами модели управляет Bunshi; значениями атомов — Jotai store. ScopeProvider задаёт Bunshi scope, а Provider Jotai — отдельную границу хранения.

Если сама молекула создаёт store и observe-эффекты, Provider приложения должен получить именно этот store. Обычный holo не вставляет его автоматически. Полный пример: [bunshi-effect.tsx](https://github.com/ggkguelensan/jotai-holo/blob/docs/reference-site/examples/bunshi-effect.tsx).

## Почему это отдельные инструменты?

[Молекулы Bunshi](https://github.com/saasquatch/bunshi) решают DI и lifetime, [jotai-effect](https://jotai.org/docs/extensions/effect) — реактивные ресурсы, holo — привязку View. Разделение позволяет использовать нативные инструменты и не включать Bunshi в приложения, которым он не нужен. Ограничения описаны в [holoMolecule](/ru/reference/holoMolecule) и [cage](/ru/reference/cage).
