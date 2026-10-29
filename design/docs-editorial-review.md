# Documentation editorial review

Engineering note for the documentation revision. This records review goals and acceptance criteria; it is not a reader-facing article or a new runtime contract.

## Global goal

A developer can choose the smallest useful set of tools, predict when they read data or perform work, and connect a business workflow to React without losing ownership, async or isolation guarantees.

The revision must improve explanations, not merely shorten sentences. Topics teach a mechanism; recipes solve a task; reference pages support exact lookup; examples provide complete executable applications. Each explanation has one primary home.

## Learning sequence

1. A View receives ordinary props.
2. holo.read supplies atom values; holo.write supplies callbacks. Models are optional.
3. A factory creates a record of related atoms and commands.
4. A definition and selection identify an instance in a store; a registry can share it by key.
5. Reading a selected instance does not activate external work.
6. Committed owners activate connections. The last owner disconnects them.
7. Retention preserves the instance, not its subscriptions.
8. Application composition connects external systems to business commands and facts.

Introduce factory, definition, selection atom, instance and owner at their first use. Use the same names in prose and code. Preserve current behavior: this revision does not introduce key-required registries, initial bond delivery, modelForm, or a pre-import analytics fact buffer.

## Reader routes

- First binding: Getting started → Holo → Atoms and models → Models and registry.
- Business workflow: Atoms and models → Composition → relevant recipe.
- Integration author: Models and registry → Composition → integration topic → API.
- Debugging: API contract → focused example. No mandatory introductory detour.

## Page goals

| Page                | Assumed knowledge            | Result of reading                                             |
| ------------------- | ---------------------------- | ------------------------------------------------------------- |
| Getting started     | React props and a Jotai atom | Run a View with a reactive value and callback                 |
| Motivation          | One working binding          | Recognize where separating View and binding helps             |
| Architecture        | Atoms and Views              | Assign rules, cache, form state and analytics to their owners |
| Holo                | Jotai reads and writes       | Follow read, write, input, static and events directions       |
| Atoms and models    | Native atoms                 | Choose a module atom, factory or registry                     |
| Models and registry | A model factory              | Predict identity, sharing, retention and last-owner cleanup   |
| Model composition   | Instance and owner           | Compose and author type-preserving modifiers                  |
| TanStack models     | Query options and cache      | Decide whether an atom adapter is needed and connect a source |
| RHF models          | RHF controls and providers   | Share one control without duplicating form state              |
| Analytics           | Commands and occurred facts  | Map each engine's payload and predict lazy-loading limits     |

## Evidence in the pre-revision pages

| Location                                                        | Evidence                                                                                    | Reader cost / required change                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| topics/models-and-registries.md, Why use a registry?            | “Copies and Toolbar select the Atlas instance”, followed by a profile example               | Reconcile two scenarios mentally; use one entity and show both owners                      |
| topics/holo.md, Input synchronization / Imperative View methods | One sentence per mechanism                                                                  | A topic promises explanation but provides labels; add one concrete path each               |
| topics/tanstack-models.md, createQueryModel                     | Repeated native-hook guidance before a working flow                                         | Reader encounters caveats before understanding the adapter; show the useful path first     |
| topics/rhf-models.md, createFormModel                           | “Creating another Jotai mirror…”                                                            | Defends against an unintroduced alternative before explaining the shared control           |
| recipes/server-data.md and profile-composition.md               | Repeated source, initialization, save and reset paragraphs                                  | Two competing homes for one workflow; use a task router and one complete profile narrative |
| recipes/server-data.md, registry section                        | Profile text switches to “Another gift order ID”                                            | Entity identity changes mid-explanation                                                    |
| reference/createMutationModel.md, introduction                  | “This local simulation rejects discounts above 25%” without that simulation                 | Prose points at removed context                                                            |
| reference/modelRegistry.md, Contract                            | Identity, initial data, reads, acquisition, cleanup, retention and removal in one paragraph | Exact contract lookup requires unpacking every sentence; separate fields and lifecycle     |
| reference/createQueryModel.md, Contract                         | Long bullets mix options, lifecycle, Suspense and imperative reads; no Usage                | Missing entry point and high lookup cost                                                   |
| API reference pages                                             | “for the complete workflow and live examples”                                               | Repeated generic transitions provide little navigation value                               |
| recipes/profile.md, Independent reaction                        | Historical nameChanged counterexample                                                       | Discussion history interrupts the actual save→fact→notification sequence                   |
| guide/getting-started.md                                        | Model introduced before definition; state/action/prism/holo in the first step               | Too many independent ideas before a first result                                           |

