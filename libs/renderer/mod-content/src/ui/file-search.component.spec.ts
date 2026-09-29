import type { FsNode } from '@zmt/contracts';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { FileSearchComponent } from './file-search.component';

const HIT: FsNode = {
  extension: '.txt',
  hasChildren: false,
  name: 'air.txt',
  path: '/mod/common/technologies/air.txt',
  support: 'editable',
  type: 'file',
};

describe('FileSearchComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  async function setup(disabled: boolean) {
    const fixture = TestBed.createComponent(FileSearchComponent);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.componentRef.setInput('results', [HIT]);
    await fixture.whenStable();
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('is disabled with the no-root placeholder until a folder is open', async () => {
    const { fixture, loader } = await setup(true);
    const input = await loader.getHarness(MatInputHarness);
    expect(await input.isDisabled()).toBe(true);
    expect(await input.getPlaceholder()).toBe(EN_MESSAGES.modContent.searchNoRoot);

    fixture.componentRef.setInput('disabled', false);
    expect(await input.isDisabled()).toBe(false);
  });

  it('mirrors typing into the query model and the query model into the input', async () => {
    const { fixture, loader } = await setup(false);
    const changes = vi.fn<(query: string) => void>();
    fixture.componentInstance.query.subscribe(changes);
    const input = await loader.getHarness(MatInputHarness);
    expect(await input.getPlaceholder()).toBe(EN_MESSAGES.modContent.searchReady);
    await input.setValue('air');
    expect(fixture.componentInstance.query()).toBe('air');
    expect(changes).toHaveBeenLastCalledWith('air');

    fixture.componentRef.setInput('query', 'naval');
    await fixture.whenStable();
    expect(await input.getValue()).toBe('naval');
  });

  it('emits the picked node and takes its path as the query', async () => {
    const { fixture, loader } = await setup(false);
    const picked = vi.fn<(node: FsNode) => void>();
    fixture.componentInstance.selectNode.subscribe(picked);
    const input = await loader.getHarness(MatInputHarness);
    await input.setValue('air');

    const autocomplete = await loader.getHarness(MatAutocompleteHarness);
    await autocomplete.focus();
    await autocomplete.selectOption({ text: 'air.txt' });
    expect(picked).toHaveBeenCalledWith(HIT);
    expect(fixture.componentInstance.query()).toBe(HIT.path);
    expect(await input.getValue()).toBe(HIT.path);
  });
});
