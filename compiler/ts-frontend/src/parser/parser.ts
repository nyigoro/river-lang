// RIVER-LANG Compiler — Parser
// compiler/ts-frontend/src/parser/parser.ts
//
// Consumes the token stream produced by the Lexer and builds a ChannelGraphAst.
// The parser is a hand-written recursive descent parser — no parser generator
// dependencies. Each parse* method advances the cursor and returns an AST node.

import { Token, TokenKind } from "../lexer/token.js";
import {
  AstConstraint,
  AstFlow,
  AstNode,
  AstReservoir,
  AstSector,
  ChannelGraphAst,
  FlowDirection,
  PortRef,
  Span,
} from "./ast.js";

// ---------------------------------------------------------------------------
// Parse Error
// ---------------------------------------------------------------------------

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly token: Token,
  ) {
    super(
      `[Parse Error] ${message} — got '${token.lexeme}' (${token.kind}) ` +
      `at line ${token.start.line}, column ${token.start.column}`
    );
    this.name = "ParseError";
  }
}

export interface ParseResult {
  ast: ChannelGraphAst;
  errors: ParseError[];
}

// ---------------------------------------------------------------------------
// Parser class
// ---------------------------------------------------------------------------

export class Parser {
  private i = 0;
  public readonly errors: ParseError[] = [];

  constructor(private readonly tokens: Token[]) {}

  // ── Entry point ──────────────────────────────────────────────────────────

  parse(): ChannelGraphAst {
    const graph: ChannelGraphAst = {
      kind:        "ChannelGraph",
      epoch:       0,
      sectors:     [],
      nodes:       [],
      reservoir:   null,
      flows:       [],
      nerves:      [],
      constraints: [],
    };

    while (!this.atEnd()) {
      const tok = this.peek();

      switch (tok.kind) {
        case "DotEpoch":
          try {
            graph.epoch = this.parseEpoch();
          } catch (err) {
            if (!this.captureError(err)) throw err;
            this.syncToTopLevel();
          }
          break;

        case "DotSector":
          try {
            const sector = this.parseSector();
            if (sector) graph.sectors.push(sector);
          } catch (err) {
            if (!this.captureError(err)) throw err;
            this.syncToTopLevel();
          }
          break;

        case "DotNode":
          try {
            const node = this.parseNode();
            if (node) graph.nodes.push(node);
          } catch (err) {
            if (!this.captureError(err)) throw err;
            this.syncToTopLevel();
          }
          break;

        case "Reservoir":
          try {
            const res = this.parseReservoir();
            if (res) {
              if (graph.reservoir !== null) {
                this.errors.push(new ParseError("Only one @reservoir is allowed per program", tok));
              } else {
                graph.reservoir = res;
              }
            }
          } catch (err) {
            if (!this.captureError(err)) throw err;
            this.syncToTopLevel();
          }
          break;

        // Downstream flow:  Destination <~ Source;
        case "Identifier": {
          const flow = this.parseFlowStatement();
          if (flow) {
            if (flow.direction === "DOWN") {
              graph.flows.push(flow);
            } else {
              graph.nerves.push(flow);
            }
          }
          break;
        }

        // Constraint:  #constraint max_dist(...) < 1.5mm; or <= 1.5mm;
        case "Hash": {
          const constraint = this.parseConstraint();
          if (constraint) graph.constraints.push(constraint);
          break;
        }

        case "EOF":
          return graph;

        default:
          this.errors.push(new ParseError(`Unexpected token at top level`, tok));
          this.syncToTopLevel();
      }
    }

    return graph;
  }

  // ── .epoch 0xXXXXXXXX ───────────────────────────────────────────────────

  private parseEpoch(): number {
    this.consume("DotEpoch");
    const hex = this.consume("HexNumber");
    return this.parseHex(hex.lexeme, hex);
  }

  // ── .sector Name [0xSTART-0xEND] ────────────────────────────────────────

