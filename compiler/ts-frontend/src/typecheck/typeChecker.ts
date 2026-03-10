// RIVER-LANG Compiler — Type Checker
// compiler/ts-frontend/src/typecheck/typeChecker.ts
//
// Validates semantic correctness of the ChannelGraphAst.
// The Parser checks syntax. The Type Checker checks meaning.
//
// Seven rules:
//   1. No undefined node references in flows, nerves, constraints
//   2. No duplicate node names
//   3. No duplicate physical addresses
//   4. Reservoir must be declared if referenced in flows
//   5. Nerve connections must originate from .cry port only
//   6. Every node address must fall within a declared sector range
//   7. Constraint node references must be declared

import {
  AstConstraint,
  AstFlow,
  AstNode,
  ChannelGraphAst,
  PortRef,
} from "../parser/ast.js";
import { ParseError } from "../parser/parser.js";

// ---------------------------------------------------------------------------
// Diagnostic — a typed error with location hint
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  rule:     string;          // e.g. "R1", "R3"
  message:  string;
  hint?:    string;          // suggestion for how to fix
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface TypeCheckResult {
  ok:          boolean;       // true only when zero errors (warnings allowed)
  diagnostics: Diagnostic[];
  errors:      Diagnostic[];
  warnings:    Diagnostic[];
}

// ---------------------------------------------------------------------------
// Type Checker
// ---------------------------------------------------------------------------

export class TypeChecker {
  private diagnostics: Diagnostic[] = [];

  // All declared names — nodes + reservoir (if present)
  private declaredNames  = new Set<string>();
  // name → address
  private nameToAddress  = new Map<string, number>();
  // address → name (for duplicate address detection)
  private addressToName  = new Map<number, string>();

  check(ast: ChannelGraphAst): TypeCheckResult {
    this.diagnostics = [];
    this.declaredNames.clear();
    this.nameToAddress.clear();
    this.addressToName.clear();

    // Build the symbol table first — needed for reference checks
    this.buildSymbolTable(ast);

    // Run all seven rules
    this.checkEpoch(ast);                          // R0 (prerequisite)
    this.checkDuplicateNames(ast);                 // R2
    this.checkDuplicateAddresses(ast);             // R3
    this.checkSectorCoverage(ast);                 // R6
    this.checkReservoirPresence(ast);             // R4
    this.checkFlowReferences(ast.flows, ast);      // R1, R4
    this.checkNerveReferences(ast.nerves);         // R1, R5
    this.checkConstraintReferences(ast.constraints); // R7
    this.checkSwitchGateCoverage(ast);            // R8

    const errors   = this.diagnostics.filter(d => d.severity === "error");
    const warnings = this.diagnostics.filter(d => d.severity === "warning");
    const orderedDiagnostics = [...errors, ...warnings];

    return {
      ok:          errors.length === 0,
      diagnostics: orderedDiagnostics,
      errors,
      warnings,
    };
  }

  // ── Symbol table construction ─────────────────────────────────────────────

  private buildSymbolTable(ast: ChannelGraphAst): void {
    for (const node of ast.nodes) {
      this.declaredNames.add(node.name);
      this.nameToAddress.set(node.name, node.address);
    }
    if (ast.reservoir) {
      this.declaredNames.add(ast.reservoir.name);
      this.nameToAddress.set(ast.reservoir.name, ast.reservoir.address);
    }
  }

  // ── R0: .epoch must be present and non-zero ───────────────────────────────

  private checkEpoch(ast: ChannelGraphAst): void {
    if (!ast.epoch) {
      this.warn(
        "R0",
        "Missing or zero .epoch declaration.",
        "Add '.epoch 0x<RIVE_SEED>' at the top of the program. " +
        "The epoch binds all Salted Hashes to this execution context."
      );
    }
  }

  // ── R2: No duplicate node names ───────────────────────────────────────────

  private checkDuplicateNames(ast: ChannelGraphAst): void {
    const seen = new Map<string, number>();  // name → first-seen address

    for (const node of ast.nodes) {
      if (seen.has(node.name)) {
        this.error(
          "R2",
          `Duplicate node name '${node.name}'.`,
          `Node '${node.name}' is declared more than once. ` +
          `Each node must have a unique name — the Geologist uses the name ` +
          `as a key when computing Salted Hashes.`
        );
      } else {
        seen.set(node.name, node.address);
      }
    }

    // Reservoir name must not clash with any node name
    if (ast.reservoir) {
      if (seen.has(ast.reservoir.name)) {
        this.error(
          "R2",
          `Reservoir name '${ast.reservoir.name}' conflicts with a node of the same name.`,
          `Rename either the @reservoir or the .node to avoid the collision.`
        );
      }
    }
  }

