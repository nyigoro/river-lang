/**
 * Shared types for lexer, parser, analyser, and LSP server.
 */

export interface SourcePosition {
  line: number;
  column: number;
  offset: number;
}

export interface Span {
  start: SourcePosition;
  end: SourcePosition;
}

export enum TokenKind {
  // Core
  EOF,
  Identifier,

  // Directives and ports
  Dot,
  DotEpoch,
  DotSector,
  DotNode,
  DotCry,
  DotTrue,
  DotFalse,
  DotOut,
  Reservoir,
  At,
  Hash,
  SelfPurge,

  // Literals
  HexNumber,
  DecNumber,
  FloatMm,

  // Operators
  FlowDown, // <~
  FlowUp,   // ~>
  Guard,    // /?
  Lte,      // <=
  Lt,       // < or <=
  Minus,    // -

  // Punctuation
  LBrace,
  RBrace,
  LBracket,
  RBracket,
  LParen,
  RParen,
  Colon,
  Semicolon,
  Comma,

  // Keywords (kept contiguous for parser numeric range check)
  KwType,
  KwTag,
  KwFireOn,
  KwArity,
  KwHandshake,
  KwOnDry,
  KwSector,
  KwTarget,
  KwConstraint,
  KwMaxDist,
}

export interface Token {
  kind: TokenKind;
  text: string;
  start: SourcePosition;
  end: SourcePosition;
}

export type PortAccessor = 'cry' | 'TRUE' | 'FALSE' | 'out' | undefined;

export interface PortRef {
  node: string;
  accessor?: PortAccessor;
}

export interface AstSector {
  name: string;
  start: number;
  end: number;
  span: Span;
}

export interface AstNode {
  name: string;
  address: number;
  nodeType: string;
  tag?: string;
  fireOn?: string;
  sector?: string;
  span: Span;
}

export interface AstReservoir {
  name: string;
  address: number;
  arity: number;
  handshake: boolean;
  onDry: string;
  span: Span;
}

export interface AstFlow {
  from: PortRef;
  to: PortRef;
  span: Span;
}

export interface AstConstraint {
  fn: string;
  portA: PortRef;
  portB: PortRef;
  op: '<=' | '<';
  value: number;
  unit: 'mm';
  span: Span;
}

export interface ChannelGraphAst {
  epoch: number;
  sectors: AstSector[];
  nodes: AstNode[];
  reservoir: AstReservoir | null;
  flows: AstFlow[];
  nerves: AstFlow[];
  constraints: AstConstraint[];
}

export type DiagSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface LspDiag {
  severity: DiagSeverity;
  rule: string;
  message: string;
  hint?: string;
  span: Span;
}

export type SymbolKind = 'node' | 'sector' | 'reservoir';

export interface Symbol {
  name: string;
  kind: SymbolKind;
  span: Span;
  address: number;
  detail: string;
}
