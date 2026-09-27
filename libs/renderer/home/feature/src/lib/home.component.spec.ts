import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { APP_VERSION } from '@zmt/renderer/app-info/data-access';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import { EN_MESSAGES, LOCALE, LOCALE_LOADERS } from '@zmt/shared/i18n';

import { HomeComponent } from './home.component';

function hostOf(fixture: ComponentFixture<unknown>): HTMLElement {
  const host: unknown = fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('fixture host is not an HTMLElement');
  }
  return host;
}

describe('HomeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: APP_VERSION, useValue: '1.2.3' }],
    });
  });

  it('renders the welcome and the parameterised version message for the active locale', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    const heading = hostOf(fixture).querySelector('h2');
    const version = hostOf(fixture).querySelector('p');
    expect(heading?.textContent.trim()).toBe(EN_MESSAGES.home.welcome);
    expect(version?.textContent.trim()).toBe(EN_MESSAGES.home.version('1.2.3'));

    const de = await LOCALE_LOADERS.de();
    TestBed.inject(I18nStore).setLocale(LOCALE.de);
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(heading?.textContent.trim()).toBe(de.home.welcome);
    });
    expect(version?.textContent.trim()).toBe(de.home.version('1.2.3'));
  });
});
