// RIVER-LANG Compiler — Channel Graph AST
// compiler/ts-frontend/src/parser/ast.ts

// ---------------------------------------------------------------------------
// Source span — every AST node carries its origin position
// ---------------------------------------------------------------------------

export interface Span {
  startOffset: number;
  endOffset:   number;
  startLine:   number;
  startColumn: number;
}

// ---------------------------------------------------------------------------
// Sector declaration:  .sector Alpha [0x000-0x1FF]
// ---------------------------------------------------------------------------

export interface AstSector {
  kind:  "Sector";
  name:  string;
  start: number;   // parsed hex address
  end:   number;   // parsed hex address
  span:  Span;
}

// ---------------------------------------------------------------------------
// Node body properties
// ---------------------------------------------------------------------------

export type NodeType =
  | "TOKEN_GEN"
  | "MERGE_GATE"
  | "ALU_ADD"
  | "ALU_SUB"
  | "SWITCH_GATE"
  | "BOUNDARY_GATE"
  | string;           // open for extension

export type TagValue = "COLOR_AUTO" | string;
export type FireOnValue = "ALL_INPUTS" | "ANY_INPUT" | string;
export type HandshakeValue = "PATH_HASH" | string;

// ---------------------------------------------------------------------------
// Node declaration:  .node Name @ 0xADDR { ... }
// ---------------------------------------------------------------------------

export interface AstNode {
  kind:     "Node";
  name:     string;
  address:  number;          // physical address parsed from hex literal
  nodeType: NodeType;
  tag?:     TagValue;
  fireOn?:  FireOnValue;
  sector?:  string;          // target sector (BOUNDARY_GATE / SWITCH_GATE)
  target?:  string;          // alias for sector in some forms
  span:     Span;
}

// ---------------------------------------------------------------------------
// Reservoir declaration:  @reservoir Name @ 0xADDR { ... }
// ---------------------------------------------------------------------------

export interface AstReservoir {
  kind:       "Reservoir";
  name:       string;
  address:    number;
  arity:      number;
  handshake:  HandshakeValue;
  onDry:      string;        // e.g. "self.purge()"
  span:       Span;
}

// ---------------------------------------------------------------------------
// Flow connections
// ---------------------------------------------------------------------------

export type FlowDirection = "DOWN" | "UP";

/** A port reference: node name + optional accessor (.cry / .TRUE / .FALSE / .out) */
export interface PortRef {
  node:      string;
  accessor?: "cry" | "TRUE" | "FALSE" | "out";
}

export interface AstFlow {
  kind:      "Flow";
  direction: FlowDirection;   // DOWN = <~, UP = ~>
  from:      PortRef;
  to:        PortRef;
  span:      Span;
}

// ---------------------------------------------------------------------------
// Constraint:  #constraint max_dist(NodeA.cry, NodeB) < 1.5mm;
// ---------------------------------------------------------------------------

export interface AstConstraint {
  kind:  "Constraint";
  fn:    string;           // "max_dist"
  portA: PortRef;
  portB: PortRef;
  op:    "<" | ">" | "<=";
  value: number;           // numeric part, e.g. 1.5
  unit:  "mm";
  span:  Span;
}

// ---------------------------------------------------------------------------
// Root: the Channel Graph
// ---------------------------------------------------------------------------

export interface ChannelGraphAst {
  kind:        "ChannelGraph";
  epoch:       number;           // parsed hex value of .epoch literal
  sectors:     AstSector[];
  nodes:       AstNode[];
  reservoir:   AstReservoir | null;
  flows:       AstFlow[];        // DIR_BIT = 0  downstream <~
  nerves:      AstFlow[];        // DIR_BIT = 1  upstream   ~>
  constraints: AstConstraint[];
}