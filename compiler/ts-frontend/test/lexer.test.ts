// RIVER-LANG Compiler — Lexer Tests
// compiler/ts-frontend/test/lexer.test.ts

import { tokenize, LexError } from "../src/lexer/lexer.js";
import { Token, TokenKind } from "../src/lexer/token.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function kinds(source: string): TokenKind[] {
  return tokenize(source).map((t) => t.kind);
}

function lexemes(source: string): string[] {
  return tokenize(source).map((t) => t.lexeme);
}

function onlyToken(source: string): Token {
  const toks = tokenize(source).filter((t) => t.kind !== "EOF");
  assert.equal(toks.length, 1, `Expected exactly 1 non-EOF token, got ${toks.length}`);
  return toks[0]!;
}

// ---------------------------------------------------------------------------
// Comments and whitespace
// ---------------------------------------------------------------------------

describe("Comments and whitespace", () => {
  it("empty source produces only EOF", () => {
    const toks = tokenize("");
    assert.equal(toks.length, 1);
    assert.equal(toks[0]!.kind, "EOF");
  });

  it("whitespace-only source produces only EOF", () => {
    const toks = tokenize("   \t\n  ");
    assert.equal(toks.length, 1);
    assert.equal(toks[0]!.kind, "EOF");
  });

  it("line comment // is skipped entirely", () => {
    const toks = tokenize("// this is a comment\n");
    assert.equal(toks.length, 1);
    assert.equal(toks[0]!.kind, "EOF");
  });

  it("inline comment after token is skipped", () => {
    const toks = tokenize(".epoch 0x52495645 // base salt");
    const k = toks.map((t) => t.kind);
    assert.deepEqual(k, ["DotEpoch", "HexNumber", "EOF"]);
  });

  it("semicolon comment is skipped when at line start", () => {
    const toks = tokenize("; comment only line\n");
    assert.equal(toks.length, 1);
    assert.equal(toks[0]!.kind, "EOF");
  });
});

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

describe("Directives", () => {
  it("tokenizes .epoch", () => {
    const tok = onlyToken(".epoch");
    assert.equal(tok.kind, "DotEpoch");
    assert.equal(tok.lexeme, ".epoch");
  });

  it("tokenizes .sector", () => {
    const tok = onlyToken(".sector");
    assert.equal(tok.kind, "DotSector");
  });

  it("tokenizes .node", () => {
    const tok = onlyToken(".node");
    assert.equal(tok.kind, "DotNode");
  });

  it("tokenizes @reservoir", () => {
    const tok = onlyToken("@reservoir");
    assert.equal(tok.kind, "Reservoir");
    assert.equal(tok.lexeme, "@reservoir");
  });

  it("full epoch line", () => {
    assert.deepEqual(
      kinds(".epoch 0x52495645"),
      ["DotEpoch", "HexNumber", "EOF"]
    );
  });

  it("full sector line with range", () => {
    assert.deepEqual(
      kinds(".sector Alpha [0x000-0x1FF]"),
      ["DotSector", "Identifier", "LBracket", "HexNumber", "Minus", "HexNumber", "RBracket", "EOF"]
    );
  });
});

// ---------------------------------------------------------------------------
// Node declarations
// ---------------------------------------------------------------------------

describe("Node declarations", () => {
  it("tokenizes a minimal node header", () => {
    assert.deepEqual(
      kinds(".node Seed_Gen @ 0x00A0 {"),
      ["DotNode", "Identifier", "At", "HexNumber", "LBrace", "EOF"]
    );
  });

  it("tokenizes body keywords", () => {
    assert.deepEqual(
      kinds("type: TOKEN_GEN;"),
      ["KwType", "Colon", "Identifier", "Semicolon", "EOF"]
    );
  });

  it("tokenizes tag keyword with COLOR_AUTO", () => {
    assert.deepEqual(
      kinds("tag: COLOR_AUTO;"),
      ["KwTag", "Colon", "Identifier", "Semicolon", "EOF"]
    );
  });

  it("tokenizes fire_on keyword", () => {
    assert.deepEqual(
      kinds("fire_on: ALL_INPUTS;"),
      ["KwFireOn", "Colon", "Identifier", "Semicolon", "EOF"]
    );
  });

  it("tokenizes closing brace", () => {
    assert.deepEqual(kinds("}"), ["RBrace", "EOF"]);
  });
});

