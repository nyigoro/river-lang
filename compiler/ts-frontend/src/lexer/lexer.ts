// RIVER-LANG Compiler — Lexer
// compiler/ts-frontend/src/lexer/lexer.ts

import { Token, TokenKind, SourcePosition } from "./token.js";

// ---------------------------------------------------------------------------
// Lexer Errors
// ---------------------------------------------------------------------------

export class LexError extends Error {
  constructor(
    message: string,
    public readonly position: SourcePosition,
  ) {
    super(`[Lex Error] ${message} at line ${position.line}, column ${position.column}`);
    this.name = "LexError";
  }
}

// ---------------------------------------------------------------------------
// Character helpers
// ---------------------------------------------------------------------------

function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\r" || ch === "\n";
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isHexDigit(ch: string): boolean {
  return /[0-9A-Fa-f]/.test(ch);
}

// ---------------------------------------------------------------------------
// Keyword tables
// ---------------------------------------------------------------------------

/** Keywords that appear as values inside node body blocks. */
const BODY_KEYWORDS: Record<string, TokenKind> = {
  type:       "KwType",
  tag:        "KwTag",
  fire_on:    "KwFireOn",
  arity:      "KwArity",
  handshake:  "KwHandshake",
  on_dry:     "KwOnDry",
  sector:     "KwSector",
  target:     "KwTarget",
  max_dist:   "KwMaxDist",
  constraint: "KwConstraint",
};

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

