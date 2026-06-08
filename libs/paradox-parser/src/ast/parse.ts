import type { ParadoxDialect } from './paradox-dialect.const';
import type { Script } from './paradox-node.model';

import { parser } from '../cst';
import { cstToAst } from './cst-to-ast.util';

export interface ParseOptions {
  readonly dialects?: readonly (ParadoxDialect | string)[];
}

export function parse(source: string, options?: ParseOptions): Script {
  const configured =
    options?.dialects !== undefined && options.dialects.length > 0
      ? parser.configure({ dialect: options.dialects.join(' ') })
      : parser;
  const tree = configured.parse(source);
  return cstToAst(tree, source);
}
