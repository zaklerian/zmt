import { TestBed } from '@angular/core/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ContentPlaceholderComponent } from './content-placeholder.component';

describe('ContentPlaceholderComponent', () => {
  it('renders the select-something message', async () => {
    const fixture = TestBed.createComponent(ContentPlaceholderComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.textContent.trim()).toBe(
      EN_MESSAGES.modContent.selectSomething,
    );
  });
});
