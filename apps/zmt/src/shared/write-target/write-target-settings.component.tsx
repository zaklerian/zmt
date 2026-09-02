import { IncludedMod, WRITE_KIND_LOCATIONS, WriteKind } from '@contracts';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWriteTargetFiles } from './use-write-target-files.hook';
import { useWriteTargets } from './use-write-targets.hook';
import { toNewTargetPath } from './write-target-files.util';

interface WriteTargetSettingsProps {
  onClose: () => void;
}

// The Select value that means "no stored target — use the write's own default".
const DEFAULT_OPTION = '';
// The Select value that reveals the name field instead of choosing a file.
const NEW_OPTION = '__new';

// The kinds with a live consult point. `sprite` is reserved in the model (ADR 029
// decision 1) and deliberately absent here: offering a setting nothing reads would
// be a control that silently does nothing.
const WIRED_KINDS = [
  'locKey',
  'technology',
] as const satisfies readonly WriteKind[];

// The save-target settings surface (ADR 029 decisions 3 and 4, req 10): per mod,
// per write-kind, the file new content of that kind is written to — an existing file
// in the kind's folder, or a name for one created on the first write.
//
// It is a panel over the EXISTING preference plumbing and nothing more: the store is
// `preferences:set('writeTargets', …)`, the file list is `fs:searchFiles`, and the
// resolution rule lives in `resolveWriteTarget`. There is no settings abstraction,
// no per-kind component, and no registry — a kind is a row.
export function WriteTargetSettings({ onClose }: WriteTargetSettingsProps) {
  const { t } = useTranslation(['app']);
  const [mods, setMods] = useState<readonly IncludedMod[]>([]);
  const [modId, setModId] = useState<null | string>(null);
  const { choose, targets } = useWriteTargets();
  const [naming, setNaming] = useState<null | WriteKind>(null);
  const [name, setName] = useState('');

  // Only an editable mod can be a write target at all — the vanilla folder is never
  // written, and a readonly source has nothing to choose.
  useEffect(() => {
    let cancelled = false;
    window.api.workspace
      .get()
      .then((workspace) => {
        if (cancelled) return;
        const editable = workspace.includedMods.filter(
          (mod) => mod.permission === 'editable',
        );
        setMods(editable);
        setModId((current) => current ?? editable[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setMods([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mod = mods.find((candidate) => candidate.id === modId) ?? null;
  const files = useWriteTargetFiles(mod, WIRED_KINDS);

  const commitName = (kind: WriteKind) => {
    const relativePath = toNewTargetPath(kind, name);
    if (mod === null || relativePath === null) return;
    choose(mod.id, kind, relativePath);
    setNaming(null);
    setName('');
  };

  return (
    <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
      <DialogTitle>{t('app:saveTargets.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary" variant="body2">
            {t('app:saveTargets.description')}
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="write-target-mod-label">
              {t('app:saveTargets.mod')}
            </InputLabel>
            <Select
              label={t('app:saveTargets.mod')}
              labelId="write-target-mod-label"
              value={mod?.id ?? ''}
              onChange={(event) => setModId(event.target.value)}
            >
              {mods.map((candidate) => (
                <MenuItem key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {mods.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              {t('app:saveTargets.noMods')}
            </Typography>
          )}

          {mod !== null &&
            WIRED_KINDS.map((kind) => {
              const stored = targets[mod.id]?.[kind] ?? null;
              const options = files[kind] ?? [];
              const value =
                naming === kind ? NEW_OPTION : (stored ?? DEFAULT_OPTION);
              return (
                <Stack key={kind} spacing={1}>
                  <FormControl fullWidth size="small">
                    <InputLabel id={`write-target-${kind}-label`}>
                      {t(`app:saveTargets.kind.${kind}`)}
                    </InputLabel>
                    <Select
                      label={t(`app:saveTargets.kind.${kind}`)}
                      labelId={`write-target-${kind}-label`}
                      value={value}
                      onChange={(event) => {
                        const next = event.target.value;
                        if (next === NEW_OPTION) {
                          setNaming(kind);
                          setName('');
                          return;
                        }
                        setNaming(null);
                        choose(
                          mod.id,
                          kind,
                          next === DEFAULT_OPTION ? null : next,
                        );
                      }}
                    >
                      <MenuItem value={DEFAULT_OPTION}>
                        {t('app:saveTargets.useDefault')}
                      </MenuItem>
                      {/* A stored target that is not on disk yet — the create-new
                          case before its first write — still shows as selected. */}
                      {stored !== null && !options.includes(stored) && (
                        <MenuItem value={stored}>{stored}</MenuItem>
                      )}
                      {options.map((file) => (
                        <MenuItem key={file} value={file}>
                          {file}
                        </MenuItem>
                      ))}
                      <MenuItem value={NEW_OPTION}>
                        {t('app:saveTargets.createNew')}
                      </MenuItem>
                    </Select>
                  </FormControl>
                  {naming === kind && (
                    <Stack direction="row" spacing={1}>
                      <TextField
                        fullWidth
                        helperText={t('app:saveTargets.newFileHelp', {
                          folder: WRITE_KIND_LOCATIONS[kind].folder,
                        })}
                        label={t('app:saveTargets.newFile')}
                        size="small"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                      <Button
                        disabled={toNewTargetPath(kind, name) === null}
                        onClick={() => commitName(kind)}
                      >
                        {t('app:actions.save')}
                      </Button>
                    </Stack>
                  )}
                </Stack>
              );
            })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('app:actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
