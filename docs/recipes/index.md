# Examples

Complete projects show how models, Views and integrations work together. Each article includes executable examples and links to their source.

## [Server data, forms and saving](/recipes/server-data)

A sales team edits the seat count and customer comment of a proposal. These five recipes use the same request factories and Views. QueryClient owns server data; a model owns the user's draft. The examples expect your application to provide GET and PUT `/api/proposals/:id`; they do not install a demo backend.

## [Profile: creation and editing](/recipes/profile-composition)

A profile model owns the username, avatar, biography and interests. It can derive an avatar color from the username. It does not know whether its input came from a wizard, an existing model, the server or local storage. Query models fetch data, mutation models save it, and application composition connects their results to the business model.

## [Profile: command → fact → reaction](/recipes/profile)

A user edits a draft and presses Save. A command validates input and persists it through an API. Only the successful response produces the fact `profileSaved`. A notification module reacts to that fact without controlling persistence.

## [Effects and model lifetime](/recipes/integrations)

Choose what owns a subscription before connecting it. A resource may belong to one displayed value, a shared model or the whole application. That choice determines when cleanup runs.

## [Spreadsheet formulas](/recipes/spreadsheet)

Estimate a website project with a small spreadsheet: hours × rate, a 10% reserve, and a running total. Edit a number or replace a formula; dependent cells update immediately.
