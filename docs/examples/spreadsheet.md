# Spreadsheet formulas

Estimate a game gift bundle with a small spreadsheet: copies × price, a demo 10% tax, and a running total. Edit a number or replace a formula; dependent cells update immediately.

<Demo kind="spreadsheet">

<<< @/../examples/docs/spreadsheet.tsx#spreadsheet

</Demo>

## Try it

Change B1 from 12 to 20: D1, the tax, and the bundle total change. Select D1 to see `=B1*C1` in the formula bar. Change it to `=B2*C2`, then edit B1 again: D1 now follows row 2 instead. Enter `=D1` into D1 to see a cycle error, then restore the original formula.

Enter moves down, Shift+Enter moves up, and Tab follows the inputs. Left/right arrows cross cells at the text boundary. Escape leaves the editor; edits are applied immediately. Reset restores the sample gift budget. Empty cells in rows 6–8 are a scratch area.

## Model

Each cell owns a writable input atom and a read-only result atom. Formula parsing is derived from that cell's input. Evaluation reads only referenced expression atoms through get, so dependencies change with the formula. The parser never executes JavaScript.

<<< @/../examples/spreadsheet/model.ts#sheet-model

## Rendering and isolation

Each CellView has its own holo binding. The table shell does not subscribe to sheet values. Selecting a cell updates the formula bar; editing a cell updates that input and dependent result Views. Unrelated cells do not commit again. The formula bar uses a native writable derived atom, demonstrating that holo accepts ordinary Jotai atoms too.

The cell registry uses `['cell', sheetId, address]`; the sheet registry uses `['sheet', sheetId]`. Matching keys in one store share an instance. Different sheet IDs isolate cell contents and selection. The read-only row and column atoms describe the fixed layout for holoList; they do not store cell contents.

Each preview has its own Jotai store. Two separately created models are also independent in one store. There is no useEffect to copy inputs into totals, no whole-sheet React state, and no subscription created during module initialization.

## Formula subset

Supported syntax: numeric literals, cell references A1–D8, parentheses, unary signs, +, -, \*, /, and SUM with comma-separated arguments or rectangular ranges. SUM ignores text and empty cells; arithmetic treats an empty cell as zero and reports text as a value error. Function names and references are case-insensitive; use a decimal point in formulas.

Errors are displayed as values: #REF! for an unknown address, #CYCLE! for circular references, #DIV/0! for division by zero, #VALUE! for incompatible values, #NUM! for a non-finite result, and #FORMULA! for unsupported or incomplete syntax. Fixing an input clears the resulting errors through the same derived reads.

This is a teaching example, not an Excel-compatible engine. It uses JavaScript numbers and rounds only the display. It does not implement accounting rounding, persistence, CSV paste, range selection, or hundreds of spreadsheet functions. Each result evaluates its referenced expression tree with a local memo and cycle stack; parsed expressions are shared, calculated intermediate results are not shared across roots. This keeps cycles out of Jotai's dependency graph and is intended for small sheets.

## Related tools

[holo](/reference/holo) connects each View, [stateAtom](/reference/stateAtom) separates inputs from derived results, and [actionAtom](/reference/actionAtom) restores the sample. [Jotai atoms-in-atom](https://jotai.org/docs/guides/atoms-in-atom) explains how atom references can describe dynamic structures. For a production formula engine, evaluate an established spreadsheet engine separately from the React bindings.
