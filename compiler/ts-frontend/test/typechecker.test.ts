// RIVER-LANG Compiler — Type Checker Tests
// compiler/ts-frontend/test/typeChecker.test.ts

import { tokenize } from "../src/lexer/lexer.js";
import { parseTokens } from "../src/parser/parser.js";
import { typeCheck, TypeCheckResult } from "../src/typecheck/typeChecker.js";
import { ChannelGraphAst } from "../src/parser/ast.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function check(source: string): TypeCheckResult {
  return typeCheck(parseTokens(tokenize(source)));
}

function checkAst(ast: ChannelGraphAst): TypeCheckResult {
  return typeCheck(ast);
}

function errorMessages(result: TypeCheckResult): string[] {
  return result.errors.map(d => d.message);
}

function warningMessages(result: TypeCheckResult): string[] {
  return result.warnings.map(d => d.message);
}

function hasError(result: TypeCheckResult, rule: string): boolean {
  return result.errors.some(d => d.rule === rule);
}

function hasWarning(result: TypeCheckResult, rule: string): boolean {
  return result.warnings.some(d => d.rule === rule);
}

// ---------------------------------------------------------------------------
// The canonical Fibonacci program — must always pass
// ---------------------------------------------------------------------------

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

describe("Canonical Fibonacci program", () => {
  it("passes type checking with no errors or warnings", () => {
    const result = check(FIBONACCI);
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
  });
});

// ---------------------------------------------------------------------------
// R0 — .epoch
// ---------------------------------------------------------------------------

describe("R0 — epoch", () => {
  it("warns when .epoch is absent", () => {
    const result = check(`
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
    `);
    assert.ok(hasWarning(result, "R0"), "Expected R0 warning");
  });

  it("no R0 warning when epoch is present", () => {
    const result = check(`
      .epoch 0x52495645
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
    `);
    assert.ok(!hasWarning(result, "R0"), "Unexpected R0 warning");
  });
});

// ---------------------------------------------------------------------------
// R2 — duplicate node names
// ---------------------------------------------------------------------------

describe("R2 — duplicate node names", () => {
  it("errors on duplicate node name", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Foo @ 0x001 { type: ALU_ADD; }
      .node Foo @ 0x002 { type: ALU_SUB; }
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R2"));
    assert.ok(errorMessages(result).some(m => m.includes("Foo")));
  });

  it("errors when reservoir name clashes with node name", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x3FF]
      .node Output @ 0x001 { type: ALU_ADD; }
      @reservoir Output @ 0x200 {
        arity: 1;
        handshake: PATH_HASH;
        on_dry: self.purge();
      }
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R2"));
  });

  it("accepts distinct node names", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Foo @ 0x001 { type: ALU_ADD; }
      .node Bar @ 0x002 { type: ALU_SUB; }
    `);
    assert.ok(!hasError(result, "R2"));
  });
});

// ---------------------------------------------------------------------------
// R3 — duplicate physical addresses
// ---------------------------------------------------------------------------

describe("R3 — duplicate addresses", () => {
  it("errors when two nodes share an address", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Foo @ 0x010 { type: ALU_ADD; }
      .node Bar @ 0x010 { type: ALU_SUB; }
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R3"));
    assert.ok(errorMessages(result).some(m => m.includes("0x0010")));
  });

  it("errors when reservoir address collides with a node", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x3FF]
      .node Foo @ 0x100 { type: ALU_ADD; }
      @reservoir Foo2 @ 0x100 {
        arity: 1; handshake: PATH_HASH; on_dry: self.purge();
      }
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R3"));
  });

  it("accepts distinct addresses", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Foo @ 0x001 { type: ALU_ADD; }
      .node Bar @ 0x002 { type: ALU_SUB; }
    `);
    assert.ok(!hasError(result, "R3"));
  });
});

// ---------------------------------------------------------------------------
// R6 — sector coverage
// ---------------------------------------------------------------------------

