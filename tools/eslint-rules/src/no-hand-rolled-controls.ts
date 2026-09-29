import { getTemplateParserServices } from '@angular-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

export const NO_HAND_ROLLED_CONTROLS = 'no-hand-rolled-controls';

export const NATIVE_CONTROLS = /^(?:input|select|textarea)$/iu;
export const FORM_FIELD_BINDING = 'formField';
export const VALUE_BINDINGS: readonly string[] = ['checked', 'value'];
export const VALUE_EVENTS: readonly string[] = ['change', 'input'];

type SourceSpan = Parameters<
  ReturnType<typeof getTemplateParserServices>['convertNodeSourceSpanToLoc']
>[0];

interface BindingNode {
  readonly name: string;
  readonly sourceSpan: SourceSpan;
}

interface ElementNode {
  readonly inputs: readonly BindingNode[];
  readonly name: string;
  readonly outputs: readonly BindingNode[];
}

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/zaklerian/zmt/blob/main/docs/rationale/NG.md#${name}`,
);

export const NO_HAND_ROLLED_CONTROLS_RULE = createRule<[], 'valueBinding' | 'valueEvent'>({
  create(context) {
    const parserServices = getTemplateParserServices(context);
    const bindings = new Set(VALUE_BINDINGS);
    const events = new Set(VALUE_EVENTS);

    return {
      Element(node: ElementNode) {
        if (
          !NATIVE_CONTROLS.test(node.name) ||
          node.inputs.some((input) => input.name === FORM_FIELD_BINDING)
        ) {
          return;
        }
        for (const input of node.inputs.filter((candidate) => bindings.has(candidate.name))) {
          context.report({
            data: { binding: input.name, element: node.name },
            loc: parserServices.convertNodeSourceSpanToLoc(input.sourceSpan),
            messageId: 'valueBinding',
          });
        }
        for (const output of node.outputs.filter((candidate) => events.has(candidate.name))) {
          context.report({
            data: { element: node.name, event: output.name },
            loc: parserServices.convertNodeSourceSpanToLoc(output.sourceSpan),
            messageId: 'valueEvent',
          });
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Disallow native form controls wired by hand with value/checked bindings or input/change listeners instead of [formField] (NG-10)',
    },
    messages: {
      valueBinding:
        'Hand-rolled [{{ binding }}] on <{{ element }}>; bind the control through [formField] on a Signal Forms field (NG-10).',
      valueEvent:
        'Hand-rolled ({{ event }}) on <{{ element }}>; bind the control through [formField] on a Signal Forms field (NG-10).',
    },
    schema: [],
    type: 'problem',
  },
  name: NO_HAND_ROLLED_CONTROLS,
});
