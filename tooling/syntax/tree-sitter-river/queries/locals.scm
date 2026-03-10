(source_file) @local.scope
(node_body) @local.scope
(reservoir_body) @local.scope

(node_declaration name: (identifier) @local.definition)
(sector_directive name: (identifier) @local.definition)
(reservoir_declaration name: (identifier) @local.definition)

(flow_statement destination: (port_ref node: (identifier) @local.reference))
(flow_statement source: (port_ref node: (identifier) @local.reference))
(nerve_statement cry_source: (port_ref node: (identifier) @local.reference))
(nerve_statement nerve_destination: (port_ref node: (identifier) @local.reference))

(flow_statement guard: (guard_clause predicate: (identifier) @local.reference))
(nerve_statement guard: (guard_clause predicate: (identifier) @local.reference))

(constraint_statement port_a: (port_ref node: (identifier) @local.reference))
(constraint_statement port_b: (port_ref node: (identifier) @local.reference))

(node_property key: (property_key) value: (property_value (identifier) @local.reference))