describe("R6 — sector coverage", () => {
  it("warns when no sectors are declared", () => {
    const result = check(`
      .epoch 0x1
      .node Foo @ 0x001 { type: ALU_ADD; }
    `);
    assert.ok(hasWarning(result, "R6"));
  });

  it("errors when node address is outside all sectors", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x0FF]
      .node Foo @ 0x200 { type: ALU_ADD; }
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R6"));
    assert.ok(errorMessages(result).some(m => m.includes("Foo")));
    assert.ok(errorMessages(result).some(m => m.includes("0x0200")));
  });

  it("errors when reservoir address is outside all sectors", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x0FF]
      @reservoir Out @ 0x300 {
        arity: 1; handshake: PATH_HASH; on_dry: self.purge();
      }
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R6"));
  });

  it("accepts node at sector boundary (start)", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Foo @ 0x000 { type: ALU_ADD; }
    `);
    assert.ok(!hasError(result, "R6"));
  });

  it("accepts node at sector boundary (end)", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Foo @ 0x1FF { type: ALU_ADD; }
    `);
    assert.ok(!hasError(result, "R6"));
  });

  it("accepts node covered by second of two sectors", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .sector Beta  [0x200-0x3FF]
      .node Foo @ 0x250 { type: ALU_ADD; }
    `);
    assert.ok(!hasError(result, "R6"));
  });
});

// ---------------------------------------------------------------------------
// R1 — undefined node references
// ---------------------------------------------------------------------------

describe("R1 — undefined references", () => {
  it("errors on undefined node in flow source", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Dest @ 0x001 { type: ALU_ADD; }
      Dest <~ Ghost;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R1"));
    assert.ok(errorMessages(result).some(m => m.includes("Ghost")));
  });

  it("errors on undefined node in flow destination", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Src @ 0x001 { type: ALU_ADD; }
      Ghost <~ Src;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R1"));
    assert.ok(errorMessages(result).some(m => m.includes("Ghost")));
  });

  it("errors on undefined node in nerve source", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Dest @ 0x001 { type: MERGE_GATE; }
      Ghost.cry ~> Dest;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R1"));
  });

  it("errors on undefined node in nerve destination", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Src @ 0x001 { type: ALU_ADD; }
      Src.cry ~> Ghost;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R1"));
  });

  it("accepts flow referencing a reservoir by name", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x3FF]
      .node Src @ 0x001 { type: ALU_ADD; }
      @reservoir Out @ 0x300 {
        arity: 1; handshake: PATH_HASH; on_dry: self.purge();
      }
      Out <~ Src;
    `);
    const r1errors = result.errors.filter(d => d.rule === "R1");
    assert.equal(r1errors.length, 0, "Reservoir reference should be valid");
  });
});

// ---------------------------------------------------------------------------
// R5 — nerve and flow layer enforcement
// ---------------------------------------------------------------------------

describe("R5 — layer enforcement", () => {
  it("errors when downstream <~ uses .cry on source", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
      .node B @ 0x002 { type: MERGE_GATE; }
      B <~ A.cry;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R5"));
  });

  it("errors when upstream ~> lacks .cry on source", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
      .node B @ 0x002 { type: MERGE_GATE; }
      A ~> B;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R5"));
    assert.ok(errorMessages(result).some(m => m.includes(".cry")));
  });

  it("errors when upstream ~> destination uses .cry", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
      .node B @ 0x002 { type: MERGE_GATE; }
      A.cry ~> B.cry;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R5"));
  });

  it("accepts correct upstream ~> with .cry on source only", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
      .node B @ 0x002 { type: MERGE_GATE; }
      A.cry ~> B;
    `);
    assert.ok(!hasError(result, "R5"));
  });

  it("accepts TRUE/FALSE accessors on downstream flow source", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Gate @ 0x001 { type: SWITCH_GATE; }
      .node Dest @ 0x002 { type: MERGE_GATE; }
      Dest <~ Gate.TRUE;
    `);
    assert.ok(!hasError(result, "R5"));
  });
});

// ---------------------------------------------------------------------------
// R7 — constraint references
// ---------------------------------------------------------------------------

