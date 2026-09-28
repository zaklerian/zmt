import { Component, inject, input, output } from '@angular/core';
import { MESSAGES } from '@zmt/renderer/shell/ui';

import type { TechTreePoint } from '../util';

@Component({
  selector: 'zmt-canvas-context-menu',
  styles: `
    .menu {
      position: fixed;
      display: flex;
      flex-direction: column;
      min-width: 12rem;
      padding: 0.25rem 0;
      background: var(--mat-sys-surface-container);
      border-radius: 4px;
      box-shadow: var(--mat-sys-level2);
    }

    .item {
      padding: 0.5rem 1rem;
      text-align: left;
      background: none;
      border: 0;
      color: inherit;
      font: inherit;
    }

    .destructive {
      color: var(--mat-sys-error);
    }
  `,
  template: `
    <div
      class="menu"
      role="menu"
      tabindex="-1"
      [style.left.px]="anchor().x"
      [style.top.px]="anchor().y"
      (keydown.escape)="dismiss.emit()"
    >
      @if (technologyId(); as id) {
        <button type="button" role="menuitem" class="item edit" (click)="edit.emit(id)">
          {{ messages().techTree.edit }}
        </button>
        <button type="button" role="menuitem" class="item add" (click)="addChild.emit(id)">
          {{ messages().techTree.addChild }}
        </button>
        <button
          type="button"
          role="menuitem"
          class="item destructive"
          (click)="deleteTechnology.emit(id)"
        >
          {{ messages().techTree.delete }}
        </button>
      } @else {
        <button type="button" role="menuitem" class="item add" (click)="addFree.emit()">
          {{ messages().techTree.addFree }}
        </button>
      }
    </div>
  `,
})
export class CanvasContextMenuComponent {
  readonly addChild = output<string>();
  readonly addFree = output();
  readonly anchor = input.required<TechTreePoint>();
  readonly deleteTechnology = output<string>();
  readonly dismiss = output();
  readonly edit = output<string>();
  protected readonly messages = inject(MESSAGES);
  readonly technologyId = input<null | string>(null);
}
