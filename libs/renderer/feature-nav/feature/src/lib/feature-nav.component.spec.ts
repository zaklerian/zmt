import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { FeatureNavStore } from '@zmt/renderer/feature-nav/data-access';
import { FeatureNavListComponent } from '@zmt/renderer/feature-nav/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { FeatureNavComponent } from './feature-nav.component';
import { FEATURE_ROUTES } from './feature-route.const';

describe('FeatureNavComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('shows the title, the list and the placeholder', async () => {
    const fixture = TestBed.createComponent(FeatureNavComponent);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('h2')?.textContent.trim()).toBe(
      EN_MESSAGES.featureNav.title,
    );
    expect(fixture.debugElement.query(By.css('zmt-feature-tree-placeholder'))).not.toBeNull();
  });

  it('selects the feature in the store and routes the aircraft feature to the tech tree', async () => {
    const select = vi
      .spyOn(TestBed.inject(FeatureNavStore), 'select')
      .mockImplementation(() => undefined);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(FeatureNavComponent);
    await fixture.whenStable();
    const list = fixture.debugElement
      .query(By.directive(FeatureNavListComponent))
      .injector.get(FeatureNavListComponent);

    list.selectFeature.emit('aircraft');
    expect(select).toHaveBeenLastCalledWith('aircraft');
    expect(navigate).toHaveBeenCalledWith(['/', FEATURE_ROUTES.aircraft]);

    list.selectFeature.emit('traits');
    expect(select).toHaveBeenLastCalledWith('traits');
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
