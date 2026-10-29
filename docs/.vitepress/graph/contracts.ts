export type GraphKind = 'react' | 'holo' | 'atom' | 'resource';
export type SourceRef = { source: string; anchor: string; occurrence?: number };
export type GraphNode = {
  id: string;
  kind: GraphKind;
  label: string;
  refs: readonly SourceRef[];
  position: readonly [number, number];
  group?: string;
  branch?: string;
};
export type GraphEdge = {
  from: string;
  to: string;
  kind: 'props' | 'read' | 'write' | 'fact' | 'delivery';
};
export type GraphGroup = {
  kind: 'model' | 'resource';
  refs: readonly SourceRef[];
  id: string;
  label: string;
  registry?: boolean;
  bounds: readonly [number, number, number, number];
  branch?: string;
};
export type GraphSource = { file: string; text: string };
export type GraphScene = {
  id: string;
  title: 'holo' | 'atoms' | 'analytics';
  article: string;
  demo?: 'analytics';
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  groups: readonly GraphGroup[];
  sources: Readonly<Record<string, GraphSource>>;
};
export type GraphActivity =
  | { type: 'branch'; id: string; active: boolean }
  | { type: 'delivery'; engine: string };
export type GraphUi = {
  title: string;
  open: string;
  back: string;
  loading: string;
  unavailable: string;
  hint: string;
  clear: string;
  caller: string;
  source: string;
  structure: string;
  live: string;
  noReplay: string;
  kinds: Record<GraphKind | 'model', string>;
};