  private parseSector(): AstSector {
    const startTok = this.consume("DotSector");
    const nameTok  = this.consume("Identifier");
    this.consume("LBracket");
    const startHex = this.consume("HexNumber");
    this.consume("Minus");
    const endHex   = this.consume("HexNumber");
    this.consume("RBracket");

    return {
      kind:  "Sector",
      name:  nameTok.lexeme,
      start: this.parseHex(startHex.lexeme, startHex),
      end:   this.parseHex(endHex.lexeme,   endHex),
      span:  this.span(startTok, this.prev()),
    };
  }

  // ── .node Name @ 0xADDR { body } ────────────────────────────────────────

  private parseNode(): AstNode {
    const startTok = this.consume("DotNode");
    const nameTok  = this.consume("Identifier");
    this.consume("At");
    const addrTok  = this.consume("HexNumber");
    this.consume("LBrace");

    const body = this.parseNodeBody();

    this.consume("RBrace");

    if (!body.nodeType) {
      this.errors.push(new ParseError(
        `Node '${nameTok.lexeme}' is missing required 'type:' field`,
        nameTok
      ));
      body.nodeType = "UNKNOWN";
    }

    return {
      kind:     "Node",
      name:     nameTok.lexeme,
      address:  this.parseHex(addrTok.lexeme, addrTok),
      nodeType: body.nodeType,
      tag:      body.tag,
      fireOn:   body.fireOn,
      sector:   body.sector,
      target:   body.target,
      span:     this.span(startTok, this.prev()),
    };
  }

  // ── Node body: key: VALUE; pairs ─────────────────────────────────────────

  private parseNodeBody(): {
    nodeType: string;
    tag?: string;
    fireOn?: string;
    sector?: string;
    target?: string;
  } {
    let nodeType = "";
    let tag: string | undefined;
    let fireOn: string | undefined;
    let sector: string | undefined;
    let target: string | undefined;

    while (!this.atEnd() && this.peek().kind !== "RBrace") {
      const kw = this.peek();

      switch (kw.kind) {
        case "KwType": {
          this.advance();
          this.consume("Colon");
          nodeType = this.consume("Identifier").lexeme;
          this.consumeOptional("Semicolon");
          break;
        }
        case "KwTag": {
          this.advance();
          this.consume("Colon");
          tag = this.consume("Identifier").lexeme;
          this.consumeOptional("Semicolon");
          break;
        }
        case "KwFireOn": {
          this.advance();
          this.consume("Colon");
          fireOn = this.consume("Identifier").lexeme;
          this.consumeOptional("Semicolon");
          break;
        }
        case "KwSector":
        case "KwTarget": {
          this.advance();
          this.consume("Colon");
          const val = this.consume("Identifier").lexeme;
          if (kw.kind === "KwSector") sector = val;
          else target = val;
          this.consumeOptional("Semicolon");
          break;
        }
        default:
          this.errors.push(new ParseError(
            `Unexpected token inside node body`,
            kw
          ));
          this.syncToNodeBodyBoundary();
      }
    }

    return { nodeType, tag, fireOn, sector, target };
  }

  // ── @reservoir Name @ 0xADDR { body } ───────────────────────────────────

