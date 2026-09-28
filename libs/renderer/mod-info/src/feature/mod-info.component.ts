import type { HasUnsavedChanges } from '@zmt/renderer/core';

import { Component, computed, effect, inject, linkedSignal, viewChild } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogService, errorOf } from '@zmt/renderer/core';
import { I18nStore, WorkspaceStore } from '@zmt/renderer/shell/data-access';
import { filter, map } from 'rxjs';

import { ModInfoStore } from '../data-access';
import { ModInfoFormComponent, ParserWarningsComponent } from '../ui';
import { descriptorPathForRoot } from '../util';

export const SAVED_SNACKBAR_MS = 3000;

@Component({
  imports: [MatButtonModule, ModInfoFormComponent, ParserWarningsComponent],
  selector: 'zmt-mod-info',
  styles: `
    .title {
      margin: 0 0 1rem;
      font: var(--mat-sys-headline-small);
    }

    .path {
      margin: 0 0 1rem;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }

    .error {
      margin: 0;
      padding: 0.5rem 1rem;
      color: var(--mat-sys-error);
    }

    .loading {
      padding: 1rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  template: `
    <h2 class="title">{{ messages().modInfo.title }}</h2>
    @if (workspace.hasRoot()) {
      @if (store.descriptorPath(); as path) {
        <p class="path">{{ path }}</p>
      }
      @switch (store.status().kind) {
        @case ('success') {
          @if (draft(); as values) {
            <zmt-mod-info-form
              [saving]="store.saving()"
              [values]="values"
              (valuesChange)="draft.set($event)"
              (discard)="draft.set(store.values())"
              (save)="store.save($event)"
            />
            <zmt-parser-warnings [warnings]="store.parserWarnings()" />
          }
        }
        @case ('error') {
          @if (loadError(); as error) {
            <p class="error load-error" role="alert">
              {{ messages().modInfo.loadFailed }} {{ messages().errors[error.code] }}
            </p>
            <button matButton type="button" class="retry" (click)="retry()">
              {{ messages().actions.retry }}
            </button>
          }
        }
        @default {
          <p class="loading">{{ messages().modInfo.loading }}</p>
        }
      }
    } @else {
      <p class="no-root">{{ messages().modInfo.noRoot }}</p>
    }
  `,
})
export class ModInfoComponent implements HasUnsavedChanges {
  private readonly dialog = inject(DialogService);
  private readonly form = viewChild(ModInfoFormComponent);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly messages = inject(I18nStore).messages;
  protected readonly store = inject(ModInfoStore);
  protected readonly workspace = inject(WorkspaceStore);

  protected readonly draft = linkedSignal(() => this.store.values());
  protected readonly loadError = computed(() => errorOf(this.store.status()));

  readonly dirty = computed(() => this.form()?.dirty() ?? false);

  constructor() {
    this.store.load(
      toObservable(this.workspace.root).pipe(
        filter((root): root is string => root !== null),
        map(descriptorPathForRoot),
      ),
    );
    effect(() => {
      const status = this.store.saveStatus();
      const texts = this.messages().modInfo;
      switch (status.kind) {
        case 'success':
          this.snackBar.open(texts.saveSuccess, undefined, { duration: SAVED_SNACKBAR_MS });
          return;
        case 'error':
          this.dialog
            .info({
              confirmLabel: this.messages().actions.close,
              message: texts.saveFailedMessage,
              title: texts.saveFailedTitle,
            })
            .subscribe();
          return;
        case 'idle':
        case 'loading':
          return;
        default:
          return status satisfies never;
      }
    });
  }

  protected retry(): void {
    const path = this.store.descriptorPath();
    if (path !== null) {
      this.store.load(path);
    }
  }
}
