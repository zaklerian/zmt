import { getTemplateParserServices } from '@angular-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

export const NO_RAW_TEMPLATE_TEXT = 'no-raw-template-text';

export const DEFAULT_TEXT_ATTRIBUTES: readonly string[] = [
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'placeholder',
  'title',
];

type SourceSpan = Parameters<
  ReturnType<typeof getTemplateParserServices>['convertNodeSourceSpanToLoc']
>[0];

interface TextNode {
  readonly sourceSpan: SourceSpan;
  readonly value: string;
}

interface TextAttributeNode extends TextNode {
  readonly name: string;
}

interface TemplateNode {
  readonly attributes: readonly TextAttributeNode[];
}

interface BoundTextNode {
  readonly sourceSpan: SourceSpan;
  readonly value: { readonly ast: { readonly strings?: readonly string[] } };
}

type Options = [{ readonly attributes?: readonly string[] }];

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/zaklerian/zmt/blob/main/docs/rationale/I18N.md#${name}`,
);

const VISIBLE = /\S/u;

export const NO_RAW_TEMPLATE_TEXT_RULE = createRule<Options, 'rawAttribute' | 'rawText'>({
  create(context, [{ attributes = DEFAULT_TEXT_ATTRIBUTES }]) {
    const parserServices = getTemplateParserServices(context);
    const watched = new Set(attributes.map((attribute) => attribute.toLowerCase()));

    function checkAttribute(node: TextAttributeNode): void {
      if (watched.has(node.name.toLowerCase()) && VISIBLE.test(node.value)) {
        context.report({
          data: { attribute: node.name },
          loc: parserServices.convertNodeSourceSpanToLoc(node.sourceSpan),
          messageId: 'rawAttribute',
        });
      }
    }

    return {
      BoundText(node: BoundTextNode) {
        const literal = (node.value.ast.strings ?? []).join(' ');
        if (VISIBLE.test(literal)) {
          context.report({
            data: { text: literal.trim() },
            loc: parserServices.convertNodeSourceSpanToLoc(node.sourceSpan),
            messageId: 'rawText',
          });
        }
      },
      Template(node: TemplateNode) {
        node.attributes.forEach(checkAttribute);
      },
      Text(node: TextNode) {
        if (VISIBLE.test(node.value)) {
          context.report({
            data: { text: node.value.trim() },
            loc: parserServices.convertNodeSourceSpanToLoc(node.sourceSpan),
            messageId: 'rawText',
          });
        }
      },
      TextAttribute: checkAttribute,
    };
  },
  defaultOptions: [{ attributes: DEFAULT_TEXT_ATTRIBUTES }],
  meta: {
    docs: {
      description:
        'Disallow raw text nodes and literal user-facing attribute values in templates (I18N-4)',
    },
    messages: {
      rawAttribute:
        'Literal "{{ attribute }}" value; bind it from the dictionary, e.g. [attr.{{ attribute }}]="messages()…" (I18N-4).',
      rawText: 'Raw template text "{{ text }}"; read it from messages() instead (I18N-4).',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          attributes: { items: { type: 'string' }, type: 'array' },
        },
        type: 'object',
      },
    ],
    type: 'problem',
  },
  name: NO_RAW_TEMPLATE_TEXT,
});