  private parseReservoir(): AstReservoir {
    const startTok = this.consume("Reservoir");
    const nameTok  = this.consume("Identifier");
    this.consume("At");
    const addrTok  = this.consume("HexNumber");
    this.consume("LBrace");

    let arity     = 1;
    let handshake = "PATH_HASH";
    let onDry     = "";

    while (!this.atEnd() && this.peek().kind !== "RBrace") {
      const kw = this.peek();

      switch (kw.kind) {
        case "KwArity": {
          this.advance();
          this.consume("Colon");
          const n = this.consume("DecNumber");
          arity = parseInt(n.lexeme, 10);
          this.consumeOptional("Semicolon");
          break;
        }
        case "KwHandshake": {
          this.advance();
          this.consume("Colon");
          handshake = this.consume("Identifier").lexeme;
          this.consumeOptional("Semicolon");
          break;
        }
        case "KwOnDry": {
          this.advance();
          this.consume("Colon");
          onDry = this.consume("SelfPurge").lexeme;
          this.consumeOptional("Semicolon");
          break;
        }
        default:
          this.errors.push(new ParseError(`Unexpected token inside reservoir body`, kw));
          this.syncToNodeBodyBoundary();
      }
    }

    this.consume("RBrace");

    return {
      kind:      "Reservoir",
      name:      nameTok.lexeme,
      address:   this.parseHex(addrTok.lexeme, addrTok),
      arity,
      handshake,
      onDry,
      span:      this.span(startTok, this.prev()),
    };
  }

  // ── Flow statement ───────────────────────────────────────────────────────
  //
  // Downstream:  Dest [.accessor] <~ Source [.accessor] ;
  // Upstream:    Source [.cry]    ~> Dest   ;

  private parseFlowStatement(): AstFlow | null {
    const startTok = this.peek();

    try {
      // First identifier (LHS for <~, source for ~>)
      const lhsName = this.consume("Identifier").lexeme;
      const lhsPort = this.consumeAccessor();

      const opTok = this.peek();

      if (opTok.kind === "FlowDown") {
        // Dest <~ Source
        this.advance();
        const rhsName = this.consume("Identifier").lexeme;
        const rhsPort = this.consumeAccessor();
        this.consume("Semicolon");

        return {
          kind:      "Flow",
          direction: "DOWN",
          from:      { node: rhsName, accessor: rhsPort },
          to:        { node: lhsName, accessor: lhsPort },
          span:      this.span(startTok, this.prev()),
        };
      }

      if (opTok.kind === "FlowUp") {
        // Source.cry ~> Dest
        this.advance();
        const rhsName = this.consume("Identifier").lexeme;
        const rhsPort = this.consumeAccessor();
        this.consume("Semicolon");

        return {
          kind:      "Flow",
          direction: "UP",
          from:      { node: lhsName, accessor: lhsPort },
          to:        { node: rhsName, accessor: rhsPort },
          span:      this.span(startTok, this.prev()),
        };
      }

      throw new ParseError(
        `Expected '<~' or '~>' after identifier`,
        opTok
      );
    } catch (err) {
      if (!this.captureError(err)) throw err;
      this.syncToSemicolon();
      return null;
    }
  }

  // Consume an optional port accessor after an identifier.
  // Returns undefined if the next token is not an accessor.
  private consumeAccessor(): PortRef["accessor"] | undefined {
    const tok = this.peek();
    switch (tok.kind) {
      case "DotCry":   this.advance(); return "cry";
      case "DotTrue":  this.advance(); return "TRUE";
      case "DotFalse": this.advance(); return "FALSE";
      case "DotOut":   this.advance(); return "out";
      default:         return undefined;
    }
  }

  // ── #constraint max_dist(A [.accessor], B [.accessor]) <|<= 1.5mm; ─────

  private parseConstraint(): AstConstraint | null {
    try {
      const startTok = this.consume("Hash");
      this.consume("KwConstraint");
      this.consume("KwMaxDist");
      this.consume("LParen");

      const aName = this.consume("Identifier").lexeme;
      const aPort = this.consumeAccessor();
      this.consume("Comma");
      const bName = this.consume("Identifier").lexeme;
      const bPort = this.consumeAccessor();

      this.consume("RParen");
      const opTok = this.peek();
      if (opTok.kind === "Lte" || opTok.kind === "Lt") {
        this.advance();
      } else {
        throw new ParseError(`Expected '<' or '<=' in constraint`, opTok);
      }

      const distTok = this.consume("FloatMm");
      const { value, unit } = this.parseFloatMm(distTok.lexeme, distTok);

      this.consumeOptional("Semicolon");

      return {
        kind:  "Constraint",
        fn:    "max_dist",
        portA: { node: aName, accessor: aPort },
        portB: { node: bName, accessor: bPort },
        op:    opTok.kind === "Lte" ? "<=" : "<",
        value,
        unit,
        span:  this.span(startTok, this.prev()),
      };
    } catch (err) {
      if (!this.captureError(err)) throw err;
      this.syncToSemicolon();
      return null;
    }
  }

