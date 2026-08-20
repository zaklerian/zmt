import { describe, expect, it, vi } from 'vitest';

import type { CanvasActionContext } from './canvas-actions';

import { canvasActions } from './canvas-actions';

const CLICK = { x: 640, y: 480 };

function contextFor(technologyId: null | string): CanvasActionContext {
  return {
    openAddChild: vi.fn(),
    openAddFree: vi.fn(),
    openDelete: vi.fn(),
    openEdit: vi.fn(),
    position: CLICK,
    technologyId,
  };
}

function labelsAvailableIn(context: CanvasActionContext): readonly string[] {
  return canvasActions
    .filter((action) => action.isAvailable(context))
    .map((action) => action.label(context));
}

function run(id: string, context: CanvasActionContext): void {
  const action = canvasActions.find((candidate) => candidate.id === id);
  if (action === undefined) throw new Error(`no action ${id}`);
  void action.execute(context);
}

describe('canvasActions', () => {
  // Gate 1: every verb is available on a node, and each `execute` reaches the
  // ZMT-50/51/52 flow it wraps — with the right technology.
  it('offers all three verbs for a node context', () => {
    expect(labelsAvailableIn(contextFor('fighter1'))).toEqual([
      'feature.techTreeCanvas:edit',
      'feature.techTreeCanvas:addChild',
      'feature.techTreeCanvas:delete',
    ]);
  });

  it('invokes the ZMT-50 edit flow for the right-clicked technology', () => {
    const context = contextFor('fighter1');
    run('tech-tree-canvas-edit', context);

    expect(context.openEdit).toHaveBeenCalledWith('fighter1');
    expect(context.openDelete).not.toHaveBeenCalled();
    expect(context.openAddChild).not.toHaveBeenCalled();
    expect(context.openAddFree).not.toHaveBeenCalled();
  });

  it('invokes the ZMT-52 delete flow for the right-clicked technology', () => {
    const context = contextFor('fighter1');
    run('tech-tree-canvas-delete', context);

    expect(context.openDelete).toHaveBeenCalledWith('fighter1');
    expect(context.openEdit).not.toHaveBeenCalled();
  });

  // Gate 5, node half: add-as-child hands the ZMT-51 hook the parent, not a
  // position — the child offset is the hook's, never recomputed here.
  it('invokes the ZMT-51 add-as-child path for a node context', () => {
    const context = contextFor('fighter1');
    run('tech-tree-canvas-add', context);

    expect(context.openAddChild).toHaveBeenCalledWith('fighter1');
    expect(context.openAddFree).not.toHaveBeenCalled();
  });

  // Gate 2: node-only verbs exclude themselves in the zone context; Add stays.
  it('offers only Add for a zone context', () => {
    expect(labelsAvailableIn(contextFor(null))).toEqual([
      'feature.techTreeCanvas:addFree',
    ]);
  });

  // Gate 5, zone half: the click position is passed through untouched — the
  // free-placement cell and the safe-position nudge stay in `use-technology-add`.
  it('invokes the ZMT-51 free-placement path at the click position', () => {
    const context = contextFor(null);
    run('tech-tree-canvas-add', context);

    expect(context.openAddFree).toHaveBeenCalledWith(CLICK);
    expect(context.openAddChild).not.toHaveBeenCalled();
  });

  it('does nothing when a node-only verb is executed without a node', () => {
    const context = contextFor(null);
    run('tech-tree-canvas-edit', context);
    run('tech-tree-canvas-delete', context);

    expect(context.openEdit).not.toHaveBeenCalled();
    expect(context.openDelete).not.toHaveBeenCalled();
  });
});
