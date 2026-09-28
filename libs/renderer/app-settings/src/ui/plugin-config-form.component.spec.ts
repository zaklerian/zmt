import type { GamePlugin } from '@zmt/contracts';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { PluginConfigFormComponent } from './plugin-config-form.component';

const HOI4: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [
    { enabled: true, featureId: 'aircraft', label: 'Aircraft' },
    { enabled: false, featureId: 'traits', label: 'Traits' },
  ],
  gameId: 'hoi4',
};

const STELLARIS: GamePlugin = { displayName: 'Stellaris', features: [], gameId: 'stellaris' };

describe('PluginConfigFormComponent', () => {
  async function setup(plugins: readonly GamePlugin[]) {
    const fixture = TestBed.createComponent(PluginConfigFormComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('plugins', plugins);
    fixture.componentRef.setInput('activePlugin', HOI4);
    await fixture.whenStable();
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('offers the plugins in a select and the active plugin features as toggles', async () => {
    const { fixture, loader } = await setup([HOI4, STELLARIS]);
    const select = await loader.getHarness(MatSelectHarness);
    expect(await select.isDisabled()).toBe(false);
    expect(await select.getValueText()).toBe('Hearts of Iron IV');
    const toggles = await loader.getAllHarnesses(MatSlideToggleHarness);
    expect(await Promise.all(toggles.map((toggle) => toggle.isChecked()))).toEqual([true, false]);

    await toggles[1]?.check();
    expect(fixture.componentInstance.features()).toEqual({ traits: true });

    const games = vi.fn<(gameId: string) => void>();
    fixture.componentInstance.gameChange.subscribe(games);
    await select.open();
    await select.clickOptions({ text: 'Stellaris' });
    expect(games).toHaveBeenCalledWith('stellaris');
  });

  it('disables the game select when only one plugin is registered', async () => {
    const { loader } = await setup([HOI4]);
    expect(await (await loader.getHarness(MatSelectHarness)).isDisabled()).toBe(true);
  });
});
