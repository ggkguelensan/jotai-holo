# Recipes

Choose the task first. Each recipe explains the smallest useful combination of tools, the data flow and the decisions the application must make.

## State and instances

- [I need to share a value or select an independent instance](/topics/atoms-and-models#choose-by-the-task).
- [I need a model to own a subscription](/recipes/integrations).
- [I need a View to react to a model event](/topics/holo#imperative-view-methods).

## Server data and saving

- [I need server data in the atom/model system](/recipes/server-data#a-model-working-with-server-data).
- [I need independent editors sharing server cache](/recipes/server-data#a-registry-model-working-with-server-data).
- [I need to use existing data before loading](/recipes/profile-composition#use-existing-data-before-loading).
- [I need to save a draft through a mutation](/recipes/server-data#a-model-saving-through-a-mutation).
- [I need to keep edits made during a save](/recipes/profile-composition#editing-form).
- [I need a local draft to survive reload](/recipes/server-data#a-model-saving-locally).

## Forms

- [I need server defaults without overwriting edits](/recipes/server-data#a-form-initialized-from-server-data).
- [I need a multi-step creation form](/recipes/profile-composition#creation-wizard).
- [I need two independent editing sessions](/recipes/profile-composition#editing-form).

## Facts and analytics

- [I need a command to publish a confirmed fact](/recipes/profile).
- [I need several Views to share one analytics connection](/examples/catalog-analytics).
- [I need to load analytics on demand](/topics/analytics#connect-analytics-to-a-model).
- [I need another analytics engine](/recipes/analytics-adapter).
