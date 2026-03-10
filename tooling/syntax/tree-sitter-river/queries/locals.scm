; RIVER-LANG Tree-sitter locals queries
; tooling/syntax/tree-sitter-river/queries/locals.scm
;
; Enables go-to-definition and reference tracking at the Tree-sitter level
; (used by Neovim's built-in LSP + tree-sitter integration and Helix).
; The LSP server provides richer semantics; these locals cover offline / no-LSP use.

; ── Scopes ────────────────────────────────────────────────────────────────────

; The entire file is one flat scope (no block-level scoping in RIVER-LANG)
(source_file) @local.scope

; Node body and reservoir body create inner scopes for property resolution
(node_body)       @local.scope
(reservoir_body)  @local.scope

; ── Definitions ───────────────────────────────────────────────────────────────

; .node <Name> defines a node symbol
(node_declaration
  name: (identifier) @local.definition)

; .sector <Name> defines a sector symbol
(sector_directive
  name: (identifier) @local.definition)

; @reservoir <Name> defines the reservoir symbol
(reservoir_declaration
  name: (identifier) @local.definition)

; ── References ────────────────────────────────────────────────────────────────

; Node name on the destination side of a flow
(flow_statement
  destination: (port_ref) node: (identifier) @local.reference)

; Node name on the source side of a flow
(flow_statement
  source: (port_ref) node: (identifier) @local.reference)

; Node name in nerve source
(nerve_statement
  cry_source: (port_ref) node: (identifier) @local.reference)

; Node name in nerve destination
(nerve_statement
  nerve_destination: (port_ref) node: (identifier) @local.reference)

; Guard predicates reference identifiers
(flow_statement
  guard: (guard_clause) predicate: (identifier) @local.reference)

(nerve_statement
  guard: (guard_clause) predicate: (identifier) @local.reference)

; Node names in constraint
(constraint_statement
  port_a: (port_ref) node: (identifier) @local.reference)

(constraint_statement
  port_b: (port_ref) node: (identifier) @local.reference)

; Sector name referenced inside a node property
(node_property
  key: (property_key)
  value: (identifier) @local.reference)
