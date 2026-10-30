import { stateAtom } from 'jotai-holo/vanilla';
import { browserStorage, type DocumentStorage } from '../storage.js';

export const $storage = stateAtom<DocumentStorage>(browserStorage());

const workbookId = 'gift-budget-v1';

export const sheetKey = (sheetId: string) => `${workbookId}/sheet/${sheetId}`;

export const bookKey = `${workbookId}/book`;
