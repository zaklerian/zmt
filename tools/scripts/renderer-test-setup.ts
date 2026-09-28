import '@angular/compiler';
import { ɵgetCleanupHook as getCleanupHook, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeEach } from 'vitest';

beforeEach(getCleanupHook(false));
afterEach(getCleanupHook(true));

const TESTBED_SETUP = Symbol.for('@zmt/renderer-testbed-setup');

if (!Reflect.get(globalThis, TESTBED_SETUP)) {
  Reflect.set(globalThis, TESTBED_SETUP, true);
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  });
}
