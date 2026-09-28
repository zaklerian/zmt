import type { EntityActionView, EntityColumn, EntityRow } from '@zmt/renderer/plugin/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

@Component({
  imports: [MatButtonModule, MatTableModule],
  selector: 'zmt-entity-table',
  styleUrl: './entity-table.component.scss',
  templateUrl: './entity-table.component.html',
})
export class EntityTableComponent {
  readonly actions = input.required<readonly EntityActionView[]>();
  readonly columns = input.required<readonly EntityColumn[]>();
  readonly messages = input.required<Messages>();
  readonly rows = input.required<readonly EntityRow[]>();
  readonly runAction = output<string>();
  readonly selectRow = output<null | string>();
  readonly selectedRowId = input<null | string>(null);

  protected readonly columnIds = computed(() => this.columns().map((column) => column.id));
  protected readonly dataSource = computed(() => [...this.rows()]);

  protected toggleRow(rowId: string): void {
    this.selectRow.emit(this.selectedRowId() === rowId ? null : rowId);
  }
}