// ---------------------------------------------------------------------------
// Reservoir declarations
// ---------------------------------------------------------------------------

describe("Reservoir declarations", () => {
  it("tokenizes full reservoir header", () => {
    assert.deepEqual(
      kinds("@reservoir Final_Output @ 0x0300 {"),
      ["Reservoir", "Identifier", "At", "HexNumber", "LBrace", "EOF"]
    );
  });

  it("tokenizes arity", () => {
    assert.deepEqual(
      kinds("arity: 1;"),
      ["KwArity", "Colon", "DecNumber", "Semicolon", "EOF"]
    );
  });

  it("tokenizes handshake", () => {
    assert.deepEqual(
      kinds("handshake: PATH_HASH;"),
      ["KwHandshake", "Colon", "Identifier", "Semicolon", "EOF"]
    );
  });

  it("tokenizes self.purge() as atomic token", () => {
    assert.deepEqual(
      kinds("on_dry: self.purge();"),
      ["KwOnDry", "Colon", "SelfPurge", "Semicolon", "EOF"]
    );
    const toks = tokenize("on_dry: self.purge();");
    const sp = toks.find((t) => t.kind === "SelfPurge")!;
    assert.equal(sp.lexeme, "self.purge()");
  });
});

// ---------------------------------------------------------------------------
// Flow operators
// ---------------------------------------------------------------------------

describe("Flow operators", () => {
  it("tokenizes <~ downstream flow", () => {
    const tok = onlyToken("<~");
    assert.equal(tok.kind, "FlowDown");
    assert.equal(tok.lexeme, "<~");
  });

  it("tokenizes ~> upstream flow", () => {
    const tok = onlyToken("~>");
    assert.equal(tok.kind, "FlowUp");
    assert.equal(tok.lexeme, "~>");
  });

  it("tokenizes /? guard", () => {
    const tok = onlyToken("/?");
    assert.equal(tok.kind, "Guard");
  });

  it("full downstream flow statement", () => {
    assert.deepEqual(
      kinds("Feedback_Merge <~ Seed_Gen;"),
      ["Identifier", "FlowDown", "Identifier", "Semicolon", "EOF"]
    );
  });

  it("full upstream cry statement", () => {
    assert.deepEqual(
      kinds("Fibonacci_Adder.cry ~> Feedback_Merge;"),
      ["Identifier", "DotCry", "FlowUp", "Identifier", "Semicolon", "EOF"]
    );
  });
});

// ---------------------------------------------------------------------------
// Node field accessors
// ---------------------------------------------------------------------------

describe("Node field accessors", () => {
  it("tokenizes .cry", () => {
    assert.deepEqual(kinds(".cry"), ["DotCry", "EOF"]);
  });

  it("tokenizes .TRUE", () => {
    assert.deepEqual(kinds(".TRUE"), ["DotTrue", "EOF"]);
  });

  it("tokenizes .FALSE", () => {
    assert.deepEqual(kinds(".FALSE"), ["DotFalse", "EOF"]);
  });

  it("tokenizes .out", () => {
    assert.deepEqual(kinds(".out"), ["DotOut", "EOF"]);
  });

  it("node.TRUE in full flow statement", () => {
    assert.deepEqual(
      kinds("Feedback_Merge <~ Exit_Gate.TRUE;"),
      ["Identifier", "FlowDown", "Identifier", "DotTrue", "Semicolon", "EOF"]
    );
  });

  it("node.FALSE in full flow statement", () => {
    assert.deepEqual(
      kinds("Final_Output <~ Exit_Gate.FALSE;"),
      ["Identifier", "FlowDown", "Identifier", "DotFalse", "Semicolon", "EOF"]
    );
  });
});

// ---------------------------------------------------------------------------
// Constraint syntax
// ---------------------------------------------------------------------------

