import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatNavListHarness } from '@angular/material/list/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { FeatureNavListComponent } from './feature-nav-list.component';

describe('FeatureNavListComponent', () => {
  it('lists enabled features, marks the active one and emits the picked id', async () => {
    const fixture = TestBed.createComponent(FeatureNavListComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('features', [
      { enabled: true, featureId: 'aircraft', label: 'Aircraft' },
      { enabled: true, featureId: 'traits', label: 'Traits' },
    ]);
    fixture.componentRef.setInput('activeFeatureId', 'traits');
    await fixture.whenStable();
    const picked = vi.fn<(id: string) => void>();
    fixture.componentInstance.selectFeature.subscribe(picked);

    const list = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatNavListHarness);
    const items = await list.getItems();
    expect(await Promise.all(items.map((item) => item.getTitle()))).toEqual(['Aircraft', 'Traits']);
    expect(await items[1]?.isActivated()).toBe(true);
    await items[0]?.click();
    expect(picked).toHaveBeenCalledWith('aircraft');
  });

  it('shows the empty message without features', async () => {
    const fixture = TestBed.createComponent(FeatureNavListComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('features', []);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('.empty')?.textContent.trim()).toBe(
      EN_MESSAGES.featureNav.noFeatures,
    );
  });
});
