import * as templateParser from '@angular-eslint/template-parser';
import { RuleTester } from '@typescript-eslint/rule-tester';

import { NO_HAND_ROLLED_CONTROLS_RULE } from './no-hand-rolled-controls';

const RULE_TESTER = new RuleTester({ languageOptions: { parser: templateParser } });

RULE_TESTER.run('no-hand-rolled-controls', NO_HAND_ROLLED_CONTROLS_RULE, {
  invalid: [
    {
      code: '<input matInput [value]="query()" (input)="onInput($event)" />',
      errors: [
        { data: { binding: 'value', element: 'input' }, messageId: 'valueBinding' },
        { data: { element: 'input', event: 'input' }, messageId: 'valueEvent' },
      ],
      filename: 'component.html',
    },
    {
      code: '<textarea [value]="text()"></textarea>',
      errors: [{ data: { binding: 'value', element: 'textarea' }, messageId: 'valueBinding' }],
      filename: 'component.html',
    },
    {
      code: '<input type="checkbox" [checked]="on()" (change)="toggle($event)" />',
      errors: [
        { data: { binding: 'checked', element: 'input' }, messageId: 'valueBinding' },
        { data: { element: 'input', event: 'change' }, messageId: 'valueEvent' },
      ],
      filename: 'component.html',
    },
    {
      code: '<select (change)="pick($event)"></select>',
      errors: [{ data: { element: 'select', event: 'change' }, messageId: 'valueEvent' }],
      filename: 'component.html',
    },
    {
      code: '@if (ready()) { <INPUT [value]="draft()" /> }',
      errors: [{ messageId: 'valueBinding' }],
      filename: 'component.html',
    },
  ],
  valid: [
    { code: '<input matInput [formField]="descriptorForm.name" />', filename: 'component.html' },
    {
      code: '<textarea [formField]="editorForm" [attr.aria-label]="label()"></textarea>',
      filename: 'component.html',
    },
    {
      code: '<input type="radio" [formField]="form.choice" [value]="option" />',
      filename: 'component.html',
    },
    {
      code: '<input matInput [formField]="tagForm" (keydown.enter)="addTag($event)" />',
      filename: 'component.html',
    },
    {
      code: '<mat-select [value]="game()" (selectionChange)="onGame($event)"></mat-select>',
      filename: 'component.html',
    },
    { code: '<mat-option [value]="node.path"></mat-option>', filename: 'component.html' },
    {
      code: '<mat-slide-toggle [checked]="on()" (change)="toggle($event.checked)"></mat-slide-toggle>',
      filename: 'component.html',
    },
    { code: '<input type="file" [disabled]="busy()" />', filename: 'component.html' },
    { code: '<button type="button" (click)="save.emit()"></button>', filename: 'component.html' },
  ],
});
