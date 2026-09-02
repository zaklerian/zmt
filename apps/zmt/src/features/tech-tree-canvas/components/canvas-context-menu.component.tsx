import type { TechTreePoint } from '@contracts';
import type { Action } from '@r-core';

import { Menu, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { CanvasActionContext } from '../canvas-actions';

import { CANVAS_DELETE_ACTION_ID } from '../canvas-actions';

interface CanvasContextMenuProps {
  readonly actions: readonly Action<CanvasActionContext>[];
  // SCREEN pixels — where the menu is drawn. Distinct from the context's flow
  // position, which is where a free-placed technology lands.
  readonly anchor: TechTreePoint;
  readonly context: CanvasActionContext;
  onClose: () => void;
}

// The second ADR 015 consumer after `EntityTableToolbar`, and a dumb one: it
// renders the actions reporting `isAvailable(context)` true and nothing else. It
// does not know a node from a zone — that distinction lives in the context it is
// handed. Zero available actions renders no menu (req 4).
export function CanvasContextMenu({
  actions,
  anchor,
  context,
  onClose,
}: CanvasContextMenuProps) {
  const { t } = useTranslation(['feature.techTreeCanvas']);
  // Action labels are runtime keys owned by the actions, not literals the typed
  // t() knows — the same seam the entity-table toolbar resolves through.
  const translateLabel = t as (key: string) => string;
  const available = actions.filter((action) => action.isAvailable(context));

  if (available.length === 0) return null;

  return (
    <Menu
      anchorPosition={{ left: anchor.x, top: anchor.y }}
      anchorReference="anchorPosition"
      open
      onClose={onClose}
    >
      {available.map((action) => (
        <MenuItem
          key={action.id}
          // Delete keeps its destructive affordance by ID LOOKUP at the surface
          // (ZMT-57, Q99 = A1) — `Action` gains no `destructive` field.
          sx={
            action.id === CANVAS_DELETE_ACTION_ID
              ? { color: 'error.main' }
              : undefined
          }
          onClick={() => {
            onClose();
            void action.execute(context);
          }}
        >
          {translateLabel(action.label(context))}
        </MenuItem>
      ))}
    </Menu>
  );
}
