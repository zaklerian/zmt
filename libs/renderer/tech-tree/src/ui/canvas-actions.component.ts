import type { Messages } from '@zmt/shared/i18n';

import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import type { TechnologyDeleteStatus, TechnologyFlowStatus } from '../util';

export function flowCaption(
  status: TechnologyDeleteStatus,
  errorText: string,
  readonlyText: string,
): null | string {
  switch (status.kind) {
    case 'error':
      return `${errorText} ${status.error.message}`;
    case 'readonly':
      return readonlyText;
    case 'deleting':
    case 'idle':
    case 'loading':
      return null;
    default:
      return status satisfies never;
  }
}

@Component({
  imports: [MatButtonModule],
  selector: 'zmt-canvas-actions',
  styles: `
    .actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .destructive {
      color: var(--mat-sys-error);
    }
  `,
  template: `
    <div class="actions" role="toolbar" [attr.aria-label]="messages().modContent.entityActions">
      <button
        matButton
        type="button"
        class="edit"
        [disabled]="!hasSelection() || busy()"
        (click)="edit.emit()"
      >
        {{ messages().techTree.edit }}
      </button>
      <button
        matButton
        type="button"
        class="add"
        [disabled]="!hasSelection() || busy()"
        (click)="add.emit()"
      >
        {{ messages().techTree.addChild }}
      </button>
      <button
        matButton
        type="button"
        class="destructive"
        [disabled]="!hasSelection() || busy()"
        (click)="deleteTechnology.emit()"
      >
        {{ messages().techTree.delete }}
      </button>
    </div>
    @if (editCaption(); as caption) {
      <p class="caption edit-caption">{{ caption }}</p>
    }
    @if (addCaption(); as caption) {
      <p class="caption add-caption">{{ caption }}</p>
    }
    @if (deleteCaption(); as caption) {
      <p class="caption delete-caption">{{ caption }}</p>
    }
    <p class="hint">{{ messages().techTree.addFreeHint }}</p>
  `,
})
export class CanvasActionsComponent {
  readonly add = output();
  readonly addStatus = input.required<TechnologyFlowStatus>();
  readonly busy = input(false);
  readonly deleteStatus = input.required<TechnologyDeleteStatus>();
  readonly deleteTechnology = output();
  readonly edit = output();
  readonly editStatus = input.required<TechnologyFlowStatus>();
  readonly messages = input.required<Messages>();
  readonly technologyId = input<null | string>(null);

  protected readonly hasSelection = computed(() => this.technologyId() !== null);

  protected readonly addCaption = computed(() =>
    flowCaption(
      this.addStatus(),
      this.messages().techTree.addStatusError,
      this.messages().techTree.addStatusReadonly,
    ),
  );

  protected readonly deleteCaption = computed(() =>
    flowCaption(
      this.deleteStatus(),
      this.messages().techTree.deleteStatusError,
      this.messages().techTree.deleteStatusReadonly,
    ),
  );

  protected readonly editCaption = computed(() =>
    flowCaption(
      this.editStatus(),
      this.messages().techTree.editStatusError,
      this.messages().techTree.editStatusReadonly,
    ),
  );
}
