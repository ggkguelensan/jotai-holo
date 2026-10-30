# Sample data

CSV files are vendored unchanged from pinned upstream revisions. Regenerate these
copies from the linked revisions; do not edit the copies independently. They are the
authoritative inputs for the bundled sheets; no generated JSON copy is maintained.
Empty CSV fields remain empty cells. The first row contains column headers.

| File         | Pinned source                                                                                                                                     | SHA-256                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| penguins.csv | [palmerpenguins, 8957207](https://github.com/allisonhorst/palmerpenguins/blob/8957207b78d6ccd1b4654a9dd9c9041b657478ab/inst/extdata/penguins.csv) | `f204db2c753b0937caac3cb35258562c14f073e4bbc76be24b4c51ce22767a93` |
| titanic.csv  | [seaborn-data, 71e2436](https://github.com/mwaskom/seaborn-data/blob/71e2436a092d714350de0fc409ca8a8714e7e78f/titanic.csv)                        | `81787d320d7f7b03df935e91de8bd19e11d45c5bbcab86ef4d4a76dc91b7d4f2` |

Palmer Penguins is provided by Allison Horst, Alison Hill and Kristen Gorman;
its CC0 license is preserved in [PENGUINS-LICENSE.md](PENGUINS-LICENSE.md).
See the [upstream project](https://github.com/allisonhorst/palmerpenguins) for the
research data citations and collection context.

Titanic is the sample distributed by Michael Waskom's seaborn-data repository,
whose [source list](https://github.com/mwaskom/seaborn-data#data-sources) attributes
it to the [Kaggle Titanic dataset](https://www.kaggle.com/c/titanic/data).
It contains derived fields from the seaborn sample; it is not the original Kaggle
file. The workspace MIT license covers the implementation and does not assign a
new license to third-party datasets.