describe("Constraints", () => {
  it("tokenizes # as Hash", () => {
    assert.deepEqual(kinds("#")[0], "Hash");
  });

  it("tokenizes #constraint directive", () => {
    assert.deepEqual(
      kinds("#constraint"),
      ["Hash", "KwConstraint", "EOF"]
    );
  });

  it("full constraint line", () => {
    assert.deepEqual(
      kinds("#constraint max_dist(Fibonacci_Adder.cry, Feedback_Merge) < 1.5mm;"),
      [
        "Hash", "KwConstraint", "KwMaxDist",
        "LParen",
        "Identifier", "DotCry",
        "Comma",
        "Identifier",
        "RParen",
        "Lt", "FloatMm",
        "Semicolon",
        "EOF"
      ]
    );
  });

  it("tokenizes <= in constraint line", () => {
    assert.deepEqual(
      kinds("#constraint max_dist(Fibonacci_Adder.cry, Feedback_Merge) <= 1.5mm;"),
      [
        "Hash", "KwConstraint", "KwMaxDist",
        "LParen",
        "Identifier", "DotCry",
        "Comma",
        "Identifier",
        "RParen",
        "Lte", "FloatMm",
        "Semicolon",
        "EOF"
      ]
    );
  });
});

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

describe("Literals", () => {
  it("tokenizes hex number", () => {
    const tok = onlyToken("0x52495645");
    assert.equal(tok.kind, "HexNumber");
    assert.equal(tok.lexeme, "0x52495645");
  });

  it("tokenizes short hex", () => {
    const tok = onlyToken("0x000");
    assert.equal(tok.kind, "HexNumber");
  });

  it("tokenizes decimal number", () => {
    const tok = onlyToken("999");
    assert.equal(tok.kind, "DecNumber");
    assert.equal(tok.lexeme, "999");
  });

  it("tokenizes float with mm suffix", () => {
    const tok = onlyToken("1.5mm");
    assert.equal(tok.kind, "FloatMm");
    assert.equal(tok.lexeme, "1.5mm");
  });

  it("tokenizes 2.0mm", () => {
    const tok = onlyToken("2.0mm");
    assert.equal(tok.kind, "FloatMm");
  });
});

// ---------------------------------------------------------------------------
// Position tracking
// ---------------------------------------------------------------------------

