import type { Point } from '../coordinates.js';

export type SheetKey = { sheetId: string };

export type CellKey = SheetKey & { address: string };

export type ViewKey = SheetKey & { viewId?: string | undefined };

export type SheetDocument = {
  version?: number;
  rows?: number;
  columns?: number;
  cells: Readonly<Record<string, string>>;
};

export type SheetDescriptor = { id: string; title: string };

export type ViewSnapshot = { selected: string; camera: Point };

export type BookDocument = {
  version: 1;
  sheets: SheetDescriptor[];
  activeSheetId: string;
  views: Record<string, ViewSnapshot>;
};

export type StorageStatus = 'loading' | 'saving' | 'saved' | 'error';
