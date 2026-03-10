; RIVER-LANG Tree-sitter indentation queries
; tooling/syntax/tree-sitter-river/queries/indents.scm

; Indent inside node and reservoir bodies
(node_body)       @indent
(reservoir_body)  @indent

; Dedent on closing brace
"}" @dedent

; Indent continuation inside constraint argument list
(constraint_statement "(" @indent)
(constraint_statement ")" @dedent)