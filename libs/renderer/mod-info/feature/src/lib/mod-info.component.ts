import type { HasUnsavedChanges } from '@zmt/renderer/dialog/util';

import { Component, computed, inject, linkedSignal, viewChild } from '@angular/core';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import { ModInfoStore } from '@zmt/renderer/mod-info/data-access';
import { ModInfoFormComponent, ParserWarningsComponent } from '@zmt/renderer/mod-info/ui';
import { WorkspaceStore } from '@zmt/renderer/workspace/data-access';

@Component({
  imports: [ModInfoFormComponent, ParserWarningsComponent],
  selector: 'zmt-mod-info',
  styles: `
    .title {
      margin: 0 0 1rem;
      font: var(--mat-sys-headline-small);
    }
  `,
  template: `
    <h2 class="title">{{ messages().modInfo.title }}</h2>
    @if (workspace.hasRoot()) {
      @if (draft(); as values) {
        <zmt-mod-info-form
          [messages]="messages()"
          [saving]="store.saving()"
          [values]="values"
          (valuesChange)="draft.set($event)"
          (discard)="draft.set(store.values())"
          (save)="store.save($event)"
        />
        <zmt-parser-warnings [messages]="messages()" [warnings]="store.parserWarnings()" />
      }
    } @else {
      <p class="no-root">{{ messages().modInfo.noRoot }}</p>
    }
  `,
})
export class ModInfoComponent implements HasUnsavedChanges {
  private readonly form = viewChild(ModInfoFormComponent);
  protected readonly messages = inject(I18nStore).messages;
  protected readonly store = inject(ModInfoStore);
  protected readonly workspace = inject(WorkspaceStore);

  protected readonly draft = linkedSignal(() => this.store.values());

  readonly dirty = computed(() => this.form()?.dirty() ?? false);
}