describe("Position tracking", () => {
  it("tracks line and column for first token", () => {
    const toks = tokenize(".epoch");
    assert.equal(toks[0]!.start.line, 1);
    assert.equal(toks[0]!.start.column, 1);
  });

  it("tracks line correctly across newlines", () => {
    const toks = tokenize(".epoch 0x00\n.sector Alpha");
    const sector = toks.find((t) => t.kind === "DotSector")!;
    assert.equal(sector.start.line, 2);
    assert.equal(sector.start.column, 1);
  });

  it("tracks column within a line", () => {
    const toks = tokenize(".epoch 0x00");
    const hex = toks.find((t) => t.kind === "HexNumber")!;
    assert.equal(hex.start.column, 8);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("Error handling", () => {
  it("throws LexError on unexpected character", () => {
    assert.throws(
      () => tokenize("^invalid"),
      (err) => err instanceof LexError
    );
  });

  it("throws LexError on bare 0x with no hex digits", () => {
    assert.throws(
      () => tokenize("0x"),
      (err) => err instanceof LexError
    );
  });

  it("throws LexError on malformed float without mm suffix", () => {
    assert.throws(
      () => tokenize("1.5"),
      (err) => err instanceof LexError
    );
  });

  it("throws LexError on non-hex after 0x with correct position", () => {
    try {
      tokenize("0xG");
      assert.fail("Should have thrown");
    } catch (err) {
      assert.ok(err instanceof LexError);
      assert.equal(err.position.line, 1);
      assert.equal(err.position.column, 1);
    }
  });

  it("LexError includes position information", () => {
    try {
      tokenize("\n\n^");
      assert.fail("Should have thrown");
    } catch (err) {
      assert.ok(err instanceof LexError);
      assert.equal(err.position.line, 3);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("inline // comment after .epoch does not leak tokens", () => {
    const toks = tokenize(".epoch 0x52495645 // comment");
    const kinds = toks.map(t => t.kind);
    assert.deepEqual(kinds, ["DotEpoch", "HexNumber", "EOF"]);
  });

  it("empty node body {} tokenizes correctly", () => {
    const toks = tokenize(".node A @ 0x001 {}");
    const kinds = toks.map(t => t.kind);
    assert.deepEqual(kinds, ["DotNode", "Identifier", "At", "HexNumber", "LBrace", "RBrace", "EOF"]);
  });

  it("multiple consecutive comments produce only EOF", () => {
    const toks = tokenize("// a\n; b\n// c\n");
    assert.equal(toks.length, 1);
    assert.equal(toks[0]!.kind, "EOF");
  });
});

// ---------------------------------------------------------------------------
// Full Fibonacci program — integration test
// ---------------------------------------------------------------------------

describe("Fibonacci program — integration", () => {
  const FIBONACCI = `
.epoch 0x52495645
.sector Alpha [0x000-0x1FF]
.sector Beta  [0x200-0x3FF]

.node Seed_Gen       @ 0x00A0 { type: TOKEN_GEN;   tag: COLOR_AUTO; }
.node Feedback_Merge @ 0x00B4 { type: MERGE_GATE;  fire_on: ALL_INPUTS; }
.node Fibonacci_Adder@ 0x00C8 { type: ALU_ADD;     tag: COLOR_AUTO; }
.node Counter_Sub    @ 0x00D2 { type: ALU_SUB;     tag: COLOR_AUTO; }
.node Exit_Gate      @ 0x0210 { type: SWITCH_GATE; sector: Beta; }

@reservoir Final_Output @ 0x0300 {
    arity: 1;
    handshake: PATH_HASH;
    on_dry: self.purge();
}

Feedback_Merge    <~ Seed_Gen;
Fibonacci_Adder   <~ Feedback_Merge;
Counter_Sub       <~ Seed_Gen;
Exit_Gate         <~ Fibonacci_Adder;
Exit_Gate         <~ Counter_Sub;
Feedback_Merge    <~ Exit_Gate.TRUE;
Final_Output      <~ Exit_Gate.FALSE;

Fibonacci_Adder.cry ~> Feedback_Merge;
Feedback_Merge.cry  ~> Seed_Gen;

#constraint max_dist(Fibonacci_Adder.cry, Feedback_Merge) < 1.5mm;
#constraint max_dist(Feedback_Merge.cry, Seed_Gen)        < 1.5mm;
`.trim();

  it("tokenizes without throwing", () => {
    assert.doesNotThrow(() => tokenize(FIBONACCI));
  });

  it("produces correct directive sequence", () => {
    const toks = tokenize(FIBONACCI);
    const directives = toks
      .filter((t) => ["DotEpoch", "DotSector", "DotNode", "Reservoir"].includes(t.kind))
      .map((t) => t.kind);

    assert.deepEqual(directives, [
      "DotEpoch",
      "DotSector", "DotSector",
      "DotNode", "DotNode", "DotNode", "DotNode", "DotNode",
      "Reservoir",
    ]);
  });

  it("produces correct flow operator count", () => {
    const toks = tokenize(FIBONACCI);
    const flowDown = toks.filter((t) => t.kind === "FlowDown").length;
    const flowUp   = toks.filter((t) => t.kind === "FlowUp").length;
    assert.equal(flowDown, 7, "Expected 7 <~ operators");
    assert.equal(flowUp,   2, "Expected 2 ~> operators");
  });

  it("finds both constraint lines", () => {
    const toks = tokenize(FIBONACCI);
    const hashes = toks.filter((t) => t.kind === "Hash").length;
    assert.equal(hashes, 2);
  });

  it("finds self.purge() as SelfPurge token", () => {
    const toks = tokenize(FIBONACCI);
    const sp = toks.find((t) => t.kind === "SelfPurge");
    assert.ok(sp, "SelfPurge token not found");
    assert.equal(sp!.lexeme, "self.purge()");
  });

  it("ends with EOF", () => {
    const toks = tokenize(FIBONACCI);
    assert.equal(toks[toks.length - 1]!.kind, "EOF");
  });
});
