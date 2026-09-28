import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatNavListHarness } from '@angular/material/list/testing';
import { provideRouter } from '@angular/router';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import type { NavEntry } from './navigation.model';

import { NavRailComponent } from './nav-rail.component';

const ENTRIES: readonly NavEntry[] = [
  { icon: 'home', label: 'home', path: '' },
  { icon: 'folder', label: 'modContent', path: 'mod-content' },
];

describe('NavRailComponent', () => {
  it('renders one link per entry with the localized label and the route path', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NavRailComponent);
    fixture.componentRef.setInput('entries', ENTRIES);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();

    const loader = TestbedHarnessEnvironment.loader(fixture);
    const list = await loader.getHarness(MatNavListHarness);
    const items = await list.getItems();
    expect(await Promise.all(items.map((item) => item.getTitle()))).toEqual([
      EN_MESSAGES.nav.home,
      EN_MESSAGES.nav.modContent,
    ]);
    expect(await items[1]?.getHref()).toBe('/mod-content');
    expect(await (await list.host()).getAttribute('aria-label')).toBe(EN_MESSAGES.shell.navigation);
    expect(await (await list.host()).hasClass('expanded')).toBe(false);

    fixture.componentRef.setInput('expanded', true);
    await fixture.whenStable();
    expect(await (await list.host()).hasClass('expanded')).toBe(true);
  });
});
