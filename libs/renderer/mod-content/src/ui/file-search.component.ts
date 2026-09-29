import type { FsNode } from '@zmt/contracts';

import { Component, computed, inject, input, model, output } from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MESSAGES } from '@zmt/renderer/shell/ui';

@Component({
  imports: [FormField, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  selector: 'zmt-file-search',
  templateUrl: './file-search.component.html',
})
export class FileSearchComponent {
  readonly disabled = input(false);
  protected readonly messages = inject(MESSAGES);
  readonly query = model('');
  readonly results = input.required<readonly FsNode[]>();
  readonly selectNode = output<FsNode>();

  protected readonly placeholder = computed(() =>
    this.disabled()
      ? this.messages().modContent.searchNoRoot
      : this.messages().modContent.searchReady,
  );

  protected readonly searchForm = form(this.query, (path) => {
    disabled(path, { when: () => this.disabled() });
  });

  protected pick(event: MatAutocompleteSelectedEvent): void {
    const value: unknown = event.option.value;
    const node = this.results().find((candidate) => candidate.path === value);
    if (node) {
      this.selectNode.emit(node);
    }
  }
}
