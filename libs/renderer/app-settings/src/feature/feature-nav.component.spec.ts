import type { GamePlugin } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { flushPromises } from '@zmt/renderer/core';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { AppSettingsStore, FeatureNavStore, PluginService } from '../data-access';
import { FeatureNavListComponent } from '../ui';
import { FeatureNavComponent } from './feature-nav.component';
import { FEATURE_ROUTES } from './feature-route.const';

const HOI4: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [
    { enabled: true, featureId: 'aircraft', label: 'Aircraft' },
    { enabled: false, featureId: 'traits', label: 'Traits' },
  ],
  gameId: 'hoi4',
};

describe('FeatureNavComponent', () => {
  const list = vi.fn();

  beforeEach(() => {
    list.mockReset().mockResolvedValue(ok([HOI4]));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PluginService, useValue: { list } }],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(FeatureNavComponent);
    await fixture.whenStable();
    await flushPromises();
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host };
  }

  it('shows the title, loads the enabled features and reloads when toggles change', async () => {
    const { fixture, host } = await setup();
    expect(host.querySelector('h2')?.textContent.trim()).toBe(EN_MESSAGES.featureNav.title);
    expect(fixture.debugElement.query(By.css('zmt-feature-tree-placeholder'))).not.toBeNull();
    expect(list).toHaveBeenCalledTimes(1);
    const store = TestBed.inject(FeatureNavStore);
    expect(store.features().map((feature) => feature.featureId)).toEqual(['aircraft']);

    patchState(unprotected(TestBed.inject(AppSettingsStore)), { featureToggles: { traits: true } });
    await fixture.whenStable();
    await flushPromises();
    expect(list).toHaveBeenCalledTimes(2);
    expect(store.features().map((feature) => feature.featureId)).toEqual(['aircraft', 'traits']);
  });

  it('shows the load error', async () => {
    list.mockResolvedValue(fail(500, 'boom'));
    const { host } = await setup();
    expect(host.querySelector('.error')?.textContent.trim()).toBe(
      `${EN_MESSAGES.featureNav.loadFailed} ${EN_MESSAGES.errors[500]}`,
    );
  });

  it('selects the feature in the store and routes the aircraft feature to the tech tree', async () => {
    const select = vi.spyOn(TestBed.inject(FeatureNavStore), 'select');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { fixture } = await setup();
    const featureList = fixture.debugElement
      .query(By.directive(FeatureNavListComponent))
      .injector.get(FeatureNavListComponent);

    featureList.selectFeature.emit('aircraft');
    expect(select).toHaveBeenLastCalledWith('aircraft');
    expect(navigate).toHaveBeenCalledWith(['/', FEATURE_ROUTES.aircraft]);

    featureList.selectFeature.emit('traits');
    expect(select).toHaveBeenLastCalledWith('traits');
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
