# Example composition audit

## Reader goal

Show how holo lets a layout compose already connected Views. Reactive values
belong at the smallest useful display or interaction, rather than in one form
or page adapter that distributes a model's whole state through props.

```text
Before
  ProfileEditor [draft, pending, error]
    → ProfileView → name/email fields, error, submit button

After
  ProfileEditor [write: submit]
    ├─ ProfileName [read/write: name]
    ├─ ProfileEmail [read/write: email]
    ├─ ProfileSaveError [read: mutation error]
    └─ ProfileSaveButton [read: pending]
```

Name and email are writable derived atoms over one draft. Returning unchanged
field values prevents commits in sibling Views. The save command still snapshots
the whole draft when it needs to perform its workflow.

## Audit scope

| Example group                           | Result                                                                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile recipe                          | Independent field, error and pending bindings; write-only form shell                                                                                  |
| Gift pricing and boolean operators      | Separate quantity, discount, total, terms and availability consumers                                                                                  |
| Counter examples                        | Value/derived display separated from controls and layout                                                                                              |
| Mutation demo                           | Separate field inputs, submit/reset, error and accepted result                                                                                        |
| Bond demo                               | Receipt option, order submission and receipt are independently connected                                                                              |
| Imperative checkout                     | Cart quantity, total and submit are separate; local receipt navigation remains in React                                                               |
| Analytics, both implementations         | Term field separate from submit/input owner; row/close actions bind locally; logs and clear control separate; one analytics attachment remains shared |
| Native RHF examples                     | Form shell composes native field components with field-scoped subscriptions; outside panel composes email, submit and saved-result bindings           |
| Server gift order recipes               | Independent writable field projections, query feedback, total, save and persistence controls in both plain and keyed variants                         |
| Filters and input contract              | Child bindings receive instance IDs, not whole model values; parent owns committed input forwarding                                                   |
| Existing prism, query and list examples | Already coherent field/card/row consumers; preserve them                                                                                              |
| Spreadsheet                             | One cell is a useful display/editor; do not split its input and result into unrelated bindings                                                        |

A useful unit may read several related values: a cell, a result card or a summary
expression. The goal is an explicit responsibility and subscription, not one
atom per DOM node. A container may own an actual attribute such as aria-busy or
a fieldset's disabled state. It must not gather unrelated child data.

All holo declarations remain outside render. Keyed children select the same
model through IDs; no new model is created while rendering. Multiple owners
share managed work. RHF keeps its native control and subscription mechanism;
empty holo wrappers are not added merely to wrap every field.

## Evidence

The profile browser test counts commits across field/error/button bindings.
Changing name does not commit email, error or button; changing email does not
commit name. Pending and completion update the button without committing either
field. Existing form, example, server-recipe and analytics tests exercise the
shared-key, owner cleanup and interaction contracts after decomposition.

No public runtime API changes or generic binding factory is introduced. The
examples show explicit holo declarations and composition at module scope.
