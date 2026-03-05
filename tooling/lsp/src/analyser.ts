/**
 * RIVER-LANG LSP — src/analyser.ts
 *
 * Semantic analysis on top of the parsed AST.
 * Mirrors the TypeChecker rules (R0–R7) from the compiler frontend
 * and adds LSP-specific extras (hover detail, completion context).
 *
 * Rules:
 *   R0 — .epoch must be present and non-zero
 *   R1 — No undefined node references in flows, nerves, constraints
 *   R2 — No duplicate node names (includes reservoir collision)
 *   R3 — No duplicate physical addresses
 *   R4 — Reservoir must be declared if referenced in flows
 *   R5 — Nerve (.cry ~>) source must use .cry accessor
 *   R6 — Node address must fall within a declared sector
 *   R7 — Constraint distance <= 2.0mm, nodes must exist
 */

import { ChannelGraphAst, AstNode, LspDiag, Symbol, SymbolKind, Span, PortRef } from './types';

export interface AnalysisResult {
  diags:   LspDiag[];
  symbols: Map<string, Symbol>;
}

export function analyse(ast: ChannelGraphAst): AnalysisResult {
  const diags:   LspDiag[]         = [];
  const symbols: Map<string, Symbol> = new Map();

  // ── Build symbol table ────────────────────────────────────────────────────

  // Nodes
  const nodeAddrs = new Map<number, string>(); // address → first node name
  for (const node of ast.nodes) {
    if (symbols.has(node.name)) {
      diags.push({
        severity: 'error', rule: 'R2',
        message:  `Duplicate node name '${node.name}'`,
        hint:     'Each node name must be unique within the channel graph',
        span:     node.span,
      });
    } else {
      symbols.set(node.name, {
        name: node.name, kind: 'node', span: node.span,
        address: node.address,
        detail: `${node.nodeType} @ 0x${node.address.toString(16).toUpperCase().padStart(4, '0')}`,
      });
    }

    // R3 — duplicate address
    if (nodeAddrs.has(node.address)) {
      diags.push({
        severity: 'error', rule: 'R3',
        message:  `Duplicate physical address 0x${node.address.toString(16).toUpperCase().padStart(4, '0')} — also used by '${nodeAddrs.get(node.address)}'`,
        hint:     'Each node must have a unique physical address on chip',
        span:     node.span,
      });
    } else {
      nodeAddrs.set(node.address, node.name);
    }
  }

  // Sectors
  for (const sec of ast.sectors) {
    symbols.set(sec.name, {
      name: sec.name, kind: 'sector', span: sec.span,
      address: sec.start,
      detail: `sector [0x${sec.start.toString(16).toUpperCase()}-0x${sec.end.toString(16).toUpperCase()}]`,
    });
  }

  // Reservoir
  if (ast.reservoir) {
    const res = ast.reservoir;
    if (symbols.has(res.name)) {
      diags.push({
        severity: 'error', rule: 'R2',
        message:  `'${res.name}' is already declared as a node`,
        hint:     'Reservoir name must not clash with any node name',
        span:     res.span,
      });
    } else {
      symbols.set(res.name, {
        name: res.name, kind: 'reservoir', span: res.span,
        address: res.address,
        detail:  `reservoir @ 0x${res.address.toString(16).toUpperCase().padStart(4, '0')} arity:${res.arity}`,
      });
      if (nodeAddrs.has(res.address)) {
        diags.push({
          severity: 'error', rule: 'R3',
          message:  `Reservoir address 0x${res.address.toString(16).toUpperCase()} conflicts with node '${nodeAddrs.get(res.address)}'`,
          span:     res.span,
        });
      }
    }
  }

  // ── R0 — epoch ────────────────────────────────────────────────────────────

  if (ast.epoch === 0) {
    // Use a fake zero-span for file-level warnings
    const zeroSpan: Span = { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } };
    diags.push({
      severity: 'warning', rule: 'R0',
      message:  '.epoch is missing or zero',
      hint:     'Add ".epoch 0x<EPOCH_ID>;" at the top of the file. The EPOCH_ID must match the hardware epoch register.',
      span:     zeroSpan,
    });
  }

  // ── R1 — undefined references ─────────────────────────────────────────────

  const allNames = new Set(symbols.keys());

  function checkRef(ref: PortRef, span: Span, context: string, rule: string): void {
    if (!allNames.has(ref.node)) {
      diags.push({
        severity: 'error', rule,
        message:  `Undefined node '${ref.node}' in ${context}`,
        hint:     `Declare '.node ${ref.node} @ 0x???? { type: ...; }'`,
        span,
      });
    }
  }

  for (const flow of ast.flows) {
    checkRef(flow.from, flow.span, 'flow', 'R1');
    checkRef(flow.to,   flow.span, 'flow', 'R1');

    // Downstream flow must not use .cry on either endpoint.
    if (flow.from.accessor === 'cry' || flow.to.accessor === 'cry') {
      diags.push({
        severity: 'error', rule: 'R5',
        message:  `Downstream flow '<~' cannot use '.cry' accessor (${flow.from.node} -> ${flow.to.node})`,
        hint:     "Use '~>' for upstream Cry wiring, or remove '.cry' from downstream flow endpoints.",
        span:     flow.span,
      });
    }
  }
  for (const nerve of ast.nerves) {
    checkRef(nerve.from, nerve.span, 'nerve', 'R1');
    checkRef(nerve.to,   nerve.span, 'nerve', 'R1');
  }
  for (const c of ast.constraints) {
    checkRef(c.portA, c.span, 'constraint', 'R7');
    checkRef(c.portB, c.span, 'constraint', 'R7');
  }

  // R4 — reservoir referenced in flows but not declared
  const referencedNames = new Set([
    ...ast.flows.flatMap(f => [f.from.node, f.to.node]),
    ...ast.nerves.flatMap(f => [f.from.node, f.to.node]),
  ]);

  if (!ast.reservoir && referencedNames.size > 0) {
    const zeroSpan: Span = { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } };
    // Check if any referenced name doesn't appear in nodes (possible missing reservoir)
    for (const name of referencedNames) {
      if (!symbols.has(name)) continue; // already caught by R1
      if (symbols.get(name)!.kind === 'reservoir') {
        diags.push({
          severity: 'error', rule: 'R4',
          message:  `'${name}' is used as a flow endpoint but no @reservoir is declared`,
          hint:     'Add "@reservoir <name> @ 0x???? { arity: 1; }"',
          span:     zeroSpan,
        });
      }
    }
  }

  // ── R5 — nerve source must use .cry ──────────────────────────────────────

  for (const nerve of ast.nerves) {
    if (nerve.from.accessor !== 'cry') {
      diags.push({
        severity: 'error', rule: 'R5',
        message:  `Nerve connection from '${nerve.from.node}' must use the .cry port`,
        hint:     `Change to '${nerve.from.node}.cry ~> ${nerve.to.node};'`,
        span:     nerve.span,
      });
    }

    if (nerve.to.accessor === 'cry') {
      diags.push({
        severity: 'error', rule: 'R5',
        message:  `Nerve destination '${nerve.to.node}.cry' is invalid`,
        hint:     `Cry signals terminate at the node input: '${nerve.from.node}.cry ~> ${nerve.to.node};'`,
        span:     nerve.span,
      });
    }
  }

  // ── R6 — node addresses within sector bounds ──────────────────────────────

  if (ast.sectors.length > 0) {
    for (const node of ast.nodes) {
      const inSector = ast.sectors.some(s => node.address >= s.start && node.address <= s.end);
      if (!inSector) {
        const ranges = ast.sectors.map(s =>
          `${s.name} [0x${s.start.toString(16).toUpperCase()}-0x${s.end.toString(16).toUpperCase()}]`
        ).join(', ');
        diags.push({
          severity: 'error', rule: 'R6',
          message:  `Node '${node.name}' address 0x${node.address.toString(16).toUpperCase().padStart(4,'0')} is outside all sector ranges`,
          hint:     `Valid sectors: ${ranges}`,
          span:     node.span,
        });
      }
    }
    // Reservoir address check
    if (ast.reservoir) {
      const res = ast.reservoir;
      const inSector = ast.sectors.some(s => res.address >= s.start && res.address <= s.end);
      if (!inSector) {
        diags.push({
          severity: 'error', rule: 'R6',
          message:  `Reservoir '${res.name}' address 0x${res.address.toString(16).toUpperCase()} is outside all sector ranges`,
          span:     res.span,
        });
      }
    }
  } else {
    const zeroSpan: Span = { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } };
    diags.push({
      severity: 'warning', rule: 'R6',
      message:  'No .sector declarations found',
      hint:     "Add at least one '.sector Name [0xSTART-0xEND]' declaration.",
      span:     zeroSpan,
    });
  }

  // ── R7 — constraint distance and nodes ───────────────────────────────────

  for (const c of ast.constraints) {
    if (c.value <= 0) {
      diags.push({
        severity: 'error', rule: 'R7',
        message:  `Constraint distance must be > 0 (got ${c.value}${c.unit})`,
        span:     c.span,
      });
    } else if (c.value > 2.0) {
      diags.push({
        severity: 'warning', rule: 'R7',
        message:  `Constraint distance ${c.value}mm exceeds the 2.0mm Nerve hard limit`,
        hint:     'Cry signal cannot reach the upstream sluice within 12ns at this distance',
        span:     c.span,
      });
    }
  }

  return { diags, symbols };
}
