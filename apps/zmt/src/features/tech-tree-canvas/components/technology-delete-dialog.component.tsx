import type {
  TechnologyDeletePlan,
  TechnologyDeletePlanResult,
} from '@contracts';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { TechnologyDeleteMode } from '../hooks';

export interface TechnologyDeleteDialogProps {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (mode: TechnologyDeleteMode) => void;
  plan: TechnologyDeletePlanResult;
  token: string;
}

// The delete confirmation (req 8). It renders the SERVER-COMPUTED plan and
// nothing else (R-CODE-5): the counts are `targets.length` as the main side
// resolved them, and the dangling-reference warning is its inbound set — the
// renderer holds one folder's rows and could not have derived either.
//
// Item-vs-tree appears as two options ONLY when the tree removes more than the
// item; a leaf is a plain delete-item confirm, because offering a "delete tree"
// that removes exactly one technology is a choice with no second outcome.
//
// It is its own dialog rather than the shared modal service (R-REACT-2): that
// service's `confirm` resolves a BOOLEAN, and this confirmation has three
// outcomes — item, tree, cancel — that a boolean cannot carry.
export function TechnologyDeleteDialog({
  busy,
  onCancel,
  onConfirm,
  plan,
  token,
}: TechnologyDeleteDialogProps) {
  const { t } = useTranslation(['feature.techTreeCanvas']);
  const hasTree = plan.tree.targets.length > plan.item.targets.length;

  const summary = (
    mode: TechnologyDeleteMode,
    chosen: TechnologyDeletePlan,
  ) => (
    <Typography key={mode} color="text.secondary" variant="body2">
      {t(`feature.techTreeCanvas:deleteDialog.${mode}Summary`, {
        total: chosen.targets.length,
      })}
      {chosen.blocked.length > 0 &&
        ` ${t('feature.techTreeCanvas:deleteDialog.blocked', {
          total: chosen.blocked.length,
        })}`}
      {chosen.inboundReferences.length > 0 &&
        ` ${t('feature.techTreeCanvas:deleteDialog.inbound', {
          total: chosen.inboundReferences.length,
        })}`}
    </Typography>
  );

  return (
    <Dialog fullWidth maxWidth="sm" open onClose={onCancel}>
      <DialogTitle>
        {t('feature.techTreeCanvas:deleteDialog.title', { token })}
      </DialogTitle>
      <DialogContent>
        {summary('item', plan.item)}
        {hasTree && summary('tree', plan.tree)}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onCancel}>
          {t('feature.techTreeCanvas:deleteDialog.cancel')}
        </Button>
        <Button color="error" disabled={busy} onClick={() => onConfirm('item')}>
          {t('feature.techTreeCanvas:deleteDialog.confirmItem')}
        </Button>
        {hasTree && (
          <Button
            color="error"
            disabled={busy}
            variant="contained"
            onClick={() => onConfirm('tree')}
          >
            {t('feature.techTreeCanvas:deleteDialog.confirmTree', {
              total: plan.tree.targets.length,
            })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
