import type ts from 'typescript';

import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { isTypeReference } from 'ts-api-utils';

export const EFFECT_NO_SIGNAL_WRITE = 'effect-no-signal-write';

const ANGULAR_CORE = '@angular/core';
const WRITE_METHODS = new Set(['set', 'update']);
const WRITABLE_SIGNAL = 'WritableSignal';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/zaklerian/zmt/blob/main/docs/rationale/STATE.md#${name}`,
);

function declaredInAngularCore(symbol: ts.Symbol): boolean {
  const declarations: readonly ts.Declaration[] = symbol.getDeclarations() ?? [];
  return declarations.some((declaration) =>
    declaration.getSourceFile().fileName.includes(`/${ANGULAR_CORE}/`),
  );
}

function isWritableSignalType(type: ts.Type, checker: ts.TypeChecker, seen: Set<ts.Type>): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  if (type.isUnionOrIntersection()) {
    return type.types.some((member) => isWritableSignalType(member, checker, seen));
  }
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (symbol?.getName() === WRITABLE_SIGNAL && declaredInAngularCore(symbol)) {
    return true;
  }
  const target = isTypeReference(type) ? type.target : type;
  if (!target.isClassOrInterface()) {
    return false;
  }
  return checker.getBaseTypes(target).some((base) => isWritableSignalType(base, checker, seen));
}

function memberName(node: TSESTree.MemberExpression): string | null {
  if (!node.computed && node.property.type === AST_NODE_TYPES.Identifier) {
    return node.property.name;
  }
  if (node.property.type === AST_NODE_TYPES.Literal && typeof node.property.value === 'string') {
    return node.property.value;
  }
  return null;
}

export const EFFECT_NO_SIGNAL_WRITE_RULE = createRule({
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const effectNames = new Set<string>();
    const coreNamespaces = new Set<string>();
    const effectCallbacks = new Set<TSESTree.Node>();
    let depth = 0;

    function isEffectCallee(callee: TSESTree.Expression): boolean {
      if (callee.type === AST_NODE_TYPES.Identifier) {
        return effectNames.has(callee.name);
      }
      return (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        coreNamespaces.has(callee.object.name) &&
        memberName(callee) === 'effect'
      );
    }

    function enterFunction(node: TSESTree.FunctionLike): void {
      const parent = node.parent;
      if (
        parent.type === AST_NODE_TYPES.CallExpression &&
        parent.arguments[0] === node &&
        isEffectCallee(parent.callee)
      ) {
        effectCallbacks.add(node);
        depth += 1;
      }
    }

    function exitFunction(node: TSESTree.FunctionLike): void {
      if (effectCallbacks.delete(node)) {
        depth -= 1;
      }
    }

    return {
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      CallExpression(node) {
        if (depth === 0 || node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }
        const method = memberName(node.callee);
        if (method === null || !WRITE_METHODS.has(method)) {
          return;
        }
        const receiver = services.getTypeAtLocation(node.callee.object);
        if (isWritableSignalType(receiver, checker, new Set())) {
          context.report({ data: { method }, messageId: 'signalWrite', node });
        }
      },
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      ImportDeclaration(node) {
        if (node.source.value !== ANGULAR_CORE) {
          return;
        }
        for (const specifier of node.specifiers) {
          if (specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
            coreNamespaces.add(specifier.local.name);
          } else if (
            specifier.type === AST_NODE_TYPES.ImportSpecifier &&
            specifier.imported.type === AST_NODE_TYPES.Identifier &&
            specifier.imported.name === 'effect'
          ) {
            effectNames.add(specifier.local.name);
          }
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Disallow set() and update() on a WritableSignal inside an effect() callback (STATE-1)',
    },
    messages: {
      signalWrite:
        'effect() must not write to a signal via {{ method }}(); derive the value with computed() or linkedSignal() (STATE-1).',
    },
    schema: [],
    type: 'problem',
  },
  name: EFFECT_NO_SIGNAL_WRITE,
});
