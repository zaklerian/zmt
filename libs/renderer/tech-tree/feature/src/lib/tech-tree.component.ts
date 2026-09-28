import type { CanvasNodeMenuRequest } from '@zmt/renderer/tech-tree/ui';
import type { TechTreePoint } from '@zmt/renderer/tech-tree/util';

import { Component, computed, inject, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EntityFormShellComponent } from '@zmt/renderer/entity-form/ui';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import {
  TechnologyDeleteStore,
  TechnologyFormStore,
  TechTreeStore,
} from '@zmt/renderer/tech-tree/data-access';
import {
  CanvasActionsComponent,
  CanvasContextMenuComponent,
  CanvasToolbarComponent,
  TechnologyDeleteDialogComponent,
  TechTreeCanvasComponent,
} from '@zmt/renderer/tech-tree/ui';

export interface CanvasMenuTarget {
  readonly anchor: TechTreePoint;
  readonly position: TechTreePoint;
  readonly technologyId: null | string;
}

@Component({
  imports: [
    CanvasActionsComponent,
    CanvasContextMenuComponent,
    CanvasToolbarComponent,
    EntityFormShellComponent,
    MatSlideToggleModule,
    TechnologyDeleteDialogComponent,
    TechTreeCanvasComponent,
  ],
  selector: 'zmt-tech-tree',
  styleUrl: './tech-tree.component.scss',
  templateUrl: './tech-tree.component.html',
})
export class TechTreeComponent {
  protected readonly delete = inject(TechnologyDeleteStore);
  protected readonly form = inject(TechnologyFormStore);
  protected readonly menu = signal<CanvasMenuTarget | null>(null);
  protected readonly messages = inject(I18nStore).messages;
  protected readonly tree = inject(TechTreeStore);

  protected readonly message = computed<null | string>(() => {
    const status = this.tree.status();
    const texts = this.messages().techTree;
    switch (status.kind) {
      case 'error':
        return texts.error;
      case 'idle':
        return null;
      case 'loading':
        return texts.loading;
      case 'success':
        return this.tree.isEmpty() ? texts.empty : null;
      default:
        return status satisfies never;
    }
  });

  protected closeMenu(): void {
    this.menu.set(null);
  }

  protected onAddChild(): void {
    const id = this.tree.selectedId();
    if (id !== null) {
      this.form.openAddChild(id);
    }
  }

  protected onDelete(): void {
    const id = this.tree.selectedId();
    if (id !== null) {
      this.delete.open(id);
    }
  }

  protected onEdit(): void {
    const id = this.tree.selectedId();
    if (id !== null) {
      this.form.openEdit(id);
    }
  }

  protected openNodeMenu(request: CanvasNodeMenuRequest): void {
    this.menu.set({ anchor: request.anchor, position: request.anchor, technologyId: request.id });
  }

  protected openPaneMenu(point: TechTreePoint): void {
    this.menu.set({ anchor: point, position: point, technologyId: null });
  }
}