describe("R7 — constraint references", () => {
  it("errors when constraint portA references undefined node", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node B @ 0x002 { type: MERGE_GATE; }
      #constraint max_dist(Ghost.cry, B) < 1.5mm;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R7"));
    assert.ok(errorMessages(result).some(m => m.includes("Ghost")));
  });

  it("errors when constraint portB references undefined node", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
      #constraint max_dist(A.cry, Ghost) < 1.5mm;
    `);
    assert.ok(!result.ok);
    assert.ok(hasError(result, "R7"));
  });

  it("warns when constraint distance exceeds 2.0mm", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
      .node B @ 0x002 { type: MERGE_GATE; }
      #constraint max_dist(A.cry, B) < 3.0mm;
    `);
    assert.ok(hasWarning(result, "R7"), "Expected R7 warning for distance > 2.0mm");
    assert.ok(warningMessages(result).some(m => m.includes("2.0mm")));
  });

  it("accepts valid constraint within 2.0mm", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
      .node B @ 0x002 { type: MERGE_GATE; }
      #constraint max_dist(A.cry, B) < 1.5mm;
    `);
    assert.ok(!hasError(result, "R7"));
    assert.ok(!hasWarning(result, "R7"));
  });
});

// ---------------------------------------------------------------------------
// Result structure
// ---------------------------------------------------------------------------

describe("Result structure", () => {
  it("ok is true when there are only warnings", () => {
    // No epoch = warning only
    const result = check(`
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
    `);
    assert.equal(result.ok, true, "ok should be true with warnings only");
    assert.ok(result.warnings.length > 0);
    assert.equal(result.errors.length, 0);
  });

  it("ok is false when there is at least one error", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Dup @ 0x001 { type: ALU_ADD; }
      .node Dup @ 0x002 { type: ALU_SUB; }
    `);
    assert.equal(result.ok, false);
  });

  it("diagnostics array contains both errors and warnings", () => {
    // No epoch (warning) + duplicate name (error)
    const result = check(`
      .sector Alpha [0x000-0x1FF]
      .node X @ 0x001 { type: ALU_ADD; }
      .node X @ 0x002 { type: ALU_SUB; }
    `);
    assert.ok(result.diagnostics.some(d => d.severity === "error"));
    assert.ok(result.diagnostics.some(d => d.severity === "warning"));
  });

  it("diagnostics are ordered with errors before warnings", () => {
    const result = check(`
      .node X @ 0x001 { type: ALU_ADD; }
      .node X @ 0x002 { type: ALU_SUB; }
    `);
    assert.equal(result.diagnostics[0]!.severity, "error");
  });

  it("R1 message includes undefined node name", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Dest @ 0x001 { type: ALU_ADD; }
      Dest <~ Ghost;
    `);
    assert.ok(errorMessages(result).some(m => m.includes("Undefined node 'Ghost'")));
  });

  it("R2 message includes duplicate node name", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Foo @ 0x001 { type: ALU_ADD; }
      .node Foo @ 0x002 { type: ALU_SUB; }
    `);
    assert.ok(errorMessages(result).some(m => m.includes("Duplicate node name 'Foo'")));
  });

  it("R3 message includes duplicate address", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Foo @ 0x010 { type: ALU_ADD; }
      .node Bar @ 0x010 { type: ALU_SUB; }
    `);
    assert.ok(errorMessages(result).some(m => m.includes("Address collision")));
  });

  it("every diagnostic has a rule, message, and severity", () => {
    const result = check(`
      .sector Alpha [0x000-0x1FF]
      .node X @ 0x001 { type: ALU_ADD; }
      .node X @ 0x001 { type: ALU_ADD; }
    `);
    for (const d of result.diagnostics) {
      assert.ok(d.rule,     `Diagnostic missing 'rule': ${JSON.stringify(d)}`);
      assert.ok(d.message,  `Diagnostic missing 'message': ${JSON.stringify(d)}`);
      assert.ok(d.severity, `Diagnostic missing 'severity': ${JSON.stringify(d)}`);
    }
  });
});

// ---------------------------------------------------------------------------
// R4 — missing reservoir
// ---------------------------------------------------------------------------

describe("R4 — missing reservoir", () => {
  it("errors when flows exist without a reservoir", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node A @ 0x001 { type: ALU_ADD; }
      .node B @ 0x002 { type: MERGE_GATE; }
      B <~ A;
    `);
    assert.ok(hasError(result, "R4"));
  });
});

// ---------------------------------------------------------------------------
// R8 — SWITCH_GATE branch coverage
// ---------------------------------------------------------------------------

describe("R8 — SWITCH_GATE branch coverage", () => {
  it("warns when TRUE branch is missing", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Gate @ 0x001 { type: SWITCH_GATE; }
      .node Dest @ 0x002 { type: MERGE_GATE; }
      @reservoir Out @ 0x0100 { arity: 1; handshake: PATH_HASH; on_dry: self.purge(); }
      Dest <~ Gate.FALSE;
    `);
    assert.ok(hasWarning(result, "R8"));
  });

  it("warns when FALSE branch is missing", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Gate @ 0x001 { type: SWITCH_GATE; }
      .node Dest @ 0x002 { type: MERGE_GATE; }
      @reservoir Out @ 0x0100 { arity: 1; handshake: PATH_HASH; on_dry: self.purge(); }
      Dest <~ Gate.TRUE;
    `);
    assert.ok(hasWarning(result, "R8"));
  });

  it("no warnings when both branches exist", () => {
    const result = check(`
      .epoch 0x1
      .sector Alpha [0x000-0x1FF]
      .node Gate @ 0x001 { type: SWITCH_GATE; }
      .node T @ 0x002 { type: MERGE_GATE; }
      .node F @ 0x003 { type: MERGE_GATE; }
      @reservoir Out @ 0x0100 { arity: 1; handshake: PATH_HASH; on_dry: self.purge(); }
      T <~ Gate.TRUE;
      F <~ Gate.FALSE;
    `);
    assert.ok(!hasWarning(result, "R8"));
  });
});
