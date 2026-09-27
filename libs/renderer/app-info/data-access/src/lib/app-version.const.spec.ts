import { TestBed } from '@angular/core/testing';

import { APP_VERSION } from './app-version.const';

describe('APP_VERSION', () => {
  it('resolves to the value the application provides', () => {
    TestBed.configureTestingModule({ providers: [{ provide: APP_VERSION, useValue: '4.5.6' }] });
    expect(TestBed.inject(APP_VERSION)).toBe('4.5.6');
  });

  it('has no default, so a missing provider fails loudly', () => {
    TestBed.configureTestingModule({});
    expect(() => TestBed.inject(APP_VERSION)).toThrow(/APP_VERSION/);
  });
});
