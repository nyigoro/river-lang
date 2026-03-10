// RIVER-LANG Compiler — Parser Tests
// compiler/ts-frontend/test/parser.test.ts

import { tokenize } from "../src/lexer/lexer.js";
import { parseTokens, ParseError } from "../src/parser/parser.js";
import {
  ChannelGraphAst,
  AstSector,
  AstNode,
  AstReservoir,
  AstFlow,
  AstConstraint,
} from "../src/parser/ast.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse(source: string): ChannelGraphAst {
  return parseTokens(tokenize(source));
}

// ---------------------------------------------------------------------------
// Epoch
// ---------------------------------------------------------------------------

describe("Epoch", () => {
  it("parses .epoch into numeric value", () => {
    const g = parse(".epoch 0x52495645");
    assert.equal(g.epoch, 0x52495645);
  });

  it("epoch defaults to 0 when absent", () => {
    const g = parse("");
    assert.equal(g.epoch, 0);
  });
});

// ---------------------------------------------------------------------------
// Sectors
// ---------------------------------------------------------------------------

describe("Sectors", () => {
  it("parses a single sector", () => {
    const g = parse(".sector Alpha [0x000-0x1FF]");
    assert.equal(g.sectors.length, 1);
    const s = g.sectors[0] as AstSector;
    assert.equal(s.name, "Alpha");
    assert.equal(s.start, 0x000);
    assert.equal(s.end, 0x1FF);
  });

  it("parses two sectors", () => {
    const g = parse(`
      .sector Alpha [0x000-0x1FF]
      .sector Beta  [0x200-0x3FF]
    `);
    assert.equal(g.sectors.length, 2);
    assert.equal(g.sectors[0]!.name, "Alpha");
    assert.equal(g.sectors[1]!.name, "Beta");
    assert.equal(g.sectors[1]!.start, 0x200);
    assert.equal(g.sectors[1]!.end, 0x3FF);
  });
});

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

describe("Nodes", () => {
  it("parses a minimal node", () => {
    const g = parse(".node Seed_Gen @ 0x00A0 { type: TOKEN_GEN; }");
    assert.equal(g.nodes.length, 1);
    const n = g.nodes[0] as AstNode;
    assert.equal(n.name, "Seed_Gen");
    assert.equal(n.address, 0x00A0);
    assert.equal(n.nodeType, "TOKEN_GEN");
  });

  it("parses node with tag", () => {
    const g = parse(".node Foo @ 0x001 { type: ALU_ADD; tag: COLOR_AUTO; }");
    assert.equal(g.nodes[0]!.tag, "COLOR_AUTO");
  });

  it("parses node with fire_on", () => {
    const g = parse(".node M @ 0x002 { type: MERGE_GATE; fire_on: ALL_INPUTS; }");
    assert.equal(g.nodes[0]!.fireOn, "ALL_INPUTS");
  });

  it("parses node with sector (SWITCH_GATE)", () => {
    const g = parse(".node Gate @ 0x0210 { type: SWITCH_GATE; sector: Beta; }");
    assert.equal(g.nodes[0]!.sector, "Beta");
  });

  it("parses all five Fibonacci nodes", () => {
    const g = parse(`
      .node Seed_Gen        @ 0x00A0 { type: TOKEN_GEN;   tag: COLOR_AUTO; }
      .node Feedback_Merge  @ 0x00B4 { type: MERGE_GATE;  fire_on: ALL_INPUTS; }
      .node Fibonacci_Adder @ 0x00C8 { type: ALU_ADD;     tag: COLOR_AUTO; }
      .node Counter_Sub     @ 0x00D2 { type: ALU_SUB;     tag: COLOR_AUTO; }
      .node Exit_Gate       @ 0x0210 { type: SWITCH_GATE; sector: Beta; }
    `);
    assert.equal(g.nodes.length, 5);
    assert.equal(g.nodes[0]!.name, "Seed_Gen");
    assert.equal(g.nodes[1]!.name, "Feedback_Merge");
    assert.equal(g.nodes[2]!.name, "Fibonacci_Adder");
    assert.equal(g.nodes[3]!.name, "Counter_Sub");
    assert.equal(g.nodes[4]!.name, "Exit_Gate");
  });

  it("throws ParseError when type: is missing", () => {
    assert.throws(
      () => parse(".node Bad @ 0x001 { tag: COLOR_AUTO; }"),
      (err) => err instanceof ParseError
    );
  });

  it("throws ParseError on unknown body keyword", () => {
    assert.throws(
      () => parse(".node Bad @ 0x001 { unknown: FOO; }"),
      (err) => err instanceof ParseError
    );
  });
});

// ---------------------------------------------------------------------------
// Reservoir
// ---------------------------------------------------------------------------

