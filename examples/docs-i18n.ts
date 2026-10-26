/** A per-demo translator; language changes recreate the isolated demo/store. */
export type DocsTranslator = (message: string, values?: Record<string, unknown>) => string;
