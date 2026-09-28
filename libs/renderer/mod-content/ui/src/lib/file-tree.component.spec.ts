import type { FileTreeItem } from '@zmt/renderer/mod-content/util';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatTreeHarness } from '@angular/material/tree/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { FileTreeComponent } from './file-tree.component';

const README: FileTreeItem = {
  children: null,
  expandable: false,
  id: '/mod/readme.txt',
  label: 'readme.txt',
  node: {
    extension: '.txt',
    hasChildren: false,
    name: 'readme.txt',
    path: '/mod/readme.txt',
    support: 'editable',
    type: 'file',
  },
};

const ROOT: FileTreeItem = {
  children: [README],
  expandable: true,
  id: '/mod',
  label: 'mod',
  node: null,
};

describe('FileTreeComponent', () => {
  async function setup(items: readonly FileTreeItem[]) {
    const fixture = TestBed.createComponent(FileTreeComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('renders the root node labelled by the tree label and emits selections', async () => {
    const { fixture, loader } = await setup([ROOT]);
    const tree = await loader.getHarness(MatTreeHarness);
    expect(await (await tree.host()).getAttribute('aria-label')).toBe(
      EN_MESSAGES.modContent.fileTree,
    );
    const node = await loader.getHarness(MatButtonHarness.with({ selector: '.node' }));
    expect(await node.getText()).toBe('mod');

    const selected = vi.fn<(item: FileTreeItem) => void>();
    fixture.componentInstance.selectItem.subscribe(selected);
    const expanded = vi.fn<(item: FileTreeItem) => void>();
    fixture.componentInstance.expand.subscribe(expanded);
    await node.click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.toggle' }))).click();
    expect(selected).toHaveBeenCalledWith(ROOT);
    expect(expanded).toHaveBeenCalledWith(ROOT);
  });

  it('shows the empty message when there are no items', async () => {
    const { fixture } = await setup([]);
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('.empty')?.textContent.trim()).toBe(
      EN_MESSAGES.modContent.fileTreeEmpty,
    );
  });
});
