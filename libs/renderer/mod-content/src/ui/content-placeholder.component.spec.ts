import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ContentPlaceholderComponent } from './content-placeholder.component';

describe('ContentPlaceholderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  it('renders the select-something message', async () => {
    const fixture = TestBed.createComponent(ContentPlaceholderComponent);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.textContent.trim()).toBe(
      EN_MESSAGES.modContent.selectSomething,
    );
  });
});
