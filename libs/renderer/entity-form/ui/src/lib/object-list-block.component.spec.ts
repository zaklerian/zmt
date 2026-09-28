import type { EntityFormValues, ObjectListBlock } from '@zmt/renderer/entity-form/util';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ObjectListBlockComponent } from './object-list-block.component';

const BLOCK: ObjectListBlock = {
  addLabel: 'Add path',
  fields: [
    { label: 'Leads to tech', spec: { name: 'leads_to_tech' } },
    { label: 'Research cost coefficient', spec: { name: 'research_cost_coeff' } },
  ],
  itemLabel: 'Path',
  items: [{ leads_to_tech: 'fighter2', research_cost_coeff: 1 }],
  kind: 'objectList',
  name: 'path',
  scope: null,
  sectionLabel: 'Paths',
};

describe('ObjectListBlockComponent', () => {
  it('renders one card per item and patches edits, additions and removals', async () => {
    const fixture = TestBed.createComponent(ObjectListBlockComponent);
    fixture.componentRef.setInput('block', BLOCK);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    const patches = vi.fn<(patch: EntityFormValues) => void>();
    fixture.componentInstance.patch.subscribe(patches);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    expect(host.querySelector('.item-title')?.textContent.trim()).toBe('Path 1');

    const [target, coefficient] = await loader.getAllHarnesses(MatInputHarness);
    expect(await target?.getValue()).toBe('fighter2');
    expect(await coefficient?.getValue()).toBe('');
    await target?.setValue('fighter3');
    expect(patches).toHaveBeenLastCalledWith({
      path: [{ leads_to_tech: 'fighter3', research_cost_coeff: 1 }],
    });

    await (await loader.getHarness(MatButtonHarness.with({ selector: '.add' }))).click();
    expect(patches).toHaveBeenLastCalledWith({
      path: [
        { leads_to_tech: 'fighter2', research_cost_coeff: 1 },
        { leads_to_tech: '', research_cost_coeff: '' },
      ],
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.remove' }))).click();
    expect(patches).toHaveBeenLastCalledWith({ path: [] });
  });
});
