export interface AssignmentNode extends NodeBase {
  key: IdentifierNode | StringValueNode | SymbolDefinitionNode;
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
  | PercentValueNode
  | ScriptNode
  | StringValueNode
  | SymbolDefinitionNode
  | SymbolValueNode;

export type ParadoxValue =
  | BlockNode
  | BooleanValueNode
  | DateValueNode
  | IdentifierNode
  | NumberValueNode
  | PercentValueNode
  | StringValueNode
  | SymbolValueNode;

export interface ParseError {
  from: number;
  message: string;
  to: number;
}

// A Clausewitz GUI dimension literal — a number with a trailing percent unit
// (`90%`, `100%%`, `-100%`). `unit` distinguishes `%` (percent of parent) from
// `%%` (percent of the parent's other axis); `value` is the signed numeric part.
// The verbatim token, unit included, is `source.slice(from, to)`; serialization
// stays a byte-slice, so the suffix is never lost even though `value` drops it.
export interface PercentValueNode extends NodeBase {
  kind: 'PercentValue';
  raw: string;
  unit: '%' | '%%';
  value: number;
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

// A substitution-constant DEFINITION in key position (`@1936 = 4`). Distinct
// from SymbolValueNode (a reference, in value position) so "a definition is a
// declaration, not a field" is a structural property, not a positional
// convention — extractors that read an open key space skip this kind explicitly
// (ADR 022, decision 7). It never appears as a value, only as an AssignmentNode
// key; its RHS populates the file's symbol table.
export interface SymbolDefinitionNode extends NodeBase {
  kind: 'SymbolDefinition';
  // The constant's name with the leading `@` stripped (`@1936` → "1936"). The
  // verbatim `@1936` is `source.slice(from, to)`; serialization stays a
  // byte-slice, so the sigil is never lost.
  name: string;
}

export interface SymbolValueNode extends NodeBase {
  kind: 'SymbolValue';
  // The substitution-constant name with the leading `@` stripped (`@1933` →
  // "1933", `@FTR_START` → "FTR_START"). The verbatim source, sigil included, is
  // `source.slice(from, to)`; serialization stays a byte-slice, so the `@` is
  // never lost from the file even though the AST name drops it.
  name: string;
  // The referenced constant's resolved literal, looked up in the file's per-file
  // symbol table (the matching definition's RHS). `null` when no same-file
  // definition exists — the resolver records a parse diagnostic rather than
  // inventing a fallback (ADR 022, decisions 3 and 5).
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
