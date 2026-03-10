/**
 * RIVER-LANG LSP — src/server.test.ts
 * Unit tests for lexer, parser, and analyser.
 * Uses Node's built-in test runner (node --test).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize }  from '../src/lexer';
import { parse }     from '../src/parser';
import { analyse }   from '../src/analyser';
import { TokenKind } from '../src/types';

// ── Canonical Fibonacci program ────────────────────────────────────────────────

const FIBONACCI_RASM = `
// RIVER-LANG Fibonacci — Circular Canal
.epoch 0x52495645;

.sector Alpha [0x000 - 0x1FF];
.sector Beta  [0x200 - 0x3FF];

.node Seed_Gen @ 0x00A0 {
  type: TOKEN_GEN;
  tag: FIBONACCI;
  sector: Alpha;
}

.node Feedback_Merge @ 0x00B4 {
  type: MERGE_GATE;
  fire_on: BOTH;
  sector: Alpha;
}

.node Fibonacci_Adder @ 0x00C8 {
  type: ALU_ADD;
  sector: Alpha;
}

.node Counter_Sub @ 0x00D2 {
  type: ALU_SUB;
  sector: Alpha;
}

.node Exit_Gate @ 0x0210 {
  type: COND_GATE;
  sector: Beta;
}

@reservoir Final_Output @ 0x0300 {
  arity: 1;
  handshake: true;
  on_dry: self.purge();
}

// Downstream flows
Feedback_Merge <~ Seed_Gen;
Fibonacci_Adder <~ Feedback_Merge;
Counter_Sub <~ Seed_Gen;
Exit_Gate <~ Fibonacci_Adder;
Exit_Gate <~ Counter_Sub;
Feedback_Merge <~ Exit_Gate.TRUE;
Final_Output <~ Exit_Gate.FALSE;

// Upstream nerves
Fibonacci_Adder.cry ~> Feedback_Merge;
Feedback_Merge.cry ~> Seed_Gen;

// Constraints
#constraint max_dist(Fibonacci_Adder.cry, Feedback_Merge) <= 1.5mm;
#constraint max_dist(Feedback_Merge.cry, Seed_Gen) <= 1.5mm;
`;

// ────────────────────────────────────────────────────────────────────────────
// LEXER
// ────────────────────────────────────────────────────────────────────────────

describe('Lexer', () => {

  it('tokenises .epoch directive', () => {
    const { tokens } = tokenize('.epoch 0x52495645;');
    assert.equal(tokens[0].kind, TokenKind.DotEpoch);
    assert.equal(tokens[1].kind, TokenKind.HexNumber);
    assert.equal(tokens[1].text, '0x52495645');
    assert.equal(tokens[2].kind, TokenKind.Semicolon);
  });

  it('tokenises FlowDown <~', () => {
    const { tokens } = tokenize('A <~ B;');
    const ops = tokens.filter(t => t.kind === TokenKind.FlowDown);
    assert.equal(ops.length, 1);
    assert.equal(ops[0].text, '<~');
  });

  it('tokenises FlowUp ~>', () => {
    const { tokens } = tokenize('A.cry ~> B;');
    const ops = tokens.filter(t => t.kind === TokenKind.FlowUp);
    assert.equal(ops.length, 1);
  });

  it('tokenises .node directive', () => {
    const { tokens } = tokenize('.node Foo @ 0x001 {}');
    assert.equal(tokens[0].kind, TokenKind.DotNode);
    assert.equal(tokens[1].kind, TokenKind.Identifier);
    assert.equal(tokens[1].text, 'Foo');
  });

  it('tokenises @reservoir', () => {
    const { tokens } = tokenize('@reservoir R @ 0x300 {}');
    assert.equal(tokens[0].kind, TokenKind.Reservoir);
    assert.equal(tokens[0].text, '@reservoir');
  });

  it('tokenises port accessors', () => {
    const { tokens } = tokenize('A.cry A.TRUE A.FALSE A.out');
    const accessors = tokens.filter(t =>
      t.kind === TokenKind.DotCry || t.kind === TokenKind.DotTrue ||
      t.kind === TokenKind.DotFalse || t.kind === TokenKind.DotOut
    );
    assert.equal(accessors.length, 4);
  });

  it('tokenises self.purge() as single token', () => {
    const { tokens } = tokenize('self.purge()');
    assert.equal(tokens[0].kind, TokenKind.SelfPurge);
    assert.equal(tokens[0].text, 'self.purge()');
  });

  it('tokenises hex numbers', () => {
    const { tokens } = tokenize('0x52495645');
    assert.equal(tokens[0].kind, TokenKind.HexNumber);
  });

  it('tokenises float with mm suffix', () => {
    const { tokens } = tokenize('1.5mm');
    assert.equal(tokens[0].kind, TokenKind.FloatMm);
    assert.equal(tokens[0].text, '1.5mm');
  });

  it('skips line comments', () => {
    const { tokens } = tokenize('// this is a comment\n.epoch 0x1;');
    assert.equal(tokens[0].kind, TokenKind.DotEpoch);
  });

  it('tokenises # + constraint as two tokens', () => {
    const { tokens } = tokenize('#constraint max_dist');
    assert.equal(tokens[0].kind, TokenKind.Hash);
    assert.equal(tokens[1].kind, TokenKind.KwConstraint);
  });

  it('produces no errors on Fibonacci program', () => {
    const { errors } = tokenize(FIBONACCI_RASM);
    assert.equal(errors.length, 0, `Lex errors: ${errors.map(e=>e.message).join(', ')}`);
  });

  it('Fibonacci program has 7 FlowDown tokens', () => {
    const { tokens } = tokenize(FIBONACCI_RASM);
    const flows = tokens.filter(t => t.kind === TokenKind.FlowDown);
    assert.equal(flows.length, 7);
  });

  it('Fibonacci program has 2 FlowUp tokens', () => {
    const { tokens } = tokenize(FIBONACCI_RASM);
    const nerves = tokens.filter(t => t.kind === TokenKind.FlowUp);
    assert.equal(nerves.length, 2);
  });

  it('tracks line numbers correctly', () => {
    const { tokens } = tokenize('.epoch 0x1;\n.sector');
    const sectorTok = tokens.find(t => t.kind === TokenKind.DotSector)!;
    assert.equal(sectorTok.start.line, 1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// PARSER
// ────────────────────────────────────────────────────────────────────────────

describe('Parser', () => {

  it('parses epoch', () => {
    const { tokens } = tokenize('.epoch 0x52495645;');
    const { ast } = parse(tokens);
    assert.equal(ast.epoch, 0x52495645);
  });

  it('parses sector', () => {
    const { tokens } = tokenize('.sector Alpha [0x000 - 0x1FF];');
    const { ast } = parse(tokens);
    assert.equal(ast.sectors.length, 1);
    assert.equal(ast.sectors[0].name, 'Alpha');
    assert.equal(ast.sectors[0].start, 0x000);
    assert.equal(ast.sectors[0].end, 0x1FF);
  });

  it('parses node with all fields', () => {
    const src = `.node Foo @ 0x00A0 { type: TOKEN_GEN; tag: X; fire_on: ALL; sector: Alpha; }`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    assert.equal(ast.nodes.length, 1);
    const n = ast.nodes[0];
    assert.equal(n.name, 'Foo');
    assert.equal(n.address, 0x00A0);
    assert.equal(n.nodeType, 'TOKEN_GEN');
    assert.equal(n.tag, 'X');
    assert.equal(n.sector, 'Alpha');
  });

  it('parses reservoir', () => {
    const src = `@reservoir R @ 0x0300 { arity: 1; handshake: true; on_dry: self.purge(); }`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    assert.ok(ast.reservoir);
    assert.equal(ast.reservoir!.name, 'R');
    assert.equal(ast.reservoir!.arity, 1);
    assert.equal(ast.reservoir!.handshake, true);
  });

  it('parses downstream flow A <~ B', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type: T;}\n.node B @ 0x2 {type: T;}\nA <~ B;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    assert.equal(ast.flows.length, 1);
    assert.equal(ast.flows[0].from.node, 'B');
    assert.equal(ast.flows[0].to.node, 'A');
  });

  it('parses upstream nerve A.cry ~> B', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type: T;}\n.node B @ 0x2 {type: T;}\nA.cry ~> B;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    assert.equal(ast.nerves.length, 1);
    assert.equal(ast.nerves[0].from.accessor, 'cry');
  });

  it('parses port accessors .TRUE and .FALSE', () => {
    const src = `.epoch 0x1;\n.node Gate @ 0x1 {type: T;}\n.node A @ 0x2 {type: T;}\n.node B @ 0x3 {type: T;}\nA <~ Gate.TRUE;\nB <~ Gate.FALSE;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    assert.equal(ast.flows[0].from.accessor, 'TRUE');
    assert.equal(ast.flows[1].from.accessor, 'FALSE');
  });

  it('parses #constraint', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\n.node B @ 0x2 {type:T;}\n#constraint max_dist(A.cry, B) <= 1.5mm;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    assert.equal(ast.constraints.length, 1);
    assert.equal(ast.constraints[0].value, 1.5);
    assert.equal(ast.constraints[0].unit, 'mm');
    assert.equal(ast.constraints[0].op, '<=');
  });

  it('parses #constraint with < operator', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\n.node B @ 0x2 {type:T;}\n#constraint max_dist(A.cry, B) < 1.5mm;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    assert.equal(ast.constraints.length, 1);
    assert.equal(ast.constraints[0].op, '<');
    assert.equal(ast.constraints[0].value, 1.5);
  });

  it('parses full Fibonacci program without parse errors', () => {
    const { tokens } = tokenize(FIBONACCI_RASM);
    const { ast, diags } = parse(tokens);
    assert.equal(diags.length, 0, `Parse errors: ${diags.map(d=>d.message).join('; ')}`);
    assert.equal(ast.nodes.length, 5);
    assert.equal(ast.flows.length, 7);
    assert.equal(ast.nerves.length, 2);
    assert.equal(ast.constraints.length, 2);
    assert.ok(ast.reservoir);
  });

  it('Fibonacci: Exit_Gate.TRUE flows to Feedback_Merge', () => {
    const { tokens } = tokenize(FIBONACCI_RASM);
    const { ast } = parse(tokens);
    const trueFlow = ast.flows.find(f => f.from.node === 'Exit_Gate' && f.from.accessor === 'TRUE');
    assert.ok(trueFlow);
    assert.equal(trueFlow!.to.node, 'Feedback_Merge');
  });

  it('Fibonacci: Exit_Gate.FALSE flows to Final_Output', () => {
    const { tokens } = tokenize(FIBONACCI_RASM);
    const { ast } = parse(tokens);
    const falseFlow = ast.flows.find(f => f.from.node === 'Exit_Gate' && f.from.accessor === 'FALSE');
    assert.ok(falseFlow);
    assert.equal(falseFlow!.to.node, 'Final_Output');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ANALYSER
// ────────────────────────────────────────────────────────────────────────────

describe('Analyser', () => {

  it('R0 — warns on missing epoch', () => {
    const { tokens } = tokenize('.node A @ 0x1 {type:T;}');
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R0'));
  });

  it('R0 — no warning when epoch present', () => {
    const { tokens } = tokenize('.epoch 0x1; .node A @ 0x1 {type:T;}');
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(!diags.some(d => d.rule === 'R0'));
  });

  it('R1 — errors on undefined node in flow', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\nA <~ Ghost;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R1' && d.message.includes('Ghost')));
  });

  it('R2 — errors on duplicate node names', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\n.node A @ 0x2 {type:T;}`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R2'));
  });

  it('R3 — errors on duplicate addresses', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\n.node B @ 0x1 {type:T;}`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R3'));
  });

  it('R5 — errors when nerve source lacks .cry', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\n.node B @ 0x2 {type:T;}\nA ~> B;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    // Manually inject a nerve without .cry to test R5
    ast.nerves.push({
      from: { node: 'A', accessor: undefined },
      to:   { node: 'B' },
      span: { start: { line: 3, column: 0, offset: 0 }, end: { line: 3, column: 6, offset: 6 } },
    });
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R5'));
  });

  it('R6 — errors when node address outside sector', () => {
    const src = `.epoch 0x1;\n.sector Alpha [0x000 - 0x0FF];\n.node A @ 0x200 {type:T;}`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R6'));
  });

  it('R6 — passes when node address within sector boundary', () => {
    const src = `.epoch 0x1;\n.sector Alpha [0x000 - 0x1FF];\n.node A @ 0x000 {type:T;}\n.node B @ 0x1FF {type:T;}`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(!diags.some(d => d.rule === 'R6'));
  });

  it('R6 — warns when no sectors are declared', () => {
    const src = `.epoch 0x1;\n.node A @ 0x001 {type:T;}`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R6' && d.severity === 'warning'));
  });

  it('R7 — warns when constraint exceeds 2.0mm', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\n.node B @ 0x2 {type:T;}\n#constraint max_dist(A.cry, B) <= 2.5mm;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R7' && d.severity === 'warning'));
  });

  it('R7 — accepts constraint at exactly 2.0mm', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\n.node B @ 0x2 {type:T;}\n#constraint max_dist(A.cry, B) <= 2.0mm;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(!diags.some(d => d.rule === 'R7'));
  });

  it('R7 — errors on undefined node in constraint', () => {
    const src = `.epoch 0x1;\n.node A @ 0x1 {type:T;}\n#constraint max_dist(A.cry, Ghost) <= 1.0mm;`;
    const { tokens } = tokenize(src);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    assert.ok(diags.some(d => d.rule === 'R7' && d.severity === 'error' && d.message.includes('Ghost')));
  });

  it('symbol table contains all nodes', () => {
    const { tokens } = tokenize(FIBONACCI_RASM);
    const { ast } = parse(tokens);
    const { symbols } = analyse(ast);
    assert.ok(symbols.has('Seed_Gen'));
    assert.ok(symbols.has('Feedback_Merge'));
    assert.ok(symbols.has('Fibonacci_Adder'));
    assert.ok(symbols.has('Exit_Gate'));
    assert.ok(symbols.has('Final_Output'));
  });

  it('symbol table contains sectors', () => {
    const { tokens } = tokenize(FIBONACCI_RASM);
    const { ast } = parse(tokens);
    const { symbols } = analyse(ast);
    assert.ok(symbols.has('Alpha'));
    assert.ok(symbols.has('Beta'));
  });

  it('Fibonacci program passes with zero errors', () => {
    const { tokens } = tokenize(FIBONACCI_RASM);
    const { ast } = parse(tokens);
    const { diags } = analyse(ast);
    const errors = diags.filter(d => d.severity === 'error');
    assert.equal(errors.length, 0, `Errors: ${errors.map(d=>`[${d.rule}] ${d.message}`).join('; ')}`);
  });
});
