import type { GameId } from '@zmt/contracts';
import type { HasUnsavedChanges } from '@zmt/renderer/core';

import { Component, computed, inject, linkedSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogService, errorOf } from '@zmt/renderer/core';
import { I18nStore } from '@zmt/renderer/shell/data-access';
import { filter } from 'rxjs';

import { AppSettingsStore } from '../data-access';
import { FileDisplayFormComponent, PluginConfigFormComponent } from '../ui';

export const SAVED_SNACKBAR_MS = 3000;

@Component({
  imports: [FileDisplayFormComponent, MatButtonModule, PluginConfigFormComponent],
  selector: 'zmt-app-settings',
  styles: `
    .title {
      margin: 0 0 1rem;
      font: var(--mat-sys-headline-small);
    }

    .settings {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 40rem;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
  template: `
    <h2 class="title">{{ messages().appSettings.title }}</h2>
    <section class="settings">
      @if (loadError(); as error) {
        <p class="error" role="alert">
          {{ messages().appSettings.loadFailed }} {{ messages().errors[error.code] }}
        </p>
      }
      @if (store.hasPlugins()) {
        <zmt-plugin-config-form
          [activePlugin]="store.activePlugin()"
          [features]="features()"
          [plugins]="store.plugins()"
          (featuresChange)="features.set($event)"
          (gameChange)="onGameChange($event)"
        />
      } @else if (store.status().kind === 'success') {
        <p class="no-plugins">{{ messages().appSettings.noPlugins }}</p>
      }
      <zmt-file-display-form
        [hideUnsupportedFiles]="hideUnsupportedFiles()"
        (hideUnsupportedFilesChange)="hideUnsupportedFiles.set($event)"
      />
      <div class="actions">
        <button matButton type="button" class="discard" [disabled]="!dirty()" (click)="reset()">
          {{ messages().actions.cancel }}
        </button>
        <button
          matButton="filled"
          type="button"
          class="save"
          [disabled]="!dirty() || store.saving()"
          (click)="save()"
        >
          {{ messages().actions.save }}
        </button>
      </div>
    </section>
  `,
})
export class AppSettingsComponent implements HasUnsavedChanges {
  private readonly dialog = inject(DialogService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly messages = inject(I18nStore).messages;
  protected readonly store = inject(AppSettingsStore);

  protected readonly features = linkedSignal(() => this.store.featureToggles());
  protected readonly hideUnsupportedFiles = linkedSignal(() => this.store.hideUnsupportedFiles());
  protected readonly loadError = computed(() => errorOf(this.store.status()));

  readonly dirty = computed(
    () =>
      this.features() !== this.store.featureToggles() ||
      this.hideUnsupportedFiles() !== this.store.hideUnsupportedFiles(),
  );

  constructor() {
    this.store.load();
    this.store.saved$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.snackBar.open(this.messages().appSettings.saved, undefined, {
        duration: SAVED_SNACKBAR_MS,
      });
    });
  }

  protected onGameChange(gameId: GameId): void {
    if (gameId === this.store.activeGameId()) {
      return;
    }
    if (!this.dirty()) {
      this.switchGame(gameId);
      return;
    }
    const texts = this.messages();
    this.dialog
      .confirm({
        cancelLabel: texts.actions.cancel,
        confirmLabel: texts.actions.discard,
        message: texts.appSettings.gameSwitchMessage,
        title: texts.dialog.unsavedChangesTitle,
      })
      .pipe(filter((confirmed) => confirmed))
      .subscribe(() => {
        this.switchGame(gameId);
      });
  }

  protected reset(): void {
    this.features.set(this.store.featureToggles());
    this.hideUnsupportedFiles.set(this.store.hideUnsupportedFiles());
  }

  protected save(): void {
    const plugin = this.store.activePlugin();
    if (plugin !== null) {
      this.store.save({
        activeGameId: plugin.gameId,
        features: this.features(),
        hideUnsupportedFiles: this.hideUnsupportedFiles(),
      });
    }
  }

  private switchGame(gameId: GameId): void {
    this.store.selectGame(gameId);
    this.reset();
  }
}
