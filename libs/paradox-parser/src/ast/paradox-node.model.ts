export interface AssignmentNode extends NodeBase {
  key: IdentifierNode | StringValueNode | SymbolValueNode;
  kind: 'Assignment';
  operator: OperatorNode;
  value: ParadoxValue;
}

export type BlockChild = AssignmentNode | OrphanComment | ParadoxValue;

export interface BlockNode extends NodeBase {
  children: BlockChild[];
  innerLeadingTrivia: Trivia[];
  innerTrailingTrivia: Trivia[];
  kind: 'Block';
}

export interface BooleanValueNode extends NodeBase {
  kind: 'BooleanValue';
  value: boolean;
}

export interface DateValueNode extends NodeBase {
  day: number;
  kind: 'DateValue';
  month: number;
  raw: string;
  year: number;
}

export interface IdentifierNode extends NodeBase {
  kind: 'Identifier';
  name: string;
}

export interface NumberValueNode extends NodeBase {
  kind: 'NumberValue';
  raw: string;
  value: number;
}

export type OperatorKind = 'eq' | 'ge' | 'gt' | 'le' | 'lt' | 'ne';

export interface OperatorNode extends NodeBase {
  kind: 'Operator';
  opKind: OperatorKind;
}

export interface OrphanComment extends NodeBase {
  kind: 'OrphanComment';
  text: string;
}

export type ParadoxNode =
  | AssignmentNode
  | BlockNode
  | BooleanValueNode
  | DateValueNode
  | IdentifierNode
  | NumberValueNode
  | OperatorNode
  | OrphanComment
  | ScriptNode
  | StringValueNode
  | SymbolValueNode;

export type ParadoxValue =
  | BlockNode
  | BooleanValueNode
  | DateValueNode
  | IdentifierNode
  | NumberValueNode
  | StringValueNode
  | SymbolValueNode;

export interface ParseError {
  from: number;
  message: string;
  to: number;
}

export type Script = ScriptNode;

export type ScriptChild = AssignmentNode | OrphanComment;

export interface ScriptNode extends NodeBase {
  children: ScriptChild[];
  errors: ParseError[];
  kind: 'Script';
}

export interface StringValueNode extends NodeBase {
  kind: 'StringValue';
  raw: string;
  value: string;
}

export interface SymbolValueNode extends NodeBase {
  kind: 'SymbolValue';
  // The substitution-constant name with the leading `@` stripped (`@1933` →
  // "1933", `@FTR_START` → "FTR_START"). The verbatim source, sigil included, is
  // `source.slice(from, to)`; serialization stays a byte-slice, so the `@` is
  // never lost from the file even though the AST name drops it.
  name: string;
  // The constant's literal value from the file's per-file symbol table: for a
  // reference (value position) the resolved definition RHS; for a definition
  // node (key position) its own RHS. `null` when no same-file definition exists
  // — the resolver records a parse diagnostic rather than inventing a fallback
  // (ADR 022, decisions 3 and 5).
  resolved: null | string;
}

export interface Trivia {
  from: number;
  kind: TriviaKind;
  text: string;
  to: number;
}

export type TriviaKind = 'Comment' | 'Whitespace';

interface NodeBase {
  dirty: boolean;
  from: number;
  leadingTrivia: Trivia[];
  to: number;
  trailingTrivia: Trivia[];
}
