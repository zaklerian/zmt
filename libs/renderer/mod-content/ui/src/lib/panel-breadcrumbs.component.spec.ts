import { TestBed } from '@angular/core/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { PanelBreadcrumbsComponent } from './panel-breadcrumbs.component';

describe('PanelBreadcrumbsComponent', () => {
  it('lists the root name followed by every path segment', async () => {
    const fixture = TestBed.createComponent(PanelBreadcrumbsComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('rootName', 'my-mod');
    fixture.componentRef.setInput('segments', ['common', 'technologies', 'air.txt']);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe(
      EN_MESSAGES.modContent.breadcrumbs,
    );
    expect([...host.querySelectorAll('li')].map((item) => item.textContent.trim())).toEqual([
      'my-mod',
      'common',
      'technologies',
      'air.txt',
    ]);
  });
});
