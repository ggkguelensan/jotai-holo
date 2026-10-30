import penguins from './data/penguins.csv?raw';
import titanic from './data/titanic.csv?raw';
import gift from './gift-budget.json';
import { parseCsvDocument } from './csv.js';
import type {
  DatasetId,
  SheetDescriptor,
  SheetDocument,
} from './models/types.js';

const samples = {
  penguins: { title: 'Penguins', csv: penguins },
  titanic: { title: 'Titanic', csv: titanic },
} satisfies Record<DatasetId, { title: string; csv: string }>;
const documents = new Map<DatasetId, SheetDocument>();

export function sampleDocument(dataset: DatasetId): SheetDocument {
  let document = documents.get(dataset);
  if (!document) {
    document = parseCsvDocument(samples[dataset].csv);
    documents.set(dataset, document);
  }
  return document;
}

export function initialDocument(sheet: SheetDescriptor): SheetDocument {
  if (sheet.dataset) return sampleDocument(sheet.dataset);
  return sheet.id === 'gifts'
    ? gift
    : { version: 1, rows: 100, columns: 40, cells: {} };
}

/** Preserve saved IDs, titles and documents; never identify samples by display name. */
export function appendSampleSheets(
  sheets: SheetDescriptor[],
): SheetDescriptor[] {
  const result = [...sheets];
  for (const dataset of Object.keys(samples) as DatasetId[]) {
    if (result.some((sheet) => sheet.dataset === dataset)) continue;
    let id = `csv-${dataset}`;
    while (result.some((sheet) => sheet.id === id)) id += '-sample';
    result.push({ id, title: samples[dataset].title, dataset });
  }
  return result;
}
