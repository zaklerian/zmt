import type { TechTreePoint } from '@contracts';
import type { Action } from '@r-core';

// The canvas surface context (ADR 015). Node-vs-zone is expressed HERE, as
// `technologyId` (a token for a node, null for the empty zone), and resolved by
// each action's `isAvailable` — never by a branch in the hosting surface.
// `position` is the right-click point in FLOW pixels, the space free placement is
// measured in; the canvas projects it, the actions only hand it on (ZMT-51).
export interface CanvasActionContext {
  openAddChild: (parentId: string) => void;
  openAddFree: (pixel: TechTreePoint) => void;
  openDelete: (id: string) => void;
  openEdit: (id: string) => void;
  readonly position: TechTreePoint;
  technologyId: null | string;
}

// The id of the destructive verb, exported so BOTH surfaces can render it
// distinctly (ZMT-57, Q99 = A1). This is a SURFACE-LEVEL LOOKUP on purpose: the
// alternative — a `destructive` field on `Action` — would put a presentation
// concern in the ADR 015 business-action contract, where every action of every
// entity would have to answer it. The action set is unchanged by this; only the two
// surfaces that draw it know the id means "error colour".
export const CANVAS_DELETE_ACTION_ID = 'tech-tree-canvas-delete';

// The AED verbs of the tech-tree canvas as business actions (ADR 015), wrapping
// the ZMT-50/51/52 flows rather than reimplementing them: every `execute` calls
// the hook the canvas already owns. Order is menu display order, not alphabetical
// (R-CODE-9) — the destructive verb sits last.
export const canvasActions: readonly Action<CanvasActionContext>[] = [
  {
    execute: (context) => {
      if (context.technologyId === null) return;
      context.openEdit(context.technologyId);
    },
    id: 'tech-tree-canvas-edit',
    isAvailable: (context) => context.technologyId !== null,
    label: () => 'feature.techTreeCanvas:edit',
  },
  {
    // The one action available in both contexts, and the only place the two ZMT-51
    // paths are chosen between: add-as-child off the right-clicked node, free
    // placement at the click when there is no node. Placement itself stays in the
    // hook — this passes the position, it does not compute one.
    execute: (context) => {
      if (context.technologyId === null) context.openAddFree(context.position);
      else context.openAddChild(context.technologyId);
    },
    id: 'tech-tree-canvas-add',
    isAvailable: () => true,
    label: (context) =>
      context.technologyId === null
        ? 'feature.techTreeCanvas:addFree'
        : 'feature.techTreeCanvas:addChild',
  },
  {
    execute: (context) => {
      if (context.technologyId === null) return;
      context.openDelete(context.technologyId);
    },
    id: CANVAS_DELETE_ACTION_ID,
    isAvailable: (context) => context.technologyId !== null,
    label: () => 'feature.techTreeCanvas:delete',
  },
];
