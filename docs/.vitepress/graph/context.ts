import type { InjectionKey } from 'vue';
import type { GraphActivity } from './contracts';
export const graphActivityKey: InjectionKey<(event: GraphActivity) => void> =
  Symbol('example-graph-activity');
