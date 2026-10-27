import type { QueryClient } from '@tanstack/query-core';
import { atom } from 'jotai/vanilla';

/** Set this to the application's existing QueryClient in each store. No hidden client is created. */
export const queryClientAtom = atom<QueryClient | null>(null);
