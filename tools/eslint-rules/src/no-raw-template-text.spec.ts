import * as templateParser from '@angular-eslint/template-parser';
import { RuleTester } from '@typescript-eslint/rule-tester';

import { NO_RAW_TEMPLATE_TEXT_RULE } from './no-raw-template-text';

const RULE_TESTER = new RuleTester({ languageOptions: { parser: templateParser } });

RULE_TESTER.run('no-raw-template-text', NO_RAW_TEMPLATE_TEXT_RULE, {
  invalid: [
    {
      code: '<h1>Welcome</h1>',
      errors: [{ data: { text: 'Welcome' }, messageId: 'rawText' }],
      filename: 'component.html',
    },
    {
      code: '<p>{{ messages().greeting }} and more</p>',
      errors: [{ messageId: 'rawText' }],
      filename: 'component.html',
    },
    {
      code: '@if (ready) { <span>Loading</span> }',
      errors: [{ messageId: 'rawText' }],
      filename: 'component.html',
    },
    {
      code: '<button aria-label="Close"></button>',
      errors: [{ data: { attribute: 'aria-label' }, messageId: 'rawAttribute' }],
      filename: 'component.html',
    },
    {
      code: '<input placeholder="Search" />',
      errors: [{ data: { attribute: 'placeholder' }, messageId: 'rawAttribute' }],
      filename: 'component.html',
    },
    {
      code: '<span title="Details"></span>',
      errors: [{ data: { attribute: 'title' }, messageId: 'rawAttribute' }],
      filename: 'component.html',
    },
    {
      code: '<img ngSrc="logo.png" width="1" height="1" alt="Logo" />',
      errors: [{ data: { attribute: 'alt' }, messageId: 'rawAttribute' }],
      filename: 'component.html',
    },
    {
      code: '<ng-template aria-label="Menu"></ng-template>',
      errors: [{ messageId: 'rawAttribute' }],
      filename: 'component.html',
    },
    {
      code: '<div data-hint="Tip"></div>',
      errors: [{ data: { attribute: 'data-hint' }, messageId: 'rawAttribute' }],
      filename: 'component.html',
      options: [{ attributes: ['data-hint'] }],
    },
  ],
  valid: [
    { code: '<h1>{{ messages().title }}</h1>', filename: 'component.html' },
    { code: '<p>\n  {{ messages().body }}\n</p>', filename: 'component.html' },
    {
      code: '<button [attr.aria-label]="messages().close"></button>',
      filename: 'component.html',
    },
    { code: '<input [placeholder]="messages().search" />', filename: 'component.html' },
    { code: '<span [title]="messages().details"></span>', filename: 'component.html' },
    {
      code: '<img ngSrc="spacer.png" width="1" height="1" alt="" />',
      filename: 'component.html',
    },
    { code: '<div class="toolbar" id="main" role="banner"></div>', filename: 'component.html' },
    {
      code: '@for (item of items(); track item.id) { <li>{{ item.name }}</li> }',
      filename: 'component.html',
    },
    { code: '<span>&nbsp;</span>', filename: 'component.html' },
    { code: '<p>{{ first() }} {{ second() }}</p>', filename: 'component.html' },
    {
      code: '<button aria-label="Close"></button>',
      filename: 'component.html',
      options: [{ attributes: ['placeholder'] }],
    },
  ],
});