export class Lexer {
  private i = 0;
  private line = 1;
  private column = 1;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  // ── Public entry point ──────────────────────────────────────────────────

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.i < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.i >= this.source.length) break;

      const tok = this.nextToken();
      if (tok !== null) tokens.push(tok);
    }

    tokens.push(this.makeToken("EOF", "", this.pos(), this.pos()));
    return tokens;
  }

  // ── Whitespace and comment skipping ─────────────────────────────────────

  private skipWhitespaceAndComments(): void {
    while (this.i < this.source.length) {
      const ch = this.ch();

      // Newline
      if (ch === "\n") {
        this.i++;
        this.line++;
        this.column = 1;
        continue;
      }

      // Whitespace
      if (isWhitespace(ch)) {
        this.advance();
        continue;
      }

      // Line comment: // ...
      if (ch === "/" && this.peek(1) === "/") {
        while (this.i < this.source.length && this.ch() !== "\n") {
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  // ── Main dispatch ────────────────────────────────────────────────────────

  private nextToken(): Token | null {
    const start = this.pos();
    const ch = this.ch();

    // ── Directives starting with '.' ──────────────────────────────────────
    if (ch === ".") {
      return this.lexDot(start);
    }

    // ── @reservoir or standalone @ ────────────────────────────────────────
    if (ch === "@") {
      return this.lexAt(start);
    }

    // ── Flow operators and guards: <~ ~> /? ──────────────────────────────
    if (ch === "<" && this.peek(1) === "~") {
      this.advance(2);
      return this.makeToken("FlowDown", "<~", start, this.pos());
    }

    if (ch === "<" && this.peek(1) === "=") {
      this.advance(2);
      return this.makeToken("Lte", "<=", start, this.pos());
    }

    if (ch === "~" && this.peek(1) === ">") {
      this.advance(2);
      return this.makeToken("FlowUp", "~>", start, this.pos());
    }

    if (ch === "/" && this.peek(1) === "?") {
      this.advance(2);
      return this.makeToken("Guard", "/?", start, this.pos());
    }

    // ── Standalone '<' (used in #constraint < 1.5mm) ──────────────────────
    if (ch === "<") {
      this.advance();
      return this.makeToken("Lt", "<", start, this.pos());
    }

    // ── '#' constraint prefix ─────────────────────────────────────────────
    if (ch === "#") {
      this.advance();
      return this.makeToken("Hash", "#", start, this.pos());
    }

    // ── Punctuation ───────────────────────────────────────────────────────
    if (ch === "{") { this.advance(); return this.makeToken("LBrace",   "{", start, this.pos()); }
    if (ch === "}") { this.advance(); return this.makeToken("RBrace",   "}", start, this.pos()); }
    if (ch === "[") { this.advance(); return this.makeToken("LBracket", "[", start, this.pos()); }
    if (ch === "]") { this.advance(); return this.makeToken("RBracket", "]", start, this.pos()); }
    if (ch === "(") { this.advance(); return this.makeToken("LParen",   "(", start, this.pos()); }
    if (ch === ")") { this.advance(); return this.makeToken("RParen",   ")", start, this.pos()); }
    if (ch === ":") { this.advance(); return this.makeToken("Colon",    ":", start, this.pos()); }
    if (ch === ";") { this.advance(); return this.makeToken("Semicolon",";", start, this.pos()); }
    if (ch === ",") { this.advance(); return this.makeToken("Comma",    ",", start, this.pos()); }
    if (ch === "-") { this.advance(); return this.makeToken("Minus",    "-", start, this.pos()); }

    // ── Hex numbers: 0x… ─────────────────────────────────────────────────
    if (ch === "0" && (this.peek(1) === "x" || this.peek(1) === "X")) {
      return this.lexHexNumber(start);
    }

    // ── Decimal numbers and float+mm literals ────────────────────────────
    if (isDigit(ch)) {
      return this.lexNumber(start);
    }

    // ── Identifiers and keywords ──────────────────────────────────────────
    if (isIdentStart(ch)) {
      return this.lexIdentifier(start);
    }

    // ── Unknown character ─────────────────────────────────────────────────
    throw new LexError(
      `Unexpected character '${ch}' (U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")})`,
      start
    );
  }

  // ── Dot dispatcher: .epoch / .sector / .node / .cry / .TRUE / etc. ──────

  private lexDot(start: SourcePosition): Token {
    // Try multi-character directives first
    const rest = this.source.slice(this.i);

    if (rest.startsWith(".epoch")) {
      this.advance(6);
      return this.makeToken("DotEpoch", ".epoch", start, this.pos());
    }
    if (rest.startsWith(".sector")) {
      this.advance(7);
      return this.makeToken("DotSector", ".sector", start, this.pos());
    }
    if (rest.startsWith(".node")) {
      this.advance(5);
      return this.makeToken("DotNode", ".node", start, this.pos());
    }

    // Node field accessors — only valid after an identifier
    if (rest.startsWith(".cry")) {
      this.advance(4);
      return this.makeToken("DotCry", ".cry", start, this.pos());
    }
    if (rest.startsWith(".TRUE")) {
      this.advance(5);
      return this.makeToken("DotTrue", ".TRUE", start, this.pos());
    }
    if (rest.startsWith(".FALSE")) {
      this.advance(6);
      return this.makeToken("DotFalse", ".FALSE", start, this.pos());
    }
    if (rest.startsWith(".out")) {
      this.advance(4);
      return this.makeToken("DotOut", ".out", start, this.pos());
    }

    // self.purge() — treat as atomic expression token
    // (reached via identifier 'self' + dot — handled in lexIdentifier)
    // Standalone dot
    this.advance();
    return this.makeToken("Dot", ".", start, this.pos());
  }

  // ── @ dispatcher: @reservoir or standalone @ ────────────────────────────

  private lexAt(start: SourcePosition): Token {
    const rest = this.source.slice(this.i);

    if (rest.startsWith("@reservoir")) {
      this.advance(10);
      return this.makeToken("Reservoir", "@reservoir", start, this.pos());
    }

    // Standalone @ (node address marker: .node Foo @ 0x01A2)
    this.advance();
    return this.makeToken("At", "@", start, this.pos());
  }

  // ── Hex number: 0x[0-9A-Fa-f]+ ──────────────────────────────────────────

  private lexHexNumber(start: SourcePosition): Token {
    // consume '0x'
    this.advance(2);
    const numStart = this.i;

    while (this.i < this.source.length && isHexDigit(this.ch())) {
      this.advance();
    }

    if (this.i === numStart) {
      throw new LexError("Expected hex digits after '0x'", start);
    }

    const lexeme = this.source.slice(start.offset, this.i);
    return this.makeToken("HexNumber", lexeme, start, this.pos());
  }

  // ── Decimal number or float+mm: [0-9]+(.[0-9]+mm)? ──────────────────────

  private lexNumber(start: SourcePosition): Token {
    while (this.i < this.source.length && isDigit(this.ch())) {
      this.advance();
    }

    // Check for float with mm suffix: 1.5mm, 2.0mm
    if (
      this.ch() === "." &&
      isDigit(this.peek(1)) &&
      this.source.slice(this.i + 1).match(/^\d+mm/)
    ) {
      this.advance(); // consume '.'
      while (this.i < this.source.length && isDigit(this.ch())) {
        this.advance();
      }
      // consume 'mm'
      if (this.source.slice(this.i, this.i + 2) === "mm") {
        this.advance(2);
        const lexeme = this.source.slice(start.offset, this.i);
        return this.makeToken("FloatMm", lexeme, start, this.pos());
      }
    }

    const lexeme = this.source.slice(start.offset, this.i);
    return this.makeToken("DecNumber", lexeme, start, this.pos());
  }

  // ── Identifier or keyword ────────────────────────────────────────────────

  private lexIdentifier(start: SourcePosition): Token {
    while (this.i < this.source.length && isIdentPart(this.ch())) {
      this.advance();
    }

    const lexeme = this.source.slice(start.offset, this.i);

    // self.purge() — atomic token for reservoir on_dry handler
    if (lexeme === "self" && this.source.slice(this.i, this.i + 8) === ".purge()") {
      this.advance(8);
      const fullLexeme = this.source.slice(start.offset, this.i);
      return this.makeToken("SelfPurge", fullLexeme, start, this.pos());
    }

    // Body keywords (type, tag, fire_on, arity, etc.)
    const kwKind = BODY_KEYWORDS[lexeme];
    if (kwKind !== undefined) {
      return this.makeToken(kwKind, lexeme, start, this.pos());
    }

    return this.makeToken("Identifier", lexeme, start, this.pos());
  }

  // ── Primitives ───────────────────────────────────────────────────────────

  private ch(): string {
    return this.source.charAt(this.i);
  }

  private peek(offset: number): string {
    return this.source.charAt(this.i + offset);
  }

  private advance(count = 1): void {
    for (let n = 0; n < count; n++) {
      if (this.i < this.source.length) {
        if (this.source.charAt(this.i) === "\n") {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.i++;
      }
    }
  }

  private pos(): SourcePosition {
    return { offset: this.i, line: this.line, column: this.column };
  }

  private makeToken(
    kind: TokenKind,
    lexeme: string,
    start: SourcePosition,
    end: SourcePosition
  ): Token {
    return { kind, lexeme, start, end };
  }
}

// ---------------------------------------------------------------------------
// Convenience export — matches existing usage: tokenize(source)
// ---------------------------------------------------------------------------

export function tokenize(source: string): Token[] {
  return new Lexer(source).tokenize();
}