  // ── Parsing helpers ──────────────────────────────────────────────────────

  private captureError(err: unknown): boolean {
    if (err instanceof ParseError) {
      this.errors.push(err);
      return true;
    }
    return false;
  }

  private syncToSemicolon(): void {
    while (!this.atEnd() && this.peek().kind !== "Semicolon") {
      this.advance();
    }
    this.consumeOptional("Semicolon");
  }

  private syncToNodeBodyBoundary(): void {
    while (!this.atEnd() && this.peek().kind !== "Semicolon" && this.peek().kind !== "RBrace") {
      this.advance();
    }
    this.consumeOptional("Semicolon");
  }

  private isTopLevelStart(tok: Token): boolean {
    return (
      tok.kind === "DotEpoch" ||
      tok.kind === "DotSector" ||
      tok.kind === "DotNode" ||
      tok.kind === "Reservoir" ||
      tok.kind === "Hash" ||
      tok.kind === "Identifier" ||
      tok.kind === "EOF"
    );
  }

  private syncToTopLevel(): void {
    while (!this.atEnd() && !this.isTopLevelStart(this.peek())) {
      this.advance();
    }
  }

  private parseHex(lexeme: string, tok: Token): number {
    const n = parseInt(lexeme, 16);
    if (isNaN(n)) {
      throw new ParseError(`Invalid hex literal '${lexeme}'`, tok);
    }
    return n;
  }

  private parseFloatMm(lexeme: string, tok: Token): { value: number; unit: "mm" } {
    // lexeme is e.g. "1.5mm"
    const raw = lexeme.replace(/mm$/, "");
    const value = parseFloat(raw);
    if (isNaN(value)) {
      throw new ParseError(`Invalid distance literal '${lexeme}'`, tok);
    }
    return { value, unit: "mm" };
  }

  // ── Token stream primitives ───────────────────────────────────────────────

  private peek(): Token {
    return this.tokens[this.i] ?? this.eofToken();
  }

  private prev(): Token {
    return this.tokens[this.i - 1] ?? this.eofToken();
  }

  private advance(): Token {
    const tok = this.peek();
    if (tok.kind !== "EOF") this.i++;
    return tok;
  }

  private atEnd(): boolean {
    return this.peek().kind === "EOF";
  }

  /**
   * Consume a token of the expected kind or throw ParseError.
   */
  private consume(kind: TokenKind): Token {
    const tok = this.peek();
    if (tok.kind !== kind) {
      throw new ParseError(`Expected ${kind}`, tok);
    }
    return this.advance();
  }

  /**
   * Consume a token of the given kind only if it is present.
   * Never throws.
   */
  private consumeOptional(kind: TokenKind): Token | null {
    if (this.peek().kind === kind) {
      return this.advance();
    }
    return null;
  }

  private span(from: Token, to: Token): Span {
    return {
      startOffset: from.start.offset,
      endOffset:   to.end.offset,
      startLine:   from.start.line,
      startColumn: from.start.column,
    };
  }

  private eofToken(): Token {
    const last = this.tokens[this.tokens.length - 1];
    const pos = last?.end ?? { offset: 0, line: 1, column: 1 };
    return { kind: "EOF", lexeme: "", start: pos, end: pos };
  }
}

// ---------------------------------------------------------------------------
// Convenience export — matches scaffold usage: parseTokens(tokens)
// ---------------------------------------------------------------------------

export function parseTokens(tokens: Token[]): ParseResult {
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return { ast, errors: parser.errors };
}
