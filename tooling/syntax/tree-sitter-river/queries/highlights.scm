
(comment) @comment.line


".epoch"      @keyword.directive
".sector"     @keyword.directive
".node"       @keyword.directive
"@reservoir"  @keyword.directive


(sector_directive name: (identifier) @type)

(node_declaration name: (identifier) @function)

(reservoir_declaration name: (identifier) @type.builtin)


"@" @operator

(node_declaration        address: (hex_number) @number)
(reservoir_declaration   address: (hex_number) @number)

(epoch_directive value: (hex_number) @number.special)

(sector_directive start: (hex_number) @number)
(sector_directive end:   (hex_number) @number)


(node_property      key: (property_key) @property)
(reservoir_property key: (kw_arity)     @property)
(reservoir_property key: (kw_handshake) @property)
(reservoir_property key: (kw_on_dry)    @property)


(node_property      value: (property_value (identifier) @string))


"<~" @operator.flow

"~>" @operator.nerve

(flow_statement    destination: (port_ref node: (identifier) @variable))
(flow_statement    source:      (port_ref node: (identifier) @variable))
(nerve_statement   cry_source:        (port_ref node: (identifier) @variable))
(nerve_statement   nerve_destination: (port_ref node: (identifier) @variable))

(port_accessor) @punctuation.special


"#" @punctuation.definition
(constraint_statement keyword: (kw_constraint) @keyword.constraint)
(constraint_fn) @function.builtin

(constraint_statement port_a: (port_ref node: (identifier) @variable))
(constraint_statement port_b: (port_ref node: (identifier) @variable))

(distance_literal) @number.float

"<=" @operator
"<"  @operator

"/?" @operator.guard


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


(identifier) @variable.other
