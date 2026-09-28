import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { FeatureTreePlaceholderComponent } from './feature-tree-placeholder.component';

describe('FeatureTreePlaceholderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  function hostOf(fixture: { readonly nativeElement: unknown }): HTMLElement {
    const host = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return host;
  }

  it('asks for a selection when no feature is active', async () => {
    const fixture = TestBed.createComponent(FeatureTreePlaceholderComponent);
    await fixture.whenStable();
    expect(hostOf(fixture).querySelector('.no-selection')?.textContent.trim()).toBe(
      EN_MESSAGES.featureNav.noSelection,
    );
  });

  it('names the active feature above the placeholder texts', async () => {
    const fixture = TestBed.createComponent(FeatureTreePlaceholderComponent);
    fixture.componentRef.setInput('feature', {
      enabled: true,
      featureId: 'traits',
      label: 'Traits',
    });
    await fixture.whenStable();
    const host = hostOf(fixture);
    expect(host.querySelector('h3')?.textContent.trim()).toBe('Traits');
    expect(host.querySelector('.title')?.textContent.trim()).toBe(
      EN_MESSAGES.featureNav.treePlaceholderTitle,
    );
  });
});