  // ── R3: No duplicate physical addresses ───────────────────────────────────

  private checkDuplicateAddresses(ast: ChannelGraphAst): void {
    const seen = new Map<number, string>();  // address → first owner name

    const checkAddr = (name: string, addr: number) => {
      const hex = `0x${addr.toString(16).toUpperCase().padStart(4, "0")}`;
      if (seen.has(addr)) {
        const first = seen.get(addr)!;
        this.error(
          "R3",
          `Address collision at ${hex}: both '${first}' and '${name}' map to the same physical address.`,
          `Every node must occupy a unique physical coordinate. ` +
          `Change one of the '@' addresses so each node has its own wire.`
        );
      } else {
        seen.set(addr, name);
      }
    };

    for (const node of ast.nodes)   checkAddr(node.name, node.address);
    if (ast.reservoir)               checkAddr(ast.reservoir.name, ast.reservoir.address);
  }

  // ── R6: Every node address must fall within a declared sector ─────────────

  private checkSectorCoverage(ast: ChannelGraphAst): void {
    if (ast.sectors.length === 0) {
      // No sectors declared — warn but don't block (useful during early dev)
      this.warn(
        "R6",
        "No .sector declarations found.",
        "Add at least one '.sector Name [0xSTART-0xEND]' to define the " +
        "physical address space. The Geologist requires sector bounds to " +
        "validate PPM frame routing."
      );
      return;
    }

    const inAnySector = (addr: number): boolean =>
      ast.sectors.some(s => addr >= s.start && addr <= s.end);

    const checkCoverage = (name: string, addr: number) => {
      if (!inAnySector(addr)) {
        const hex = `0x${addr.toString(16).toUpperCase().padStart(4, "0")}`;
        const ranges = ast.sectors
          .map(s =>
            `${s.name} [0x${s.start.toString(16).toUpperCase()}-` +
            `0x${s.end.toString(16).toUpperCase()}]`
          )
          .join(", ");
        this.error(
          "R6",
          `Node '${name}' at address ${hex} is outside all declared sector ranges.`,
          `Declared sectors: ${ranges}. Either add a sector that covers ${hex} ` +
          `or move the node to an address within an existing sector.`
        );
      }
    };

    for (const node of ast.nodes)   checkCoverage(node.name, node.address);
    if (ast.reservoir)               checkCoverage(ast.reservoir.name, ast.reservoir.address);
  }

  // ── R1 + R4: Flow reference checks ───────────────────────────────────────

  private checkFlowReferences(flows: AstFlow[], ast: ChannelGraphAst): void {
    for (const flow of flows) {
      this.checkPortRef(flow.from, "flow source", "R1");
      this.checkPortRef(flow.to,   "flow destination", "R1");

      // R4: if the destination is a name that looks like a reservoir,
      // verify @reservoir was actually declared
      if (flow.to.node === ast.reservoir?.name) {
        // Fine — reservoir is declared
      } else if (!ast.nodes.some(n => n.name === flow.to.node)) {
        // Already caught by R1 checkPortRef above
      }

      // Downstream flows must NOT use .cry accessor on source or destination
      if (flow.from.accessor === "cry" || flow.to.accessor === "cry") {
        this.error(
          "R5",
          `Downstream flow '<~' cannot use '.cry' accessor ` +
          `(from: '${this.portStr(flow.from)}', to: '${this.portStr(flow.to)}').`,
          `'.cry' is a Layer 3 (Nerve) port. Use '~>' for upstream connections. ` +
          `Downstream '<~' operates only on Layer 1 (Blood).`
        );
      }
    }
  }

  // ── R4: @reservoir must exist when any flow is present ───────────────────

  private checkReservoirPresence(ast: ChannelGraphAst): void {
    if (ast.flows.length > 0 && !ast.reservoir) {
      this.error(
        "R4",
        "Missing @reservoir declaration.",
        "Define a reservoir with '@reservoir Name @ 0xADDR { ... }' before using flows."
      );
    }
  }

  // ── R5: Nerve connections must originate from .cry port ──────────────────

  private checkNerveReferences(nerves: AstFlow[]): void {
    for (const nerve of nerves) {
      this.checkPortRef(nerve.from, "nerve source", "R1");
      this.checkPortRef(nerve.to,   "nerve destination", "R1");

      // R5: upstream ~> must have .cry on the source
      if (nerve.from.accessor !== "cry") {
        this.error(
          "R5",
          `Upstream flow '~>' from '${this.portStr(nerve.from)}' is missing the '.cry' port accessor.`,
          `Nerve connections must originate from the '.cry' port: ` +
          `write '${nerve.from.node}.cry ~> ${nerve.to.node}' instead.`
        );
      }

      // R5: destination of ~> must NOT have .cry (Cry signals go TO a node, not its cry port)
      if (nerve.to.accessor === "cry") {
        this.error(
          "R5",
          `Upstream flow '~>' destination '${this.portStr(nerve.to)}' ` +
          `incorrectly uses '.cry'. Cry signals are received by the node itself, ` +
          `not its cry port.`,
          `Write '${nerve.from.node}.cry ~> ${nerve.to.node}' (no accessor on destination).`
        );
      }
    }
  }

