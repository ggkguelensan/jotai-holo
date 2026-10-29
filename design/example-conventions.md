# Example conventions

## What an example should prove

Choose one reader task and the smallest business scenario that demonstrates it.
Use the same production style in guides, recipes, API snippets and live demos.
Label an intentionally inferior starting point in a refactoring walkthrough;
do not let it read as the recommended implementation.

## Example domain

Use one game-marketplace domain throughout the examples: game catalogs,
wishlists, player profiles, gift orders, libraries, downloads and seller campaigns.
Keep the technical task small. A seller sets campaign discounts; a buyer chooses
an offered promotion. Multiple gift copies represent gifts for a group. Releasing
a download-progress subscription does not cancel the launcher job.

Use consistent fictional game IDs, names and prices. Keep server identity,
editing-session identity and a player's local draft separate. A domain change
must update runnable sources, article copy, translations and behavioral fixtures.

## Views and bindings

- Give each View one useful display or interaction responsibility. Declare a
  named View and its holo binding outside React render.
- Put each subscription beside its consumer. A layout composes connected
  children; it does not read an entire draft and distribute values to fields.
- Share an instance through the same model selection and key. Pass identifiers
  to keyed children, rather than copying their reactive data through a parent.
- Bind callbacks to writable atoms locally. Field writes patch the current
  draft, so editing one field cannot overwrite a sibling's newer value.
- Keep related values together when they form one responsibility: a cell's
  editor and result, a price calculation, or a card. There is no maximum number
  of atoms per View, and no requirement to wrap every DOM node in holo.
- Keep native React and RHF hooks where they belong. A native field subscription
  does not need an empty holo wrapper. A layout may own its own busy attribute.

In an article about bindings, show the View's concrete props type and the
binding; omit routine HTML. Keep the implementation when it demonstrates the
mechanism, such as native form submission, scoped RHF errors or imperative
navigation. Complete runnable Views stay in examples and remain typechecked.
Extract contracts from those implementations instead of maintaining a second
example with fake View declarations or placeholder bodies.

## Motion in live previews

Keep Motion in the View implementation. The documentation renderer supplies
MotionConfig with reducedMotion="user" and a short ease-out transition.
Animate changes with a purpose: reordered rows, entering results and feedback.
Do not delay input, computation or model ownership for animation. Keep branch
and model disposal immediate; a visual exit must not retain subscriptions.

Use useAnimate with useImperativeHolo when the lesson is imperative animation;
its scope cleans up animations on unmount. Otherwise keep motion markup in
\*-views.tsx and link that file from Demo instead of adding it to the article.

## Requests and forms

Use TanStack Query options factories for server queries and mutations. Use
native hooks when React is the only consumer; use createQueryModel and
createMutationModel when atoms or models need their results or commands.
Keep transports separate from business editing rules. Let Query own pending,
error and cache state; do not maintain a parallel request state machine.
Business commands may still choose validation, single-flight and when to
publish a success fact. Handle rejected mutation Promises explicitly.

An async Jotai capability demo may use a delayed Promise to demonstrate
AbortSignal or Suspense. Label that purpose; it is not a server-data recipe.
Local persistence, subscriptions and analytics delivery keep their own resource
contracts. Do not introduce a query cache for operations it does not manage.
Keep native RHF control and validators; add model integration only when another
part of the reactive graph needs the form.

## Names and formatting

Use $name for atoms, $$name for model definitions/instances, createNameModel
for factories, and NameView for Views. Pass named factories to pipe; do not
hide model creation inside an inline pipe callback. Use native atoms wherever
the example calls for them rather than forcing a helper into every operation.

Keep displayed code within 80 columns. Separate different atom/operator groups,
View declarations and holo bindings with blank lines. Use real typed contracts,
not any-based placeholders. Read Lingui translations inside Views. Keep prose
annotations outside code when they explain intent rather than implementation.

## Review and verification

Read each example as a dependency diagram: which consumer owns each subscription,
which model instance it selects, and who releases its connections? Check whether
changing a field or request status can render an unrelated sibling. Use render
counts for isolation claims and browser interactions for shared-instance and
cleanup behavior. Do not turn a semantic review into an arbitrary read-count rule.

Run typecheck, docs:check and docs:build for changes to snippets. Run relevant
browser tests for changed runnable examples. Translate changed prose in all four
locales; generated locale Markdown is not an independent source.
