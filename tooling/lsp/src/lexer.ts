/**
 * RIVER-LANG LSP — src/lexer.ts
 * Tokenises .rasm source text. Mirrors the compiler frontend lexer
 * exactly so LSP diagnostics match compiler errors 1:1.
 */

import { Token, TokenKind, SourcePosition } from './types';

// ── Keyword table ─────────────────────────────────────────────────────────────

const KEYWORDS: Record<string, TokenKind> = {
  type:       TokenKind.KwType,
  tag:        TokenKind.KwTag,
  fire_on:    TokenKind.KwFireOn,
  arity:      TokenKind.KwArity,
  handshake:  TokenKind.KwHandshake,
  on_dry:     TokenKind.KwOnDry,
  sector:     TokenKind.KwSector,
  target:     TokenKind.KwTarget,
  constraint: TokenKind.KwConstraint,
  max_dist:   TokenKind.KwMaxDist,
};

// ── Lexer ─────────────────────────────────────────────────────────────────────

export class Lexer {
  private pos    = 0;
  private line   = 0;
  private column = 0;
  readonly errors: Array<{ message: string; span: { start: SourcePosition; end: SourcePosition } }> = [];

  constructor(private readonly src: string) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.src.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.src.length) break;
      const tok = this.nextToken();
      if (tok) tokens.push(tok);
    }
    tokens.push(this.makeToken(TokenKind.EOF, '', this.currentPos(), this.currentPos()));
    return tokens;
  }

  private nextToken(): Token | null {
    const start = this.currentPos();
    const ch = this.src[this.pos];

    // ── Two-character operators ───────────────────────────────────────────
    if (ch === '<' && this.peek(1) === '~') {
      this.advance(2);
      return this.makeToken(TokenKind.FlowDown, '<~', start, this.currentPos());
    }
    if (ch === '<' && this.peek(1) === '=') {
      this.advance(2);
      return this.makeToken(TokenKind.Lte, '<=', start, this.currentPos());
    }
    if (ch === '~' && this.peek(1) === '>') {
      this.advance(2);
      return this.makeToken(TokenKind.FlowUp, '~>', start, this.currentPos());
    }
    if (ch === '/' && this.peek(1) === '?') {
      this.advance(2);
      return this.makeToken(TokenKind.Guard, '/?', start, this.currentPos());
    }

    // ── Dot sequences ─────────────────────────────────────────────────────
    if (ch === '.') {
      const word = this.readWord();
      switch (word) {
        case '.epoch':  return this.makeToken(TokenKind.DotEpoch,  word, start, this.currentPos());
        case '.sector': return this.makeToken(TokenKind.DotSector, word, start, this.currentPos());
        case '.node':   return this.makeToken(TokenKind.DotNode,   word, start, this.currentPos());
        case '.cry':    return this.makeToken(TokenKind.DotCry,    word, start, this.currentPos());
        case '.TRUE':   return this.makeToken(TokenKind.DotTrue,   word, start, this.currentPos());
        case '.FALSE':  return this.makeToken(TokenKind.DotFalse,  word, start, this.currentPos());
        case '.out':    return this.makeToken(TokenKind.DotOut,    word, start, this.currentPos());
        default:
          return this.makeToken(TokenKind.Dot, '.', start, this.currentPos());
      }
    }

    // ── @reservoir ────────────────────────────────────────────────────────
    if (ch === '@') {
      this.advance();
      const wordStart = this.currentPos();
      const word = this.readIdentifier();
      if (word === 'reservoir') {
        return this.makeToken(TokenKind.Reservoir, '@reservoir', start, this.currentPos());
      }
      return this.makeToken(TokenKind.At, '@' + word, start, this.currentPos());
    }

    // ── #constraint or plain # ────────────────────────────────────────────
    if (ch === '#') {
      this.advance();
      const after = this.readIdentifier();
      if (after === 'constraint') {
        // Emit # then KwConstraint as two tokens
        const hashTok = this.makeToken(TokenKind.Hash, '#', start,
          { line: start.line, column: start.column + 1, offset: start.offset + 1 });
        const kwStart = this.currentPos();
        // We already consumed 'constraint' via readIdentifier; build the kw token
        const kwEnd = this.currentPos();
        // Return # — caller gets KwConstraint on next call via lookahead state
        // Simpler: emit Hash, push pending KwConstraint token
        this._pending = this.makeToken(TokenKind.KwConstraint, 'constraint', {
          line:   start.line,
          column: start.column + 1,
          offset: start.offset + 1,
        }, this.currentPos());
        return hashTok;
      }
      // plain # followed by something else — return Hash, re-lex the rest
      this.pos -= after.length;
      this.column -= after.length;
      return this.makeToken(TokenKind.Hash, '#', start, this.currentPos());
    }

    // ── self.purge() ──────────────────────────────────────────────────────
    if (this.src.startsWith('self.purge()', this.pos)) {
      this.advance(12);
      return this.makeToken(TokenKind.SelfPurge, 'self.purge()', start, this.currentPos());
    }

    // ── Hex number ────────────────────────────────────────────────────────
    if (ch === '0' && this.peek(1) === 'x') {
      const text = this.readHex();
      return this.makeToken(TokenKind.HexNumber, text, start, this.currentPos());
    }

    // ── Decimal / float ───────────────────────────────────────────────────
    if (isDigit(ch)) {
      const text = this.readNumber();
      if (text.endsWith('mm')) {
        return this.makeToken(TokenKind.FloatMm, text, start, this.currentPos());
      }
      return this.makeToken(TokenKind.DecNumber, text, start, this.currentPos());
    }

    // ── Identifier or keyword ─────────────────────────────────────────────
    if (isIdentStart(ch)) {
      const text = this.readIdentifier();
      const kw = KEYWORDS[text];
      if (kw !== undefined) {
        return this.makeToken(kw, text, start, this.currentPos());
      }
      return this.makeToken(TokenKind.Identifier, text, start, this.currentPos());
    }

    // ── Single-character punctuation ──────────────────────────────────────
    this.advance();
    switch (ch) {
      case '{': return this.makeToken(TokenKind.LBrace,    ch, start, this.currentPos());
      case '}': return this.makeToken(TokenKind.RBrace,    ch, start, this.currentPos());
      case '[': return this.makeToken(TokenKind.LBracket,  ch, start, this.currentPos());
      case ']': return this.makeToken(TokenKind.RBracket,  ch, start, this.currentPos());
      case '(': return this.makeToken(TokenKind.LParen,    ch, start, this.currentPos());
      case ')': return this.makeToken(TokenKind.RParen,    ch, start, this.currentPos());
      case ':': return this.makeToken(TokenKind.Colon,     ch, start, this.currentPos());
      case ';': return this.makeToken(TokenKind.Semicolon, ch, start, this.currentPos());
      case ',': return this.makeToken(TokenKind.Comma,     ch, start, this.currentPos());
      case '<': return this.makeToken(TokenKind.Lt,        ch, start, this.currentPos());
      case '-': return this.makeToken(TokenKind.Minus,     ch, start, this.currentPos());
      default:
        this.errors.push({
          message: `Unexpected character '${ch}'`,
          span: { start, end: this.currentPos() },
        });
        return null;
    }
  }

  // Pending token from # + constraint two-token expansion
  private _pending: Token | null = null;

  // Wrap tokenize to inject pending tokens
  tokenizeWithPending(): Token[] {
    const raw: Token[] = [];
    while (this.pos < this.src.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.src.length) break;
      const tok = this.nextToken();
      if (tok) {
        raw.push(tok);
        if (this._pending) {
          raw.push(this._pending);
          this._pending = null;
        }
      }
    }
    raw.push(this.makeToken(TokenKind.EOF, '', this.currentPos(), this.currentPos()));
    return raw;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r') { this.advance(); continue; }
      if (ch === '\n') { this.advance(); this.line++; this.column = 0; continue; }
      if (ch === '/' && this.peek(1) === '/') {
        while (this.pos < this.src.length && this.src[this.pos] !== '\n') this.advance();
        continue;
      }
      break;
    }
  }

  private readWord(): string {
    // reads . + alphanumeric/underscore
    const start = this.pos;
    this.advance(); // consume '.'
    while (this.pos < this.src.length && isIdentContinue(this.src[this.pos])) this.advance();
    return this.src.slice(start, this.pos);
  }

  private readIdentifier(): string {
    const start = this.pos;
    while (this.pos < this.src.length && isIdentContinue(this.src[this.pos])) this.advance();
    return this.src.slice(start, this.pos);
  }

  private readHex(): string {
    const start = this.pos;
    this.advance(2); // '0x'
    while (this.pos < this.src.length && isHexDigit(this.src[this.pos])) this.advance();
    return this.src.slice(start, this.pos);
  }

  private readNumber(): string {
    const start = this.pos;
    while (this.pos < this.src.length && isDigit(this.src[this.pos])) this.advance();
    if (this.src[this.pos] === '.' && isDigit(this.src[this.pos + 1] ?? '')) {
      this.advance();
      while (this.pos < this.src.length && isDigit(this.src[this.pos])) this.advance();
      // unit suffix: mm
      if (this.src.startsWith('mm', this.pos)) {
        this.advance(2);
      }
    }
    return this.src.slice(start, this.pos);
  }

  private advance(n = 1): void {
    for (let i = 0; i < n; i++) {
      if (this.pos < this.src.length) { this.pos++; this.column++; }
    }
  }

  private peek(n: number): string {
    return this.src[this.pos + n] ?? '';
  }

  private currentPos(): SourcePosition {
    return { line: this.line, column: this.column, offset: this.pos };
  }

  private makeToken(kind: TokenKind, text: string, start: SourcePosition, end: SourcePosition): Token {
    return { kind, text, start, end };
  }
}

// ── Character predicates ──────────────────────────────────────────────────────

function isDigit(ch: string):      boolean { return ch >= '0' && ch <= '9'; }
function isHexDigit(ch: string):   boolean { return isDigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F'); }
function isIdentStart(ch: string): boolean { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'; }
function isIdentContinue(ch: string): boolean { return isIdentStart(ch) || isDigit(ch); }

// ── Public entry point ────────────────────────────────────────────────────────

export function tokenize(src: string): { tokens: Token[]; errors: typeof Lexer.prototype.errors } {
  const lexer = new Lexer(src);
  const tokens = lexer.tokenizeWithPending();
  return { tokens, errors: lexer.errors };
}
