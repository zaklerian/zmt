import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatChipSetHarness } from '@angular/material/chips/testing';
import { MatInputHarness } from '@angular/material/input/testing';
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
  async function setup() {
    const fixture = TestBed.createComponent(ModInfoFormComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('values', VALUES);
    await fixture.whenStable();
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('binds the descriptor fields and tags from the values model', async () => {
    const { fixture, loader } = await setup();
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    expect(await Promise.all(inputs.map((input) => input.getValue()))).toEqual([
      'My mod',
      '0.1',
      '1.14.*',
      '',
      'thumbnail.png',
      'mod/my-mod',
    ]);
    const chips = await (await loader.getHarness(MatChipSetHarness)).getChips();
    expect(await Promise.all(chips.map((chip) => chip.getText()))).toEqual(['Gameplay']);
    expect(fixture.componentInstance.dirty()).toBe(false);
  });

  it('tracks dirtiness through the signal form and emits save and cancel', async () => {
    const { fixture, loader } = await setup();
    const events = vi.fn<(event: ModDescriptorValues | string) => void>();
    fixture.componentInstance.save.subscribe(events);
    fixture.componentInstance.discard.subscribe(() => {
      events('discard');
    });

    const [, version] = await loader.getAllHarnesses(MatInputHarness);
    await version?.setValue('0.2');
    expect(fixture.componentInstance.values().version).toBe('0.2');
    expect(fixture.componentInstance.dirty()).toBe(true);

    await (await loader.getHarness(MatButtonHarness.with({ selector: '.save' }))).click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.cancel' }))).click();
    expect(events.mock.calls).toEqual([[{ ...VALUES, version: '0.2' }], ['discard']]);
  });

  it('adds a typed tag on enter and marks the tags dirty', async () => {
    const { fixture, loader } = await setup();
    const tagInput = await loader.getHarness(MatInputHarness.with({ selector: '.tag-input' }));
    await tagInput.setValue('Balance');
    const host = await tagInput.host();
    await host.dispatchEvent('keydown', { key: 'Enter' });
    expect(fixture.componentInstance.values().tags).toEqual(['Gameplay', 'Balance']);
    expect(fixture.componentInstance.dirty()).toBe(true);
    expect(await tagInput.getValue()).toBe('');
  });
});
