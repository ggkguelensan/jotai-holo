# Spreadsheet formulas

Edit a gift budget across several sheets. Each sheet has its own data, formulas and camera. The table shows a small window of the document; moving beyond its edge changes addresses without moving the physical cells.

One graph shows the workbook, sheet calculations, editor, View bindings and local storage together. Repeated cells and row wrappers are collapsed. Select a node to inspect its connections; matching displayed code is highlighted. Open the map to inspect models and source files.

<span id="workbook-system"></span>

<GraphExample scene="spreadsheet-system" class="graph-system">

<Demo kind="spreadsheet">

<<< @/../examples/spreadsheet/ui/workspace.tsx#spreadsheet

</Demo>

## Try it

Double-click B1, enter 20 and press Enter: D1 and the bundle total change. Select D1 to inspect its formula. Enter or F2 starts editing; Escape cancels the draft. Arrow keys select cells outside editing. Tab commits and moves right, wrapping to the next logical row.

Use Go to cell to visit AA90, enter a value, then reference it from A1. Only the visible slots mount, but formulas can read cells outside the camera. The counters change document dimensions. Shrinking hides data; growing restores it. A reference outside the current dimensions displays #REF!.

Switch to Scratchpad to work on an independent sheet. The + button adds a sheet; double-click its tab to rename it. Returning to a sheet restores its selection and camera. On narrow screens the window shows two columns instead of four.

## Document data {#document-data}

Generic models start empty. This JSON supplies the first gift-budget sheet; its selected, totalCell and totalRow fields are demo metadata. Reset sheet loads the sample again. Other new sheets start empty.

<<< @/../examples/spreadsheet/gift-budget.json

The sheet owns each cell’s input, parsed expression and result atoms. A cell registry model exposes those atoms to a binding; releasing the model preserves their identity and cache. The parser never executes JavaScript.

<<< @/../examples/spreadsheet/models/cell-model.ts#cell-model

## Selecting a cell atom

flatMapAtom follows a stable atom inside the selected sheet. Reads follow its value; writes to the selected input pass through the sheet’s setCell command. The operator does not acquire a model owner: cell-model connections and holo.models retain that responsibility.

<<< @/../examples/spreadsheet/models/view-model.ts#editor-routing

The editor names its selected input once. begin reads it; commit writes the draft back to it. matchAtom chooses which value the formula bar displays and reads only that branch.

<<< @/../examples/spreadsheet/models/view-model.ts#formula-routing

## Shared computations

Each cell forms a chain: $input → $expression → $value. ion parses the input with a pure function. A result reads referenced $value atoms through get, so Jotai caches intermediate results and tracks the references used by the current formula.

<<< @/../examples/spreadsheet/models/cell-graph.ts#cell-computation

If B1 contains `=A1*3` and both C1 and D1 reference B1, changing A1 computes B1 once for both consumers. Replacing C1’s formula replaces its dependencies. Unrequested results stay unevaluated. Writing the same input or dimensions does not advance the document revision or schedule a save.

Before values read each other, a separate pass checks references for cycles and excessive depth. This pass scans allocated inputs and their references after an edit; it reuses cached parsed expressions, but it is not limited to affected results. A cycle becomes #CYCLE! without creating a cyclic Jotai read. Repairing the formula restores calculation.

The camera controls mounted cells, not the computation graph. Visited input and computation atoms remain with the sheet until its registry instance expires. Storage saves source inputs and dimensions; results are recalculated after restoration.

## Views and the camera

Bindings and model definitions are declared at module scope. Each Jotai store owns its instances; declaring a binding does not load documents or subscribe to storage. Storage work starts when the model acquires an owner.

Each CellView has its own holo binding. ion projects whether that cell is selected; conditional stateAtom reads keep unselected cells independent of the draft. Rows and columns use holoList with fixed slot keys. The camera changes which logical addresses those slots display.

<<< @/../examples/spreadsheet/ui/cell.ts#cell-binding

The sheet registry uses `['sheet', sheetId]`; cell models use `['cell', sheetId, address]`. A separate view model uses `['view', sheetId, viewId]` for selection, editing and camera. Matching keys share state within one store. Different view IDs can show different parts of the same document.

## Local storage and lifetime

IndexedDB stores the sheet list and sparse sheet documents. Committed edits save after a 250 ms pause. Switching sheets commits the current draft and starts saving immediately. Wait for Saved locally before reloading to verify restoration.

<<< @/../examples/spreadsheet/ui/book.tsx#workbook-setup

Visible components own the selected sheet. Tabs read only descriptors and statuses, so an inactive tab does not keep its sheet active. Pending or failed storage operations hold an additional lease. After a successful save and release of the final owner, the registry retains the sheet for one minute.

<<< @/../examples/spreadsheet/models/sheet-model.ts#sheet-model

Returning within that minute reuses the instance. Returning later creates a new instance and restores its document before enabling editing. Cell models have zero retention; their inputs remain in the sheet document. A storage error keeps unsaved data in memory and exposes Retry. This example implements storage ownership with modelConnection and acquire/release; retainTime alone does not guarantee persistence.

## Formula subset

Supported syntax: numeric literals, cell references, parentheses, unary signs, +, -, \*, /, and SUM with comma-separated arguments or rectangular ranges. SUM ignores text and empty cells; arithmetic treats an empty cell as zero and reports text as a value error. Function names and references are case-insensitive; use a decimal point in formulas.

Errors are values: #REF! for an address outside the sheet, #CYCLE! for circular references, #DIV/0! for division by zero, #VALUE! for incompatible values, #NUM! for a non-finite result, and #FORMULA! for unsupported syntax. #LIMIT! bounds expensive calculations: a range may contain at most 2048 cells, each formula has a 2048-step budget (including range entries), and reference depth is limited to 128.

The document supports up to 1000 rows and 1000 columns. This is a teaching example with JavaScript numbers, not an Excel-compatible engine. It does not implement cross-sheet formulas, collaborative editing, CSV paste or range selection. For a production spreadsheet, evaluate an established formula engine separately from the React bindings.

## Source layout

Start with ui/book.tsx for screen composition and workbook.ts for model connections and navigation commands. Switching or adding a sheet commits the current editor before changing the active ID. The status indicator owns its subscriptions; saving does not require the workspace layout to read status. The models directory contains state and commands; persistence contains storage and lease handling; ui contains components and their bindings. Formula parsing and evaluation are separate modules under formulas.

```text
spreadsheet/
├── workbook.ts
├── models/
├── persistence/
├── ui/
│   └── views/
├── formulas/
├── coordinates.ts
├── storage.ts
└── gift-budget.json
```

## Verification

Browser E2E tests exercise the built documentation in all four languages: real keyboard input, cancellation, fixed-slot camera geometry, offscreen formulas, dimension changes, sheet switching, local restoration, renaming and mobile layout. Integration tests use controlled time and storage to verify one-minute retention, delayed restoration, failed writes and overlapping revisions. Computation tests check shared intermediates, dependency replacement, cycle repair, no-op writes and cache identity after cell disposal.

Run `pnpm exec vitest bench --run tests/spreadsheet.bench.ts` to measure cached reads, edits with demanded results, and topology validation separately for a chain, shared dependencies and a range. Timings depend on the machine; these benchmarks do not compare this example with a production formula engine.

</GraphExample>
