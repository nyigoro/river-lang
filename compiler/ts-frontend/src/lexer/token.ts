// RIVER-LANG Compiler — Token Definitions
// compiler/ts-frontend/src/lexer/token.ts

// ---------------------------------------------------------------------------
// Token Kinds
// ---------------------------------------------------------------------------

export type TokenKind =
  // ── Directives ──────────────────────────────────────────────────────────
  | "DotEpoch"       // .epoch
  | "DotSector"      // .sector
  | "DotNode"        // .node
  | "Reservoir"      // @reservoir

  // ── Flow Operators ───────────────────────────────────────────────────────
  | "FlowDown"       // <~   downstream (Blood, Layer 1)
  | "FlowUp"         // ~>   upstream   (Nerve, Layer 3)
  | "Guard"          // /?   conditional gate

  // ── Node Field Accessors ─────────────────────────────────────────────────
  | "DotCry"         // .cry    — upstream reflex port
  | "DotTrue"        // .TRUE   — gate true branch
  | "DotFalse"       // .FALSE  — gate false branch
  | "DotOut"         // .out    — generic output port

  // ── Node Types (keywords inside { } blocks) ──────────────────────────────
  | "KwType"         // type:
  | "KwTag"          // tag:
  | "KwFireOn"       // fire_on:
  | "KwArity"        // arity:
  | "KwHandshake"    // handshake:
  | "KwOnDry"        // on_dry:
  | "KwSector"       // sector:   (inside BOUNDARY_GATE node body)
  | "KwTarget"       // target:   (alias for sector: in some forms)

  // ── Constraint ───────────────────────────────────────────────────────────
  | "Hash"           // #
  | "KwConstraint"   // constraint  (follows #)
  | "KwMaxDist"      // max_dist    (constraint function name)

  // ── Punctuation ──────────────────────────────────────────────────────────
  | "At"             // @   (standalone — node address marker)
  | "LBrace"         // {
  | "RBrace"         // }
  | "LBracket"       // [
  | "RBracket"       // ]
  | "LParen"         // (
  | "RParen"         // )
  | "Colon"          // :
  | "Semicolon"      // ;
  | "Comma"          // ,
  | "Dot"            // .   standalone
  | "Lt"             // <   (inside constraint: < 1.5mm)
  | "Minus"          // -   (inside sector range: [0x000-0x1FF])

  // ── Literals ─────────────────────────────────────────────────────────────
  | "HexNumber"      // 0x52495645, 0x000, 0x1FF
  | "DecNumber"      // 1, 10, 999
  | "FloatMm"        // 1.5mm, 2.0mm  (distance literals, unit included)

  // ── Identifiers & general ────────────────────────────────────────────────
  | "Identifier"     // Seed_Gen, ALU_ADD, COLOR_AUTO, PATH_HASH, …
  | "SelfPurge"      // self.purge()  — treated as atomic in reservoir body

  // ── Meta ─────────────────────────────────────────────────────────────────
  | "EOF";

// ---------------------------------------------------------------------------
// Source Position
// ---------------------------------------------------------------------------

export interface SourcePosition {
  /** Byte offset from start of source string. */
  offset: number;
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  column: number;
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export interface Token {
  kind: TokenKind;
  /** The exact substring from source that produced this token. */
  lexeme: string;
  start: SourcePosition;
  end: SourcePosition;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable description used in error messages. */
export function describeKind(kind: TokenKind): string {
  const descriptions: Record<TokenKind, string> = {
    DotEpoch:    "'.epoch' directive",
    DotSector:   "'.sector' directive",
    DotNode:     "'.node' directive",
    Reservoir:   "'@reservoir' declaration",
    FlowDown:    "'<~' downstream flow operator",
    FlowUp:      "'~>' upstream flow operator",
    Guard:       "'/?' guard operator",
    DotCry:      "'.cry' port accessor",
    DotTrue:     "'.TRUE' branch accessor",
    DotFalse:    "'.FALSE' branch accessor",
    DotOut:      "'.out' port accessor",
    KwType:      "'type' keyword",
    KwTag:       "'tag' keyword",
    KwFireOn:    "'fire_on' keyword",
    KwArity:     "'arity' keyword",
    KwHandshake: "'handshake' keyword",
    KwOnDry:     "'on_dry' keyword",
    KwSector:    "'sector' keyword",
    KwTarget:    "'target' keyword",
    Hash:        "'#'",
    KwConstraint:"'constraint' keyword",
    KwMaxDist:   "'max_dist' function",
    At:          "'@' address marker",
    LBrace:      "'{'",
    RBrace:      "'}'",
    LBracket:    "'['",
    RBracket:    "']'",
    LParen:      "'('",
    RParen:      "')'",
    Colon:       "':'",
    Semicolon:   "';'",
    Comma:       "','",
    Dot:         "'.'",
    Lt:          "'<'",
    Minus:       "'-'",
    HexNumber:   "hexadecimal number",
    DecNumber:   "decimal number",
    FloatMm:     "distance literal (e.g. 1.5mm)",
    Identifier:  "identifier",
    SelfPurge:   "'self.purge()' expression",
    EOF:         "end of file",
  };
  return descriptions[kind] ?? `'${kind}'`;
}