  // ── R7: Constraint node references must be declared ──────────────────────

  private checkConstraintReferences(constraints: AstConstraint[]): void {
    for (const c of constraints) {
      this.checkPortRef(c.portA, "constraint portA", "R7");
      this.checkPortRef(c.portB, "constraint portB", "R7");

      // Constraint distance sanity check
      if (c.value <= 0) {
        this.error(
          "R7",
          `Constraint distance must be positive, got ${c.value}${c.unit}.`,
          `Specify a positive distance, e.g. '< 1.5mm'.`
        );
      }

      // Warn if distance exceeds the 2.0mm architectural hard limit
      if (c.value > 2.0 && c.unit === "mm") {
        this.warn(
          "R7",
          `Constraint '${c.fn}(${this.portStr(c.portA)}, ${this.portStr(c.portB)}) < ${c.value}mm' ` +
          `exceeds the 2.0mm architectural Nerve distance limit.`,
          `The hardware DRC enforces a 2.0mm maximum on all Nerve (Layer 3) paths. ` +
          `A constraint above 2.0mm will be rejected by the Geologist Spatial Mapper.`
        );
      }
    }
  }

  // ── R8: SWITCH_GATE requires both TRUE and FALSE branches ────────────────

  private checkSwitchGateCoverage(ast: ChannelGraphAst): void {
    const gates = ast.nodes.filter(n => n.nodeType === "SWITCH_GATE");
    if (gates.length === 0) return;

    for (const gate of gates) {
      const hasTrue = ast.flows.some(
        f => f.from.node === gate.name && f.from.accessor === "TRUE"
      );
      const hasFalse = ast.flows.some(
        f => f.from.node === gate.name && f.from.accessor === "FALSE"
      );

      if (!hasTrue) {
        this.warn(
          "R8",
          `SWITCH_GATE '${gate.name}' has no .TRUE branch flow.`,
          `Add a downstream flow like 'Dest <~ ${gate.name}.TRUE;'.`
        );
      }

      if (!hasFalse) {
        this.warn(
          "R8",
          `SWITCH_GATE '${gate.name}' has no .FALSE branch flow.`,
          `Add a downstream flow like 'Dest <~ ${gate.name}.FALSE;'.`
        );
      }
    }
  }

  // ── Shared: check that a PortRef resolves to a declared name ─────────────

  private checkPortRef(ref: PortRef, role: string, rule: string): void {
    if (!this.declaredNames.has(ref.node)) {
      this.error(
        rule,
        `Undefined node '${ref.node}' used as ${role}.`,
        `'${ref.node}' has not been declared with '.node' or '@reservoir'. ` +
        `Check spelling or add a declaration.`
      );
    }
  }

  // ── Diagnostic helpers ────────────────────────────────────────────────────

  private error(rule: string, message: string, hint?: string): void {
    this.diagnostics.push({ severity: "error", rule, message, hint });
  }

  private warn(rule: string, message: string, hint?: string): void {
    this.diagnostics.push({ severity: "warning", rule, message, hint });
  }

  private portStr(ref: PortRef): string {
    return ref.accessor ? `${ref.node}.${ref.accessor}` : ref.node;
  }
}

// ---------------------------------------------------------------------------
// Convenience export — matches scaffold usage: typeCheck(ast)
// ---------------------------------------------------------------------------

export function typeCheck(
  ast: ChannelGraphAst,
  parseErrors: ParseError[] = [],
): TypeCheckResult {
  return typeCheckWithParseErrors(ast, parseErrors);
}

export function typeCheckWithParseErrors(
  ast: ChannelGraphAst,
  parseErrors: ParseError[],
): TypeCheckResult {
  const base = new TypeChecker().check(ast);
  if (parseErrors.length === 0) {
    return base;
  }

  const parseDiags: Diagnostic[] = parseErrors.map(err => ({
    severity: "error",
    rule: "PARSE",
    message: err.message,
  }));

  const errors = [...parseDiags, ...base.errors];
  const warnings = [...base.warnings];
  const diagnostics = [...errors, ...warnings];

  return {
    ok: false,
    diagnostics,
    errors,
    warnings,
  };
}
