import { TestBed } from '@angular/core/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ParserWarningsComponent } from './parser-warnings.component';

describe('ParserWarningsComponent', () => {
  function hostOf(fixture: { readonly nativeElement: unknown }): HTMLElement {
    const host = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return host;
  }

  it('renders nothing without warnings', async () => {
    const fixture = TestBed.createComponent(ParserWarningsComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('warnings', []);
    await fixture.whenStable();
    expect(hostOf(fixture).querySelector('details')).toBeNull();
  });

  it('summarises the count and lists each warning with its offset', async () => {
    const fixture = TestBed.createComponent(ParserWarningsComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('warnings', [{ from: 3, message: 'unexpected token', to: 9 }]);
    await fixture.whenStable();
    const host = hostOf(fixture);
    expect(host.querySelector('summary')?.textContent.trim()).toBe(
      EN_MESSAGES.modInfo.parserWarnings(1),
    );
    expect(host.querySelector('.message')?.textContent.trim()).toBe('unexpected token');
    expect(host.querySelector('.offset')?.textContent.trim()).toBe(
      EN_MESSAGES.modInfo.parserOffset(3, 9),
    );
  });
});
