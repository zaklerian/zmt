import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatTreeHarness } from '@angular/material/tree/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import type { FileTreeItem } from '../util';

import { FileTreeComponent } from './file-tree.component';

const README: FileTreeItem = {
  children: null,
  error: null,
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

const COMMON: FileTreeItem = {
  children: null,
  error: null,
  expandable: true,
  id: '/mod/common',
  label: 'common',
  node: {
    extension: null,
    hasChildren: true,
    name: 'common',
    path: '/mod/common',
    support: 'readonly',
    type: 'directory',
  },
};

const ROOT: FileTreeItem = {
  children: [README, COMMON],
  error: null,
  expandable: true,
  id: '/mod',
  label: 'mod',
  node: null,
};

describe('FileTreeComponent', () => {
  async function setup(items: readonly FileTreeItem[], expanded: readonly string[] = []) {
    const fixture = TestBed.createComponent(FileTreeComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('expanded', expanded);
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

  it('expands the listed paths initially and shows children with their loading marker', async () => {
    const { fixture, loader } = await setup([ROOT], ['/mod']);
    const tree = await loader.getHarness(MatTreeHarness);
    const [root] = await tree.getNodes();
    expect(await root?.isExpanded()).toBe(true);
    const labels = await loader.getAllHarnesses(MatButtonHarness.with({ selector: '.node' }));
    expect(await Promise.all(labels.map((label) => label.getText()))).toEqual([
      'mod',
      'readme.txt',
      'common',
    ]);
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('.loading')?.textContent.trim()).toBe(
      EN_MESSAGES.modContent.fileTreeLoading,
    );
  });

  it('keeps the root expanded and renders children that arrive after the first paint', async () => {
    const { fixture, loader } = await setup([{ ...ROOT, children: null }], ['/mod']);
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('.loading')).not.toBeNull();
    fixture.componentRef.setInput('items', [ROOT]);
    await fixture.whenStable();
    const labels = await loader.getAllHarnesses(MatButtonHarness.with({ selector: '.node' }));
    expect(await Promise.all(labels.map((label) => label.getText()))).toEqual([
      'mod',
      'readme.txt',
      'common',
    ]);
  });

  it('shows the folder error instead of the loading marker', async () => {
    const failed: FileTreeItem = {
      ...ROOT,
      children: [{ ...COMMON, error: { code: 404, message: 'gone' } }],
    };
    const { fixture } = await setup([failed], ['/mod']);
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('.error')?.textContent.trim()).toBe(
      `${EN_MESSAGES.modContent.fileTreeFailed} ${EN_MESSAGES.errors[404]}`,
    );
    expect(host instanceof HTMLElement && host.querySelector('.loading')).toBeNull();
  });

  it('shows the empty message when there are no items', async () => {
    const { fixture } = await setup([]);
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('.empty')?.textContent.trim()).toBe(
      EN_MESSAGES.modContent.fileTreeEmpty,
    );
  });
});
