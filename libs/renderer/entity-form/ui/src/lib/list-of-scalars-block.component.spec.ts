import type { EntityFormValues, ListOfScalarsBlock } from '@zmt/renderer/entity-form/util';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatChipSetHarness } from '@angular/material/chips/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ListOfScalarsBlockComponent } from './list-of-scalars-block.component';

const BLOCK: ListOfScalarsBlock = {
  kind: 'listOfScalars',
  label: 'Categories',
  name: 'categories',
  placeholder: 'Add category…',
  scope: null,
  values: ['air_equipment', 'fighter'],
};

describe('ListOfScalarsBlockComponent', () => {
  it('renders the values as chips and patches additions and removals', async () => {
    const fixture = TestBed.createComponent(ListOfScalarsBlockComponent);
    fixture.componentRef.setInput('block', BLOCK);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    const patches = vi.fn<(patch: EntityFormValues) => void>();
    fixture.componentInstance.patch.subscribe(patches);
    const loader = TestbedHarnessEnvironment.loader(fixture);

    const chips = await (await loader.getHarness(MatChipSetHarness)).getChips();
    expect(await Promise.all(chips.map((chip) => chip.getText()))).toEqual([
      'air_equipment',
      'fighter',
    ]);
    await chips[0]?.remove();
    expect(patches).toHaveBeenLastCalledWith({ categories: ['fighter'] });

    const entry = await loader.getHarness(MatInputHarness);
    await entry.setValue('cas');
    await (await entry.host()).dispatchEvent('keydown', { key: 'Enter' });
    expect(patches).toHaveBeenLastCalledWith({ categories: ['air_equipment', 'fighter', 'cas'] });
    expect(await entry.getValue()).toBe('');
  });
});
