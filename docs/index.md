---
layout: home
hero:
  name: jotai-holo
  text: Native atoms. Plain Views.
  tagline: Connect Jotai models to React Views. Keep data changes in the model and rendering in the View.
  image:
    src: /mark.svg
    alt: Molecular mark with React at its center
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Read the API
      link: /reference/holo
features:
  - title: Views stay ordinary
    details: Strings, objects and callbacks. Bind outside render and test Views with plain props.
  - title: Atoms stay native
    details: Use existing Jotai atoms, effects and async reads. No model migration or replacement runtime.
  - title: Lifetimes stay explicit
    details: Share models by key within a store. Start and stop subscriptions with the widgets that use them.
---

## Try the model

Change the quantity or apply a discount. `ion` derives the total; `holo` supplies values and callbacks to an ordinary View.

<Demo kind="ion">

<<< @/../examples/docs/ion.tsx#ion

</Demo>

## Start with a task

- [Bind a View](/overview/holo) without forwarding hooks.
- [Save a profile](/recipes/profile) and react to the confirmed fact.
- [Choose existing ecosystem tools](/guide/ecosystem) before adding an abstraction.
- [Understand lazy projections and rendering](/guide/rendering).

::: info Development documentation
This site documents the current implementation, not a published npm release. Read the [availability and requirements](/guide/getting-started#availability-and-requirements) first. Guides, API references and live examples are available in English, Russian, German and Kazakh. Engineering reports are maintained in English.
:::