## Acceptance rubric

Score each dimension 0–2. Accept at 10/12 or higher, with no zero for correctness. Judges must cite a passage or example rather than report a general impression.

1. Useful action: the reader can name what they can do after reading.
2. Context: new concepts are introduced before they are used.
3. Sequence: situation → working path → mechanism → limitations.
4. Evidence: the example demonstrates the claim and matches the prose's names.
5. Correctness: ownership, equality, async behavior and cleanup remain accurate; no proposed API is presented as implemented.
6. Attention: no duplicate article, discussion history, generic filler or premature defensive caveat.

Global review also checks one primary home per concept, prerequisites along each route, distinct roles for topics/recipes/reference/examples, and consistent terminology. Do not mechanically impose the same section template on every page.

## Validation

- Keep existing route fragments working when headings change.
- Preserve executable snippet regions and CodeNotes anchors.
- Typecheck examples and verify internal links.
- Translate canonical English through the existing Lingui pipeline.
- Judge the revised page against its local goal, then re-read its incoming and outgoing links as a route.

## Editorial sources

- [Maxim Ilyakhov: levels of editing](https://bureau.ru/books/pishi/12): work on usefulness and structure as well as words and sentences.
- [Publisher explanation of Ясно, понятно](https://alpinabook.ru/blog/yasno-ponyatno/): context, interest, explanation and presentation.

These sources motivate the review questions. They do not imply that shorter text is always better, nor replace validation of the library's actual contracts.

## Applied changes

| Earlier explanation                                             | Revised path                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Five utilities before the first visible result                  | One writable atom → ordinary View → read/write binding → edit Ada                       |
| Registry promises Atlas/Beacon but shows a profile              | One gift order factory → Copies and Toolbar → shared ID → retained state                |
| Factory, definition, record and owner used interchangeably      | Introduce each operation where the reader performs it                                   |
| Query and RHF introductions lead with alternatives and warnings | Show source/projections or shared control first; then explain when native hooks suffice |
| Server-data and profile recipes repeat the same workflow        | Server-data routes tasks; profile-composition owns the detailed loading/save sequence   |
| Reference pages send everyone to a generic “complete workflow”  | Exact usage, options and lifecycle lookup; links identify a concrete next task          |
| Example pages show a demo without an observation task           | Short instructions tell the reader what to change and what result to inspect            |

The reference pages intentionally grew where an exact answer was missing. In
particular, registry acquisition, flushing and removal now have separate lookup
sections. Integration examples state which endpoint the application must supply.

## Review boundaries

Independent editorial and technical judges reviewed the introductory route,
seven topics, selected integration references and profile recipes. They caught
a false promise about edits made during a pending save, a quickstart that was
not mounted, missing prerequisites and broken heading links. These findings were
corrected before translation. The rubric supports review; its scores are not a
measurement of comprehension by real readers.

This revision does not implement the APIs discussed during design but absent
from the library. In particular, no pre-import domain-fact buffer or multi-step
form wizard is presented as working code. The analytics delivery queue stores
mapped messages after observation begins. A separate form draft is explained as
an explicit policy; receiving a save response does not merge concurrent business
edits automatically.

Future edits should be judged in context: start at an incoming link, perform the
article's task, then follow its next step. A technically correct paragraph can
still fail if the page has not introduced the concepts it uses.
