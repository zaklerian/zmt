import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MESSAGES } from '@zmt/renderer/shell/ui';

import type {
  TechnologyDeleteMode,
  TechnologyDeletePlan,
  TechnologyDeletePlanResult,
} from '../util';

@Component({
  imports: [MatButtonModule],
  selector: 'zmt-technology-delete-dialog',
  styles: `
    .dialog {
      padding: 1rem;
      background: var(--mat-sys-surface-container-high);
      border-radius: 8px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
  template: `
    <section class="dialog" role="alertdialog" [attr.aria-label]="title()">
      <h3 class="title">{{ title() }}</h3>
      <p class="item-summary">{{ itemSummary() }}</p>
      @if (hasTree()) {
        <p class="tree-summary">{{ treeSummary() }}</p>
      }
      <div class="actions">
        <button matButton type="button" class="cancel" [disabled]="busy()" (click)="dismiss.emit()">
          {{ messages().actions.cancel }}
        </button>
        <button
          matButton
          type="button"
          class="confirm-item"
          [disabled]="busy()"
          (click)="confirmDelete.emit('item')"
        >
          {{ messages().techTree.deleteConfirmItem }}
        </button>
        @if (hasTree()) {
          <button
            matButton="filled"
            type="button"
            class="confirm-tree"
            [disabled]="busy()"
            (click)="confirmDelete.emit('tree')"
          >
            {{ messages().techTree.deleteConfirmTree(plan().tree.targets.length) }}
          </button>
        }
      </div>
    </section>
  `,
})
export class TechnologyDeleteDialogComponent {
  readonly busy = input(false);
  readonly confirmDelete = output<TechnologyDeleteMode>();
  readonly dismiss = output();
  readonly hasTree = input(false);
  protected readonly messages = inject(MESSAGES);
  readonly plan = input.required<TechnologyDeletePlanResult>();
  readonly token = input.required<string>();

  protected readonly title = computed(() => this.messages().techTree.deleteTitle(this.token()));

  protected readonly itemSummary = computed(() =>
    this.summarize(this.plan().item, this.messages().techTree.deleteItemSummary),
  );

  protected readonly treeSummary = computed(() =>
    this.summarize(this.plan().tree, this.messages().techTree.deleteTreeSummary),
  );

  private summarize(plan: TechnologyDeletePlan, summary: (total: number) => string): string {
    const texts = this.messages().techTree;
    const parts = [summary(plan.targets.length)];
    if (plan.blocked.length > 0) {
      parts.push(texts.deleteBlocked(plan.blocked.length));
    }
    if (plan.inboundReferences.length > 0) {
      parts.push(texts.deleteInbound(plan.inboundReferences.length));
    }
    return parts.join(' ');
  }
}
