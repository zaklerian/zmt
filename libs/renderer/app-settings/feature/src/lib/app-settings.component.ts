import type { HasUnsavedChanges } from '@zmt/renderer/dialog/util';

import { Component, computed, inject, linkedSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AppSettingsStore } from '@zmt/renderer/app-settings/data-access';
import { FileDisplayFormComponent, PluginConfigFormComponent } from '@zmt/renderer/app-settings/ui';
import { I18nStore } from '@zmt/renderer/i18n/data-access';

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
  `,
  template: `
    <h2 class="title">{{ messages().appSettings.title }}</h2>
    <section class="settings">
      @if (store.hasPlugins()) {
        <zmt-plugin-config-form
          [activePlugin]="store.activePlugin()"
          [features]="features()"
          [messages]="messages()"
          [plugins]="store.plugins()"
          (featuresChange)="features.set($event)"
          (gameChange)="store.selectGame($event)"
        />
      } @else {
        <p class="no-plugins">{{ messages().appSettings.noPlugins }}</p>
      }
      <zmt-file-display-form
        [hideUnsupportedFiles]="hideUnsupportedFiles()"
        [messages]="messages()"
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
  protected readonly messages = inject(I18nStore).messages;
  protected readonly store = inject(AppSettingsStore);

  protected readonly features = linkedSignal(() => this.store.featureToggles());
  protected readonly hideUnsupportedFiles = linkedSignal(() => this.store.hideUnsupportedFiles());

  readonly dirty = computed(
    () =>
      this.features() !== this.store.featureToggles() ||
      this.hideUnsupportedFiles() !== this.store.hideUnsupportedFiles(),
  );

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
}