describe("Reservoir", () => {
  it("parses a full reservoir", () => {
    const g = parse(`
      @reservoir Final_Output @ 0x0300 {
        arity: 1;
        handshake: PATH_HASH;
        on_dry: self.purge();
      }
    `);
    assert.ok(g.reservoir);
    const r = g.reservoir as AstReservoir;
    assert.equal(r.name, "Final_Output");
    assert.equal(r.address, 0x0300);
    assert.equal(r.arity, 1);
    assert.equal(r.handshake, "PATH_HASH");
    assert.equal(r.onDry, "self.purge()");
  });

  it("throws ParseError on duplicate reservoir", () => {
    assert.throws(
      () => parse(`
        @reservoir A @ 0x100 { arity: 1; handshake: PATH_HASH; on_dry: self.purge(); }
        @reservoir B @ 0x200 { arity: 1; handshake: PATH_HASH; on_dry: self.purge(); }
      `),
      (err) => err instanceof ParseError
    );
  });
});

// ---------------------------------------------------------------------------
// Flow statements — downstream <~
// ---------------------------------------------------------------------------

describe("Downstream flows (<~)", () => {
  it("parses simple downstream flow", () => {
    const g = parse("Feedback_Merge <~ Seed_Gen;");
    assert.equal(g.flows.length, 1);
    const f = g.flows[0] as AstFlow;
    assert.equal(f.direction, "DOWN");
    assert.equal(f.from.node, "Seed_Gen");
    assert.equal(f.to.node, "Feedback_Merge");
    assert.equal(f.from.accessor, undefined);
    assert.equal(f.to.accessor, undefined);
  });

  it("parses flow into gate TRUE branch", () => {
    const g = parse("Feedback_Merge <~ Exit_Gate.TRUE;");
    const f = g.flows[0] as AstFlow;
    assert.equal(f.from.node, "Exit_Gate");
    assert.equal(f.from.accessor, "TRUE");
    assert.equal(f.to.node, "Feedback_Merge");
  });

  it("parses flow into gate FALSE branch", () => {
    const g = parse("Final_Output <~ Exit_Gate.FALSE;");
    const f = g.flows[0] as AstFlow;
    assert.equal(f.from.node, "Exit_Gate");
    assert.equal(f.from.accessor, "FALSE");
  });

  it("parses all 7 Fibonacci downstream flows", () => {
    const g = parse(`
      Feedback_Merge  <~ Seed_Gen;
      Fibonacci_Adder <~ Feedback_Merge;
      Counter_Sub     <~ Seed_Gen;
      Exit_Gate       <~ Fibonacci_Adder;
      Exit_Gate       <~ Counter_Sub;
      Feedback_Merge  <~ Exit_Gate.TRUE;
      Final_Output    <~ Exit_Gate.FALSE;
    `);
    assert.equal(g.flows.length, 7);
  });
});

// ---------------------------------------------------------------------------
// Nerve statements — upstream ~>
// ---------------------------------------------------------------------------

describe("Upstream nerves (~>)", () => {
  it("parses simple upstream nerve", () => {
    const g = parse("Fibonacci_Adder.cry ~> Feedback_Merge;");
    assert.equal(g.nerves.length, 1);
    const n = g.nerves[0] as AstFlow;
    assert.equal(n.direction, "UP");
    assert.equal(n.from.node, "Fibonacci_Adder");
    assert.equal(n.from.accessor, "cry");
    assert.equal(n.to.node, "Feedback_Merge");
  });

  it("parses both Fibonacci nerve connections", () => {
    const g = parse(`
      Fibonacci_Adder.cry ~> Feedback_Merge;
      Feedback_Merge.cry  ~> Seed_Gen;
    `);
    assert.equal(g.nerves.length, 2);
    assert.equal(g.nerves[1]!.from.node, "Feedback_Merge");
    assert.equal(g.nerves[1]!.to.node, "Seed_Gen");
  });

  it("flows go to flows[], nerves go to nerves[]", () => {
    const g = parse(`
      A <~ B;
      C.cry ~> D;
      E <~ F;
    `);
    assert.equal(g.flows.length, 2);
    assert.equal(g.nerves.length, 1);
  });
});

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

describe("Constraints", () => {
  it("parses a single constraint", () => {
    const g = parse("#constraint max_dist(Fibonacci_Adder.cry, Feedback_Merge) < 1.5mm;");
    assert.equal(g.constraints.length, 1);
    const c = g.constraints[0] as AstConstraint;
    assert.equal(c.fn, "max_dist");
    assert.equal(c.portA.node, "Fibonacci_Adder");
    assert.equal(c.portA.accessor, "cry");
    assert.equal(c.portB.node, "Feedback_Merge");
    assert.equal(c.portB.accessor, undefined);
    assert.equal(c.op, "<");
    assert.equal(c.value, 1.5);
    assert.equal(c.unit, "mm");
  });

  it("parses both Fibonacci constraints", () => {
    const g = parse(`
      #constraint max_dist(Fibonacci_Adder.cry, Feedback_Merge) < 1.5mm;
      #constraint max_dist(Feedback_Merge.cry, Seed_Gen)        < 1.5mm;
    `);
    assert.equal(g.constraints.length, 2);
    assert.equal(g.constraints[1]!.portA.node, "Feedback_Merge");
    assert.equal(g.constraints[1]!.portB.node, "Seed_Gen");
  });

  it("parses 2.0mm constraint value", () => {
    const g = parse("#constraint max_dist(A.cry, B) < 2.0mm;");
    assert.equal(g.constraints[0]!.value, 2.0);
  });

  it("parses <= constraint operator", () => {
    const g = parse("#constraint max_dist(A.cry, B) <= 2.0mm;");
    assert.equal(g.constraints[0]!.op, "<=");
    assert.equal(g.constraints[0]!.value, 2.0);
  });
});

