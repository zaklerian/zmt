import type { EntityFormValues, NamedNestedBlock } from '@zmt/renderer/entity-form/util';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import {
  KEYED_MAP_ENTRIES_SUFFIX,
  NamedNestedBlockComponent,
} from './named-nested-block.component';

const BLOCK: NamedNestedBlock = {
  editableKeyedMap: {
    addLabel: 'Add province',
    entryValue: { kind: 'propertyBag', knownKeys: [] },
    keyLabel: 'Province id',
  },
  kind: 'namedNested',
  knownKeys: [{ name: 'infrastructure' }],
  listChildren: [
    { kind: 'listOfScalars', label: 'Traits', name: 'traits', scope: null, values: ['brave'] },
  ],
  name: 'buildings',
  namedChildren: [
    {
      knownKeys: [],
      name: 'skills',
      rows: [{ key: 'attack', value: '3' }],
      scope: ['skills'],
      sectionLabel: 'Skills',
    },
  ],
  rows: [{ key: 'infrastructure', value: '4' }],
  scope: ['buildings'],
  sectionLabel: 'Buildings',
};

describe('NamedNestedBlockComponent', () => {
  it('renders rows, list children, read-only named children and the keyed-map entry button', async () => {
    const fixture = TestBed.createComponent(NamedNestedBlockComponent);
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

    expect(host.querySelector('legend')?.textContent.trim()).toBe('Buildings');
    expect(host.querySelectorAll('zmt-list-of-scalars-block')).toHaveLength(1);
    expect(host.querySelector('.child-title')?.textContent.trim()).toBe('Skills');
    expect(host.querySelector('.child-rows .value')?.textContent.trim()).toBe('3');

    const [key, value] = await loader.getAllHarnesses(MatInputHarness);
    await key?.setValue('arms_factory');
    expect(patches).toHaveBeenLastCalledWith({ buildings: [{ key: 'arms_factory', value: '4' }] });
    await value?.setValue('5');
    expect(patches).toHaveBeenLastCalledWith({
      buildings: [{ key: 'infrastructure', value: '5' }],
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.add' }))).click();
    expect(patches).toHaveBeenLastCalledWith({
      buildings: [
        { key: 'infrastructure', value: '4' },
        { key: '', value: '' },
      ],
    });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.remove' }))).click();
    expect(patches).toHaveBeenLastCalledWith({ buildings: [] });
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.add-entry' }))).click();
    expect(patches).toHaveBeenLastCalledWith({
      [`buildings${KEYED_MAP_ENTRIES_SUFFIX}`]: [{ key: '', rows: [] }],
    });
  });
});
