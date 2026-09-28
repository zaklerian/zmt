import type { IpcError } from '@zmt/contracts';

export interface TechTreePoint {
  readonly x: number;
  readonly y: number;
}

export const TECH_NODE_KINDS = {
  simple: 'simple',
  sub: 'sub',
  wide: 'wide',
} as const satisfies Record<string, string>;

export type TechNodeKind = (typeof TECH_NODE_KINDS)[keyof typeof TECH_NODE_KINDS];

export interface TechTreeNode {
  readonly categories: readonly string[];
  readonly id: string;
  readonly kind: TechNodeKind;
  readonly position: TechTreePoint;
  readonly token: string;
}

export interface TechTreeNodeView extends TechTreeNode {
  readonly dimmed: boolean;
  readonly highlighted: boolean;
  readonly name: null | string;
  readonly selected: boolean;
}

export const TECH_EDGE_KINDS = {
  dependency: 'dependency',
  path: 'path',
} as const satisfies Record<string, string>;

export type TechEdgeKind = (typeof TECH_EDGE_KINDS)[keyof typeof TECH_EDGE_KINDS];

export interface TechTreeEdge {
  readonly id: string;
  readonly kind: TechEdgeKind;
  readonly source: string;
  readonly target: string;
}

export interface TechnologyDeletePlan {
  readonly blocked: readonly string[];
  readonly inboundReferences: readonly string[];
  readonly targets: readonly string[];
}

export interface TechnologyDeletePlanResult {
  readonly item: TechnologyDeletePlan;
  readonly tree: TechnologyDeletePlan;
}

export const TECHNOLOGY_DELETE_MODES = {
  item: 'item',
  tree: 'tree',
} as const satisfies Record<string, string>;

export type TechnologyDeleteMode =
  (typeof TECHNOLOGY_DELETE_MODES)[keyof typeof TECHNOLOGY_DELETE_MODES];

export type TechnologyFlowStatus =
  | { readonly error: IpcError; readonly kind: 'error' }
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'readonly' };

export type TechnologyDeleteStatus = TechnologyFlowStatus | { readonly kind: 'deleting' };
