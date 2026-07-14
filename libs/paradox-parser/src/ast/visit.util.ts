import type { ParadoxNode } from './paradox-node.model';

export type Visitors = {
  [K in ParadoxNode['kind']]?: (
    node: Extract<ParadoxNode, { kind: K }>,
  ) => void;
};

export function visit(root: ParadoxNode, visitors: Visitors): void {
  walk(root, visitors);
}

function dispatch(node: ParadoxNode, visitors: Visitors): void {
  switch (node.kind) {
    case 'Assignment':
      visitors.Assignment?.(node);
      return;
    case 'Block':
      visitors.Block?.(node);
      return;
    case 'BooleanValue':
      visitors.BooleanValue?.(node);
      return;
    case 'DateValue':
      visitors.DateValue?.(node);
      return;
    case 'Identifier':
      visitors.Identifier?.(node);
      return;
    case 'NumberValue':
      visitors.NumberValue?.(node);
      return;
    case 'Operator':
      visitors.Operator?.(node);
      return;
    case 'OrphanComment':
      visitors.OrphanComment?.(node);
      return;
    case 'Script':
      visitors.Script?.(node);
      return;
    case 'StringValue':
      visitors.StringValue?.(node);
      return;
    case 'SymbolValue':
      visitors.SymbolValue?.(node);
      return;
  }
}

function walk(node: ParadoxNode, visitors: Visitors): void {
  dispatch(node, visitors);
  switch (node.kind) {
    case 'Assignment':
      walk(node.key, visitors);
      walk(node.operator, visitors);
      walk(node.value, visitors);
      return;
    case 'Block':
      for (const child of node.children) walk(child, visitors);
      return;
    case 'BooleanValue':
    case 'DateValue':
    case 'Identifier':
    case 'NumberValue':
    case 'Operator':
    case 'OrphanComment':
    case 'StringValue':
    case 'SymbolValue':
      return;
    case 'Script':
      for (const child of node.children) walk(child, visitors);
      return;
  }
}