// ---------------------------------------------------------------------------
// Span tracking
// ---------------------------------------------------------------------------

describe("Span tracking", () => {
  it("epoch has no span (it is a raw number)", () => {
    const g = parse(".epoch 0x52495645");
    assert.equal(typeof g.epoch, "number");
  });

  it("sector span starts at line 1", () => {
    const g = parse(".sector Alpha [0x000-0x1FF]");
    assert.equal(g.sectors[0]!.span.startLine, 1);
  });

  it("node span captures address correctly", () => {
    const g = parse(".node Foo @ 0x001 { type: ALU_ADD; }");
    assert.equal(g.nodes[0]!.span.startLine, 1);
    assert.equal(g.nodes[0]!.span.startColumn, 1);
  });
});

// ---------------------------------------------------------------------------
// Full Fibonacci program — integration
// ---------------------------------------------------------------------------

describe("Fibonacci program — full parse integration", () => {
  const FIBONACCI = `
.epoch 0x52495645
.sector Alpha [0x000-0x1FF]
.sector Beta  [0x200-0x3FF]

.node Seed_Gen        @ 0x00A0 { type: TOKEN_GEN;   tag: COLOR_AUTO; }
.node Feedback_Merge  @ 0x00B4 { type: MERGE_GATE;  fire_on: ALL_INPUTS; }
.node Fibonacci_Adder @ 0x00C8 { type: ALU_ADD;     tag: COLOR_AUTO; }
.node Counter_Sub     @ 0x00D2 { type: ALU_SUB;     tag: COLOR_AUTO; }
.node Exit_Gate       @ 0x0210 { type: SWITCH_GATE; sector: Beta; }

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

  it("parses without throwing", () => {
    assert.doesNotThrow(() => parse(FIBONACCI));
  });

  it("epoch = 0x52495645", () => {
    assert.equal(parse(FIBONACCI).epoch, 0x52495645);
  });

  it("has 2 sectors", () => {
    assert.equal(parse(FIBONACCI).sectors.length, 2);
  });

  it("has 5 nodes", () => {
    assert.equal(parse(FIBONACCI).nodes.length, 5);
  });

  it("has 1 reservoir named Final_Output", () => {
    const r = parse(FIBONACCI).reservoir;
    assert.ok(r);
    assert.equal(r.name, "Final_Output");
    assert.equal(r.address, 0x0300);
    assert.equal(r.arity, 1);
  });

  it("has 7 downstream flows", () => {
    assert.equal(parse(FIBONACCI).flows.length, 7);
  });

  it("has 2 upstream nerves", () => {
    assert.equal(parse(FIBONACCI).nerves.length, 2);
  });

  it("has 2 constraints both < 1.5mm", () => {
    const cs = parse(FIBONACCI).constraints;
    assert.equal(cs.length, 2);
    assert.equal(cs[0]!.value, 1.5);
    assert.equal(cs[1]!.value, 1.5);
  });

  it("Exit_Gate.TRUE loops back to Feedback_Merge", () => {
    const flows = parse(FIBONACCI).flows;
    const loop = flows.find(
      (f) => f.from.node === "Exit_Gate" && f.from.accessor === "TRUE"
    );
    assert.ok(loop, "TRUE branch flow not found");
    assert.equal(loop!.to.node, "Feedback_Merge");
  });

  it("Exit_Gate.FALSE exits to Final_Output", () => {
    const flows = parse(FIBONACCI).flows;
    const exit = flows.find(
      (f) => f.from.node === "Exit_Gate" && f.from.accessor === "FALSE"
    );
    assert.ok(exit, "FALSE branch flow not found");
    assert.equal(exit!.to.node, "Final_Output");
  });

  it("nerve from Fibonacci_Adder.cry to Feedback_Merge", () => {
    const nerves = parse(FIBONACCI).nerves;
    const n = nerves.find((f) => f.from.node === "Fibonacci_Adder");
    assert.ok(n, "Adder nerve not found");
    assert.equal(n!.from.accessor, "cry");
    assert.equal(n!.to.node, "Feedback_Merge");
  });
});
