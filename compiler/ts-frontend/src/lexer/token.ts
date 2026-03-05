export type TokenKind =
  | "DotEpoch"
  | "DotSector"
  | "DotNode"
  | "Reservoir"
  | "FlowIn"
  | "FlowOut"
  | "Guard"
  | "Constraint"
  | "Identifier"
  | "EOF";

export interface SourcePosition {
  line: number;
  column: number;
  offset: number;
}

export interface Token {
  kind: TokenKind;
  lexeme: string;
  start: SourcePosition;
  end: SourcePosition;
}