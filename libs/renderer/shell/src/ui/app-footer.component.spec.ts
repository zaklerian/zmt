import { TestBed } from '@angular/core/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { AppFooterComponent } from './app-footer.component';

describe('AppFooterComponent', () => {
  it('renders the version through the localized message', async () => {
    const fixture = TestBed.createComponent(AppFooterComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('version', '1.2.3');
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('footer')?.textContent.trim()).toBe(
      EN_MESSAGES.home.version('1.2.3'),
    );
  });
});
