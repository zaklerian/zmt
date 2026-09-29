import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatChipSetHarness } from '@angular/material/chips/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import type { ModDescriptorValues } from '../util';

import { ModInfoFormComponent } from './mod-info-form.component';

const VALUES: ModDescriptorValues = {
  name: 'My mod',
  path: 'mod/my-mod',
  picture: 'thumbnail.png',
  supportedVersion: '1.14.*',
  tags: ['Gameplay'],
  version: '0.1',
};

describe('ModInfoFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(ModInfoFormComponent);
    fixture.componentRef.setInput('values', VALUES);
    await fixture.whenStable();
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('binds the descriptor fields and tags from the values model', async () => {
    const { loader } = await setup();
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    expect(await Promise.all(inputs.map((input) => input.getValue()))).toEqual([
      'My mod',
      '0.1',
      '1.14.*',
      '',
      'thumbnail.png',
      'mod/my-mod',
    ]);
    expect(await Promise.all(inputs.map((input) => input.isReadonly()))).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    const chips = await (await loader.getHarness(MatChipSetHarness)).getChips();
    expect(await Promise.all(chips.map((chip) => chip.getText()))).toEqual(['Gameplay']);
  });

  it('writes typed values into the model and emits save and cancel once dirty', async () => {
    const { fixture, loader } = await setup();
    const events = vi.fn<(event: ModDescriptorValues | string) => void>();
    fixture.componentInstance.save.subscribe(events);
    fixture.componentInstance.discard.subscribe(() => {
      events('discard');
    });
    const save = await loader.getHarness(MatButtonHarness.with({ selector: '.save' }));
    expect(await save.isDisabled()).toBe(true);

    const [, version] = await loader.getAllHarnesses(MatInputHarness);
    await version?.setValue('0.2');
    expect(fixture.componentInstance.values()).toEqual({ ...VALUES, version: '0.2' });

    fixture.componentRef.setInput('dirty', true);
    expect(await save.isDisabled()).toBe(false);
    await save.click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.cancel' }))).click();
    expect(events.mock.calls).toEqual([[{ ...VALUES, version: '0.2' }], ['discard']]);
  });

  it('adds a typed tag on enter through the form and clears the draft', async () => {
    const { fixture, loader } = await setup();
    const changes = vi.fn<(values: ModDescriptorValues) => void>();
    fixture.componentInstance.values.subscribe(changes);
    const tagInput = await loader.getHarness(MatInputHarness.with({ selector: '.tag-input' }));
    await tagInput.setValue('  Balance ');
    const host = await tagInput.host();
    await host.dispatchEvent('keydown', { key: 'Enter' });
    await fixture.whenStable();
    expect(fixture.componentInstance.values().tags).toEqual(['Gameplay', 'Balance']);
    expect(changes).toHaveBeenLastCalledWith({ ...VALUES, tags: ['Gameplay', 'Balance'] });
    expect(await tagInput.getValue()).toBe('');

    await host.dispatchEvent('keydown', { key: 'Enter' });
    await fixture.whenStable();
    expect(fixture.componentInstance.values().tags).toEqual(['Gameplay', 'Balance']);
  });

  it('disables both actions while saving', async () => {
    const { fixture, loader } = await setup();
    fixture.componentRef.setInput('dirty', true);
    fixture.componentRef.setInput('saving', true);
    const save = await loader.getHarness(MatButtonHarness.with({ selector: '.save' }));
    const cancel = await loader.getHarness(MatButtonHarness.with({ selector: '.cancel' }));
    expect(await save.isDisabled()).toBe(true);
    expect(await cancel.isDisabled()).toBe(true);
  });
});
