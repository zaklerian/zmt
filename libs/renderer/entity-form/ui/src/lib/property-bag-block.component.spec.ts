import type { EntityFormValues, PropertyBagBlock } from '@zmt/renderer/entity-form/util';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { inputValue, PropertyBagBlockComponent } from './property-bag-block.component';

const FIXED: PropertyBagBlock = {
  kind: 'propertyBag',
  members: {
    fields: [
      { label: 'Name', readonly: true, spec: { name: 'name' }, value: 'fighter1' },
      { label: 'Research cost', spec: { name: 'research_cost' }, value: '2' },
    ],
    mode: 'fixed',
  },
  scope: null,
  sectionLabel: 'Technology',
};

const OPEN: PropertyBagBlock = {
  kind: 'propertyBag',
  members: {
    knownKeys: [],
    mode: 'open',
    name: 'modifiers',
    rows: [{ key: 'stability_factor', value: '0.1' }],
  },
  scope: null,
};

describe('PropertyBagBlockComponent', () => {
  async function setup(block: PropertyBagBlock) {
    const fixture = TestBed.createComponent(PropertyBagBlockComponent);
    fixture.componentRef.setInput('block', block);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    const patches = vi.fn<(patch: EntityFormValues) => void>();
    fixture.componentInstance.patch.subscribe(patches);
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture), patches };
  }

  it('renders fixed fields with their labels and patches the edited one', async () => {
    const { loader, patches } = await setup(FIXED);
    const [name, cost] = await loader.getAllHarnesses(MatInputHarness);
    expect(await name?.isReadonly()).toBe(true);
    expect(await cost?.getValue()).toBe('2');
    await cost?.setValue('3');
    expect(patches).toHaveBeenLastCalledWith({ research_cost: '3' });
  });

  it('renders open rows with key and value inputs and patches, adds and removes rows', async () => {
    const { loader, patches } = await setup(OPEN);
    const [key, value] = await loader.getAllHarnesses(MatInputHarness);
    await key?.setValue('war_support_factor');
    expect(patches).toHaveBeenLastCalledWith({
      modifiers: [{ key: 'war_support_factor', value: '0.1' }],
    });
    await value?.setValue('0.2');
    expect(patches).toHaveBeenLastCalledWith({
      modifiers: [{ key: 'stability_factor', value: '0.2' }],
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.add' }))).click();
    expect(patches).toHaveBeenLastCalledWith({
      modifiers: [
        { key: 'stability_factor', value: '0.1' },
        { key: '', value: '' },
      ],
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.remove' }))).click();
    expect(patches).toHaveBeenLastCalledWith({ modifiers: [] });
  });

  it('reads the value of an input event and nothing from other targets', () => {
    const input = document.createElement('input');
    input.value = 'x';
    const event = new Event('input');
    Object.defineProperty(event, 'target', { value: input });
    expect(inputValue(event)).toBe('x');
    expect(inputValue(new Event('input'))).toBe('');
  });
});
