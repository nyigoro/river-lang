; RIVER-LANG Tree-sitter highlight queries
; tooling/syntax/tree-sitter-river/queries/highlights.scm
;
; Scope mapping follows nvim-treesitter conventions so these work
; out-of-the-box with any Tree-sitter-aware editor (Neovim, Helix, Zed,
; Emacs with tree-sitter.el).

; ── Comments ─────────────────────────────────────────────────────────────────

(comment) @comment.line

; ── Directives ───────────────────────────────────────────────────────────────

".epoch"      @keyword.directive
".sector"     @keyword.directive
".node"       @keyword.directive
"@reservoir"  @keyword.directive

; ── Section/type names ───────────────────────────────────────────────────────

; Sector name in .sector declaration
(sector_directive name: (identifier) @type)

; Node name in .node declaration
(node_declaration name: (identifier) @function)

; Reservoir name in @reservoir declaration
(reservoir_declaration name: (identifier) @type.builtin)

; ── Addresses ────────────────────────────────────────────────────────────────

; The @ before an address
"@" @operator

; Addresses in .node and @reservoir
(node_declaration        address: (hex_number) @number)
(reservoir_declaration   address: (hex_number) @number)

; Epoch value
(epoch_directive value: (hex_number) @number.special)

; Sector range bounds
(sector_directive start: (hex_number) @number)
(sector_directive end:   (hex_number) @number)

; ── Property keys ────────────────────────────────────────────────────────────

(node_property      key: (property_key) @property)
(reservoir_property . "arity"     @property)
(reservoir_property . "handshake" @property)
(reservoir_property . "on_dry"    @property)

; ── Property values ───────────────────────────────────────────────────────────

; Node type values (TOKEN_GEN, MERGE_GATE, ALU_ADD, etc.)
(node_property      key: (property_key) value: (identifier) @string)

; Arity number
(reservoir_property (dec_number) @number)

; Booleans
(boolean_literal) @boolean

; self.purge() — builtin function
(on_dry_value) @function.builtin

; ── Flows and nerves ──────────────────────────────────────────────────────────

; Flow operator <~
"<~" @operator.flow

; Nerve operator ~>
"~>" @operator.nerve

; All node name references in flow/nerve position
(flow_statement    destination: (port_ref) node: (identifier) @variable)
(flow_statement    source:      (port_ref) node: (identifier) @variable)
(nerve_statement   cry_source:        (port_ref) node: (identifier) @variable)
(nerve_statement   nerve_destination: (port_ref) node: (identifier) @variable)

; Port accessors
(port_accessor) @punctuation.special

; ── Constraints ──────────────────────────────────────────────────────────────

"#"          @punctuation.definition
"constraint" @keyword.constraint
(constraint_fn) @function.builtin

; Constraint node refs
(constraint_statement port_a: (port_ref) node: (identifier) @variable)
(constraint_statement port_b: (port_ref) node: (identifier) @variable)

; Distance literal (1.5mm)
(distance_literal) @number.float

; <= operator
"<=" @operator
"<"  @operator

; Guard operator /?
"/?" @operator.guard

; ── Punctuation ───────────────────────────────────────────────────────────────

"{"  @punctuation.bracket
"}"  @punctuation.bracket
"["  @punctuation.bracket
"]"  @punctuation.bracket
"("  @punctuation.bracket
")"  @punctuation.bracket
":"  @punctuation.delimiter
";"  @punctuation.delimiter
","  @punctuation.delimiter
"-"  @operator.range

; ── Misc ─────────────────────────────────────────────────────────────────────

; Fallback: bare identifiers not captured by a specific rule
(identifier) @variable.other
