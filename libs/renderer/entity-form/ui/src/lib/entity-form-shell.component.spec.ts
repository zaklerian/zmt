import type { EntityFormModel, EntityFormValues } from '@zmt/renderer/entity-form/util';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { ok } from '@zmt/contracts';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { EntityFormShellComponent } from './entity-form-shell.component';

const MODEL: EntityFormModel = {
  blocks: [
    {
      kind: 'propertyBag',
      members: {
        fields: [{ label: 'Research cost', spec: { name: 'research_cost' }, value: '2' }],
        mode: 'fixed',
      },
      scope: null,
    },
    { kind: 'listOfScalars', label: 'Categories', name: 'categories', scope: null, values: [] },
    { kind: 'namedNested', knownKeys: [], name: 'rules', rows: [], scope: null },
    {
      addLabel: 'Add path',
      fields: [],
      itemLabel: 'Path',
      items: [],
      kind: 'objectList',
      name: 'path',
      scope: null,
    },
  ],
  dialogTitle: 'fighter1',
  errorMessage: () => 'failed',
  errorTitle: 'Action failed',
  note: 'air',
  save: () => Promise.resolve(ok(null)),
};

describe('EntityFormShellComponent', () => {
  async function setup(chrome: 'dialog' | 'inline') {
    const fixture = TestBed.createComponent(EntityFormShellComponent);
    fixture.componentRef.setInput('chrome', chrome);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('model', MODEL);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('renders one block component per block and the dialog chrome', async () => {
    const { fixture, host, loader } = await setup('dialog');
    expect(host.querySelector('h3')?.textContent.trim()).toBe('fighter1');
    expect(host.querySelector('.note')?.textContent.trim()).toBe('air');
    expect(host.querySelectorAll('zmt-property-bag-block')).toHaveLength(1);
    expect(host.querySelectorAll('zmt-list-of-scalars-block')).toHaveLength(1);
    expect(host.querySelectorAll('zmt-named-nested-block')).toHaveLength(1);
    expect(host.querySelectorAll('zmt-object-list-block')).toHaveLength(1);
    expect(fixture.componentInstance.dirty()).toBe(false);
    const dismiss = vi.fn();
    fixture.componentInstance.dismiss.subscribe(dismiss);
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.dismiss' }))).click();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('merges block patches into the values, turns dirty and emits save', async () => {
    const { fixture, host, loader } = await setup('inline');
    const events = vi.fn<(event: EntityFormValues | string) => void>();
    fixture.componentInstance.save.subscribe(events);
    fixture.componentInstance.discard.subscribe(() => {
      events('discard');
    });

    const field = await loader.getHarness(MatInputHarness);
    await field.setValue('3');
    expect(fixture.componentInstance.values()).toEqual({ research_cost: '3' });
    expect(fixture.componentInstance.dirty()).toBe(true);

    await (await loader.getHarness(MatButtonHarness.with({ selector: '.save' }))).click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.discard' }))).click();
    expect(events.mock.calls).toEqual([[{ research_cost: '3' }], ['discard']]);
    expect(host.querySelector('h3')).toBeNull();
  });
});
