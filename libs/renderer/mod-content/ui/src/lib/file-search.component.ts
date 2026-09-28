import type { FsNode } from '@zmt/contracts';
import type { AsyncStatus } from '@zmt/renderer/async-status/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, computed, input, model, output } from '@angular/core';
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  imports: [MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  selector: 'zmt-file-search',
  templateUrl: './file-search.component.html',
})
export class FileSearchComponent {
  readonly disabled = input(false);
  readonly messages = input.required<Messages>();
  readonly query = model('');
  readonly results = input.required<readonly FsNode[]>();
  readonly selectNode = output<FsNode>();
  readonly status = input.required<AsyncStatus>();

  protected readonly placeholder = computed(() =>
    this.disabled()
      ? this.messages().modContent.searchNoRoot
      : this.messages().modContent.searchReady,
  );

  protected onInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.query.set(target.value);
    }
  }

  protected pick(event: MatAutocompleteSelectedEvent): void {
    const value: unknown = event.option.value;
    const node = this.results().find((candidate) => candidate.path === value);
    if (node) {
      this.selectNode.emit(node);
    }
  }
}
