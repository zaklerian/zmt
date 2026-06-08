export interface AssignmentNode extends NodeBase {
  key: IdentifierNode | StringValueNode;
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
  | StringValueNode;

export type ParadoxValue =
  | BlockNode
  | BooleanValueNode
  | DateValueNode
  | IdentifierNode
  | NumberValueNode
  | StringValueNode;

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
