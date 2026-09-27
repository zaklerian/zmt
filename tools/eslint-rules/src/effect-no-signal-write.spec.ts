import { RuleTester } from '@typescript-eslint/rule-tester';
import { join } from 'node:path';

import { EFFECT_NO_SIGNAL_WRITE_RULE } from './effect-no-signal-write';

const RULE_TESTER = new RuleTester({
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: join(import.meta.dirname, '..', 'fixtures'),
    },
  },
});

const IMPORTS = `import { computed, effect, linkedSignal, model, signal, type WritableSignal } from '@angular/core';`;

RULE_TESTER.run('effect-no-signal-write', EFFECT_NO_SIGNAL_WRITE_RULE, {
  invalid: [
    {
      code: `${IMPORTS}
const count = signal(0);
effect(() => { count.set(1); });`,
      errors: [{ data: { method: 'set' }, messageId: 'signalWrite' }],
    },
    {
      code: `${IMPORTS}
const count = signal(0);
effect(function () { count.update((value) => value + 1); });`,
      errors: [{ data: { method: 'update' }, messageId: 'signalWrite' }],
    },
    {
      code: `${IMPORTS}
class Counter {
  readonly count = signal(0);
  readonly sync = effect(() => { this.count.set(2); });
}`,
      errors: [{ messageId: 'signalWrite' }],
    },
    {
      code: `${IMPORTS}
const source = signal('a');
const derived = linkedSignal(() => source());
effect(() => { derived.set('b'); });`,
      errors: [{ messageId: 'signalWrite' }],
    },
    {
      code: `${IMPORTS}
class Toggle {
  readonly checked = model(false);
  readonly sync = effect(() => { this.checked.set(true); });
}`,
      errors: [{ messageId: 'signalWrite' }],
    },
    {
      code: `${IMPORTS}
function write(target: WritableSignal<number> | undefined) {
  effect(() => { target?.set(3); });
}`,
      errors: [{ messageId: 'signalWrite' }],
    },
    {
      code: `${IMPORTS}
const count = signal(0);
effect(() => { setTimeout(() => { count['set'](4); }); });`,
      errors: [{ messageId: 'signalWrite' }],
    },
    {
      code: `import * as core from '@angular/core';
const count = core.signal(0);
core.effect(() => { count.set(5); });`,
      errors: [{ messageId: 'signalWrite' }],
    },
    {
      code: `import { effect as sideEffect, signal } from '@angular/core';
const count = signal(0);
sideEffect(() => { count.set(6); });`,
      errors: [{ messageId: 'signalWrite' }],
    },
  ],
  valid: [
    `${IMPORTS}
const cache = new Map<string, number>();
effect(() => { cache.set('a', 1); });`,
    `${IMPORTS}
const body = new FormData();
effect(() => { body.set('name', 'value'); });`,
    `${IMPORTS}
const params = new URLSearchParams();
effect(() => { params.set('q', 'mods'); });`,
    `${IMPORTS}
const count = signal(0);
count.set(1);
const doubled = computed(() => count() * 2);
effect(() => { console.log(doubled()); });`,
    `${IMPORTS}
const count = signal(0);
function reset() { count.set(0); }
effect(() => { console.log(count()); });
reset();`,
    `${IMPORTS}
const title = { set: (value: string) => value };
effect(() => { title.set('x'); });`,
    `import { signal } from '@angular/core';
declare function effect(callback: () => void): void;
const count = signal(0);
effect(() => { count.set(1); });`,
    `interface WritableSignal<T> { set(value: T): void }
import { effect } from '@angular/core';
declare const local: WritableSignal<number>;
effect(() => { local.set(1); });`,
  ],
});
