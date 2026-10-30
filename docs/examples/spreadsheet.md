# Spreadsheet formulas

Edit a gift budget across several sheets. Each sheet has its own data, formulas and camera. The table shows a small window of the document; moving beyond its edge changes addresses without moving the physical cells.

<Demo kind="spreadsheet">

<<< @/../examples/docs/spreadsheet.tsx#spreadsheet

</Demo>

## Try it

Double-click B1, enter 20 and press Enter: D1 and the bundle total change. Select D1 to inspect its formula. Enter or F2 starts editing; Escape cancels the draft. Arrow keys select cells outside editing. Tab commits and moves right, wrapping to the next logical row.

Use Go to cell to visit AA90, enter a value, then reference it from A1. Only the visible slots mount, but formulas can read cells outside the camera. The counters change document dimensions. Shrinking hides data; growing restores it. A reference outside the current dimensions displays #REF!.

Switch to Scratchpad to work on an independent sheet. The + button adds a sheet; double-click its tab to rename it. Returning to a sheet restores its selection and camera. On narrow screens the window shows two columns instead of four.

## Document data {#document-data}

Generic models start empty. This JSON supplies the first gift-budget sheet; its selected, totalCell and totalRow fields are demo metadata. Reset sheet loads the sample again. Other new sheets start empty.

<<< @/../examples/spreadsheet/gift-budget.json

The document owns cell inputs. A cell model exposes an input and a derived result; releasing that model never deletes the input. Formula evaluation reads referenced expressions through get, so changing a formula changes its dependencies. The parser never executes JavaScript.

<<< @/../examples/spreadsheet/model.ts#cell-model

## Views and the camera

Each CellView has its own holo binding. Selection and draft projections notify the affected cells; unrelated cells do not need the whole sheet document. Rows and columns use holoList with fixed slot keys. The camera changes which logical addresses those slots display.

<<< @/../examples/docs/spreadsheet.tsx#cell-binding

The sheet registry uses `['sheet', sheetId]`; cell models use `['cell', sheetId, address]`. A separate view model uses `['view', sheetId, viewId]` for selection, editing and camera. Matching keys share state within one store. Different view IDs can show different parts of the same document.

## Local storage and lifetime

IndexedDB stores the sheet list and sparse sheet documents. Committed edits save after a 250 ms pause. Switching sheets commits the current draft and starts saving immediately. Wait for Saved locally before reloading to verify restoration.

<<< @/../examples/docs/spreadsheet.tsx#workbook-setup

Visible components own the selected sheet. Tabs read only descriptors and statuses, so an inactive tab does not keep its sheet active. Pending or failed storage operations hold an additional lease. After a successful save and release of the final owner, the registry retains the sheet for one minute.

<<< @/../examples/spreadsheet/model.ts#sheet-model

Returning within that minute reuses the instance. Returning later creates a new instance and restores its document before enabling editing. Cell models have zero retention; their inputs remain in the sheet document. A storage error keeps unsaved data in memory and exposes Retry. This example implements storage ownership with modelConnection and acquire/release; retainTime alone does not guarantee persistence.

## Formula subset

Supported syntax: numeric literals, cell references, parentheses, unary signs, +, -, \*, /, and SUM with comma-separated arguments or rectangular ranges. SUM ignores text and empty cells; arithmetic treats an empty cell as zero and reports text as a value error. Function names and references are case-insensitive; use a decimal point in formulas.

Errors are values: #REF! for an address outside the sheet, #CYCLE! for circular references, #DIV/0! for division by zero, #VALUE! for incompatible values, #NUM! for a non-finite result, and #FORMULA! for unsupported syntax. #LIMIT! bounds expensive calculations: a range may contain at most 2048 cells, evaluation has a 2048-step budget, and reference depth is limited to 128.

The document supports up to 1000 rows and 1000 columns. This is a teaching example with JavaScript numbers, not an Excel-compatible engine. It does not implement cross-sheet formulas, collaborative editing, CSV paste or range selection. For a production spreadsheet, evaluate an established formula engine separately from the React bindings.

## Verification

Browser E2E tests exercise the built documentation in all four languages: real keyboard input, cancellation, fixed-slot camera geometry, offscreen formulas, dimension changes, sheet switching, local restoration, renaming and mobile layout. Integration tests use controlled time and storage to verify one-minute retention, delayed restoration, failed writes and overlapping revisions.
