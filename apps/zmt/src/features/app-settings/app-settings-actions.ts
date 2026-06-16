import { IpcError, isIpcError } from '@contracts';
import { Action, ModalService, TranslateFn } from '@r-core';

import { PluginConfigFormValues } from './plugin-config.model';
import { pluginConfigService } from './services';

// The app-settings dialog surface context (ADR 015). Save/Cancel/Browse read
// only the slice they need; the four dirty/toggle/path flags drive Save's
// availability and Cancel's confirm-on-dirty.
export interface AppSettingsActionContext extends AppSettingsCloseContext {
  formDirty: boolean;
  gameFolderPath: string;
  gameFolderPathChanged: boolean;
  getValues: () => PluginConfigFormValues;
  hideUnsupported: boolean;
  hideVanilla: boolean;
  hideVanillaChanged: boolean;
  readonly modal: ModalService;
  setGameFolderPath: (path: string) => void;
  setSaveError: (error: IpcError | null) => void;
  toggleChanged: boolean;
  translate: TranslateFn;
}

export interface AppSettingsCloseContext {
  close: () => void;
}

const hasPendingChanges = (context: AppSettingsActionContext): boolean =>
  context.formDirty ||
  context.toggleChanged ||
  context.hideVanillaChanged ||
  context.gameFolderPathChanged;

const toIpcError = (rawError: unknown): IpcError =>
  isIpcError(rawError) ? rawError : { code: 500, message: String(rawError) };

export const appSettingsActions: {
  readonly browse: Action<AppSettingsActionContext>;
  readonly cancel: Action<AppSettingsActionContext>;
  readonly close: Action<AppSettingsCloseContext>;
  readonly save: Action<AppSettingsActionContext>;
} = {
  browse: {
    execute: async (context): Promise<void> => {
      try {
        const picked = await window.api.fs.openFolderDialog();
        if (picked !== null) context.setGameFolderPath(picked);
      } catch (rawError: unknown) {
        context.setSaveError(toIpcError(rawError));
      }
    },
    id: 'app-settings-browse',
    isAvailable: () => true,
    label: () => 'feature.appSettings:form.gameFolder.browse',
  },

  cancel: {
    execute: async (context): Promise<void> => {
      if (hasPendingChanges(context)) {
        const proceed = await context.modal.confirm({
          confirmLabel: context.translate('app:actions.discard'),
          message: context.translate(
            'feature.appSettings:close.unsavedMessage',
          ),
          title: context.translate('app:modals.unsavedChanges.title'),
        });
        if (!proceed) return;
      }
      context.close();
    },
    id: 'app-settings-cancel',
    isAvailable: () => true,
    label: () => 'app:actions.cancel',
  },

  close: {
    execute: (context): void => context.close(),
    id: 'app-settings-close',
    isAvailable: () => true,
    label: () => 'app:actions.close',
  },

  save: {
    execute: async (context): Promise<void> => {
      context.setSaveError(null);
      try {
        const values = context.getValues();
        const pluginFormDirty = context.formDirty;
        if (pluginFormDirty || context.gameFolderPathChanged) {
          const current = (await pluginConfigService.getPluginSettings()) ?? {};
          const stored = current[values.activeGameId];
          const features = pluginFormDirty
            ? { ...values.features }
            : (stored?.features ?? {});
          const resolvedGameFolderPath = context.gameFolderPathChanged
            ? context.gameFolderPath
            : stored?.gameFolderPath;
          const next = {
            ...current,
            [values.activeGameId]:
              resolvedGameFolderPath === undefined
                ? { features }
                : { features, gameFolderPath: resolvedGameFolderPath },
          };
          await pluginConfigService.setPluginSettings(next);
        }
        if (context.toggleChanged) {
          await window.api.preferences.set(
            'hideUnsupportedFiles',
            context.hideUnsupported,
          );
        }
        if (context.hideVanillaChanged) {
          await window.api.preferences.set('hideVanilla', context.hideVanilla);
        }
        context.close();
      } catch (rawError: unknown) {
        context.setSaveError(toIpcError(rawError));
      }
    },
    id: 'app-settings-save',
    isAvailable: hasPendingChanges,
    label: () => 'app:actions.save',
  },
};
