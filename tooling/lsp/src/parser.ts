/**
 * RIVER-LANG LSP — src/parser.ts
 * Recursive-descent parser. Produces an AST + structured parse errors
 * with source spans for LSP diagnostics.
 */

import { Token, TokenKind, ChannelGraphAst, AstSector, AstNode,
         AstReservoir, AstFlow, AstConstraint, PortRef, Span, LspDiag } from './types';

export interface ParseResult {
  ast:   ChannelGraphAst;
  diags: LspDiag[];
}

export function parse(tokens: Token[]): ParseResult {
  const p = new Parser(tokens);
  const ast = p.parseGraph();
  return { ast, diags: p.diags };
}

// ── Parser ────────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0;
  readonly diags: LspDiag[] = [];

  constructor(private readonly tokens: Token[]) {}

  // ── Top-level ────────────────────────────────────────────────────────────

  parseGraph(): ChannelGraphAst {
    const ast: ChannelGraphAst = {
      epoch: 0, sectors: [], nodes: [],
      reservoir: null, flows: [], nerves: [], constraints: [],
    };

    while (!this.at(TokenKind.EOF)) {
      if (this.at(TokenKind.DotEpoch)) {
        ast.epoch = this.parseEpoch();
      } else if (this.at(TokenKind.DotSector)) {
        const sec = this.parseSector();
        if (sec) ast.sectors.push(sec);
      } else if (this.at(TokenKind.DotNode)) {
        const node = this.parseNode();
        if (node) ast.nodes.push(node);
      } else if (this.at(TokenKind.Reservoir)) {
        const res = this.parseReservoir();
        if (res) {
          if (ast.reservoir) {
            this.error('Duplicate @reservoir declaration', res.span);
          } else {
            ast.reservoir = res;
          }
        }
      } else if (this.at(TokenKind.Identifier)) {
        // Flow or nerve statement starting with a node name
        const flow = this.parseFlowStatement();
        if (flow) {
          if (flow.isNerve) ast.nerves.push(flow.flow);
          else              ast.flows.push(flow.flow);
        }
      } else if (this.at(TokenKind.Hash)) {
        const c = this.parseConstraint();
        if (c) ast.constraints.push(c);
      } else {
        this.error(`Unexpected token '${this.cur().text}'`, this.spanOf(this.cur()));
        this.advance();
      }
    }

    return ast;
  }

  // ── .epoch 0x52495645; ───────────────────────────────────────────────────

  private parseEpoch(): number {
    this.consume(TokenKind.DotEpoch);
    const tok = this.expect(TokenKind.HexNumber, 'Expected hex epoch value after .epoch');
    this.consumeIf(TokenKind.Semicolon);
    if (!tok) return 0;
    return parseInt(tok.text, 16);
  }

  // ── .sector Alpha [0x000 - 0x1FF]; ──────────────────────────────────────

  private parseSector(): AstSector | null {
    const start = this.cur().start;
    this.consume(TokenKind.DotSector);
    const nameTok = this.expect(TokenKind.Identifier, 'Expected sector name');
    if (!nameTok) { this.skipToSemicolon(); return null; }

    this.expectPunct(TokenKind.LBracket, '[');
    const startAddrTok = this.expect(TokenKind.HexNumber, 'Expected hex start address');
    this.expectPunct(TokenKind.Minus, '-');
    const endAddrTok   = this.expect(TokenKind.HexNumber, 'Expected hex end address');
    this.expectPunct(TokenKind.RBracket, ']');
    this.consumeIf(TokenKind.Semicolon);

    return {
      name:  nameTok.text,
      start: startAddrTok ? parseInt(startAddrTok.text, 16) : 0,
      end:   endAddrTok   ? parseInt(endAddrTok.text, 16)   : 0,
      span:  { start, end: this.prevEnd() },
    };
  }

  // ── .node Seed_Gen @ 0x00A0 { ... } ─────────────────────────────────────

  private parseNode(): AstNode | null {
    const start = this.cur().start;
    this.consume(TokenKind.DotNode);
    const nameTok = this.expect(TokenKind.Identifier, 'Expected node name');
    if (!nameTok) { this.skipToRBrace(); return null; }

    this.expectPunct(TokenKind.At, '@');
    const addrTok = this.expect(TokenKind.HexNumber, 'Expected node address');

    this.expectPunct(TokenKind.LBrace, '{');

    let nodeType = '';
    let tag: string | undefined;
    let fireOn: string | undefined;
    let sector: string | undefined;

    while (!this.at(TokenKind.RBrace) && !this.at(TokenKind.EOF)) {
      if (this.at(TokenKind.KwType)) {
        this.advance();
        this.expectPunct(TokenKind.Colon, ':');
        const typeTok = this.expectIdentOrKw('Expected node type');
        if (typeTok) nodeType = typeTok.text;
        this.consumeIf(TokenKind.Semicolon);
      } else if (this.at(TokenKind.KwTag)) {
        this.advance();
        this.expectPunct(TokenKind.Colon, ':');
        const t = this.expectIdentOrKw('Expected tag value');
        if (t) tag = t.text;
        this.consumeIf(TokenKind.Semicolon);
      } else if (this.at(TokenKind.KwFireOn)) {
        this.advance();
        this.expectPunct(TokenKind.Colon, ':');
        const t = this.expectIdentOrKw('Expected fire_on value');
        if (t) fireOn = t.text;
        this.consumeIf(TokenKind.Semicolon);
      } else if (this.at(TokenKind.KwSector)) {
        this.advance();
        this.expectPunct(TokenKind.Colon, ':');
        const t = this.expect(TokenKind.Identifier, 'Expected sector name');
        if (t) sector = t.text;
        this.consumeIf(TokenKind.Semicolon);
      } else if (this.at(TokenKind.KwTarget)) {
        this.advance();
        this.expectPunct(TokenKind.Colon, ':');
        this.expectIdentOrKw('Expected target value');
        this.consumeIf(TokenKind.Semicolon);
      } else {
        this.error(`Unknown node property '${this.cur().text}' in node '${nameTok.text}'`,
          this.spanOf(this.cur()));
        this.advance();
        this.consumeIf(TokenKind.Semicolon);
      }
    }
    this.expectPunct(TokenKind.RBrace, '}');

    return {
      name:     nameTok.text,
      address:  addrTok ? parseInt(addrTok.text, 16) : 0,
      nodeType,
      tag, fireOn, sector,
      span: { start, end: this.prevEnd() },
    };
  }

  // ── @reservoir Final_Output @ 0x0300 { ... } ────────────────────────────

  private parseReservoir(): AstReservoir | null {
    const start = this.cur().start;
    this.consume(TokenKind.Reservoir);
    const nameTok = this.expect(TokenKind.Identifier, 'Expected reservoir name');
    if (!nameTok) { this.skipToRBrace(); return null; }

    this.expectPunct(TokenKind.At, '@');
    const addrTok = this.expect(TokenKind.HexNumber, 'Expected reservoir address');

    this.expectPunct(TokenKind.LBrace, '{');

    let arity = 1;
    let handshake = true;
    let onDry = 'self.purge()';

    while (!this.at(TokenKind.RBrace) && !this.at(TokenKind.EOF)) {
      if (this.at(TokenKind.KwArity)) {
        this.advance();
        this.expectPunct(TokenKind.Colon, ':');
        const t = this.expect(TokenKind.DecNumber, 'Expected arity value');
        if (t) arity = parseInt(t.text, 10);
        this.consumeIf(TokenKind.Semicolon);
      } else if (this.at(TokenKind.KwHandshake)) {
        this.advance();
        this.expectPunct(TokenKind.Colon, ':');
        const t = this.expectIdentOrKw('Expected handshake value');
        if (t) handshake = t.text === 'true';
        this.consumeIf(TokenKind.Semicolon);
      } else if (this.at(TokenKind.KwOnDry)) {
        this.advance();
        this.expectPunct(TokenKind.Colon, ':');
        if (this.at(TokenKind.SelfPurge)) {
          onDry = this.cur().text;
          this.advance();
        } else {
          const t = this.expectIdentOrKw('Expected on_dry value');
          if (t) onDry = t.text;
        }
        this.consumeIf(TokenKind.Semicolon);
      } else {
        this.error(`Unknown reservoir property '${this.cur().text}'`, this.spanOf(this.cur()));
        this.advance();
        this.consumeIf(TokenKind.Semicolon);
      }
    }
    this.expectPunct(TokenKind.RBrace, '}');

    return {
      name:      nameTok.text,
      address:   addrTok ? parseInt(addrTok.text, 16) : 0,
      arity, handshake, onDry,
      span: { start, end: this.prevEnd() },
    };
  }

  // ── Flow: A <~ B or A.cry ~> B ──────────────────────────────────────────

  private parseFlowStatement(): { flow: AstFlow; isNerve: boolean } | null {
    const start = this.cur().start;

    // LHS port ref
    const lhs = this.parsePortRef();
    if (!lhs) { this.skipToSemicolon(); return null; }

    let isNerve = false;
    let flow: AstFlow;

    if (this.at(TokenKind.FlowDown)) {
      // A <~ B  means B flows into A
      this.advance();
      const rhs = this.parsePortRef();
      this.consumeIf(TokenKind.Semicolon);
      if (!rhs) return null;
      flow = { from: rhs, to: lhs, span: { start, end: this.prevEnd() } };
    } else if (this.at(TokenKind.FlowUp)) {
      // A.cry ~> B  means A cries upstream to B
      this.advance();
      const rhs = this.parsePortRef();
      this.consumeIf(TokenKind.Semicolon);
      if (!rhs) return null;
      isNerve = true;
      flow = { from: lhs, to: rhs, span: { start, end: this.prevEnd() } };
    } else {
      this.error(`Expected '<~' or '~>' after '${lhs.node}'`, {
        start: this.cur().start, end: this.cur().end,
      });
      this.skipToSemicolon();
      return null;
    }

    return { flow, isNerve };
  }

  private parsePortRef(): PortRef | null {
    const nameTok = this.expect(TokenKind.Identifier, 'Expected node name');
    if (!nameTok) return null;

    let accessor: PortRef['accessor'];
    if (this.at(TokenKind.DotCry))   { accessor = 'cry';   this.advance(); }
    if (this.at(TokenKind.DotTrue))  { accessor = 'TRUE';  this.advance(); }
    if (this.at(TokenKind.DotFalse)) { accessor = 'FALSE'; this.advance(); }
    if (this.at(TokenKind.DotOut))   { accessor = 'out';   this.advance(); }

    return { node: nameTok.text, accessor };
  }

  // ── #constraint max_dist(A.cry, B) <= 1.5mm; ────────────────────────────

  private parseConstraint(): AstConstraint | null {
    const start = this.cur().start;
    this.consume(TokenKind.Hash);
    this.consumeIf(TokenKind.KwConstraint);

    const fnTok = this.expect(TokenKind.KwMaxDist, 'Expected constraint function (max_dist)');
    if (!fnTok) { this.skipToSemicolon(); return null; }

    this.expectPunct(TokenKind.LParen, '(');
    const portA = this.parsePortRef();
    this.expectPunct(TokenKind.Comma, ',');
    const portB = this.parsePortRef();
    this.expectPunct(TokenKind.RParen, ')');

    // operator: <=
    this.consumeIf(TokenKind.Lt);
    this.consumeIf(TokenKind.Minus); // no <=, might be just <

    const valTok = this.expect(TokenKind.FloatMm, 'Expected distance value (e.g. 1.5mm)');
    this.consumeIf(TokenKind.Semicolon);

    if (!portA || !portB || !valTok) return null;

    const raw = valTok.text.replace('mm', '');
    return {
      fn:    fnTok.text,
      portA, portB,
      op:    '<=',
      value: parseFloat(raw),
      unit:  'mm',
      span:  { start, end: this.prevEnd() },
    };
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  private cur(): Token { return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1]; }
  private prev(): Token { return this.tokens[Math.max(0, this.pos - 1)]; }
  private prevEnd() { return this.prev().end; }
  private at(kind: TokenKind): boolean { return this.cur().kind === kind; }
  private advance(): Token { return this.tokens[this.pos++] ?? this.cur(); }

  private consume(kind: TokenKind): Token {
    if (this.at(kind)) return this.advance();
    return this.cur();
  }

  private consumeIf(kind: TokenKind): boolean {
    if (this.at(kind)) { this.advance(); return true; }
    return false;
  }

  private expect(kind: TokenKind, msg: string): Token | null {
    if (this.at(kind)) return this.advance();
    this.error(msg, this.spanOf(this.cur()));
    return null;
  }

  private expectPunct(kind: TokenKind, ch: string): void {
    if (!this.consumeIf(kind)) {
      this.error(`Expected '${ch}'`, this.spanOf(this.cur()));
    }
  }

  private expectIdentOrKw(msg: string): Token | null {
    const k = this.cur().kind;
    if (k === TokenKind.Identifier || (k >= TokenKind.KwType && k <= TokenKind.KwMaxDist)) {
      return this.advance();
    }
    this.error(msg, this.spanOf(this.cur()));
    return null;
  }

  private skipToSemicolon(): void {
    while (!this.at(TokenKind.Semicolon) && !this.at(TokenKind.EOF)) this.advance();
    this.consumeIf(TokenKind.Semicolon);
  }

  private skipToRBrace(): void {
    let depth = 0;
    while (!this.at(TokenKind.EOF)) {
      if (this.at(TokenKind.LBrace)) depth++;
      if (this.at(TokenKind.RBrace)) { if (depth-- <= 0) { this.advance(); return; } }
      this.advance();
    }
  }

  private spanOf(tok: Token): Span { return { start: tok.start, end: tok.end }; }

  private error(message: string, span: Span): void {
    this.diags.push({ severity: 'error', rule: 'parse', message, span });
  }
}