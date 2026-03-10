/**
 * RIVER-LANG Tree-sitter grammar
 * tooling/syntax/tree-sitter-river/grammar.js
 *
 * Covers every construct in the RIVER-LANG v1.1 spec:
 *   .epoch, .sector, .node, @reservoir, flows, nerves,
 *   #constraint, all port accessors, self.purge()
 */

module.exports = grammar({
  name: 'river',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  // Tokens that can appear in multiple rules without ambiguity
  word: $ => $.identifier,

  rules: {

    // ── Top-level ───────────────────────────────────────────────────────────

    source_file: $ => repeat(
      choice(
        $.epoch_directive,
        $.sector_directive,
        $.node_declaration,
        $.reservoir_declaration,
        $.flow_statement,
        $.nerve_statement,
        $.constraint_statement,
      )
    ),

    // ── .epoch 0x52495645; ──────────────────────────────────────────────────

    epoch_directive: $ => seq(
      '.epoch',
      field('value', $.hex_number),
      ';',
    ),

    // ── .sector Alpha [0x000 - 0x1FF]; ─────────────────────────────────────

    sector_directive: $ => seq(
      '.sector',
      field('name', $.identifier),
      '[',
      field('start', $.hex_number),
      '-',
      field('end',   $.hex_number),
      ']',
      ';',
    ),

    // ── .node Seed_Gen @ 0x00A0 { ... } ────────────────────────────────────

    node_declaration: $ => seq(
      '.node',
      field('name',    $.identifier),
      '@',
      field('address', $.hex_number),
      field('body',    $.node_body),
    ),

    node_body: $ => seq(
      '{',
      repeat($.node_property),
      '}',
    ),

    node_property: $ => seq(
      field('key', $.property_key),
      ':',
      field('value', $.property_value),
      ';',
    ),

    property_key: _ => choice(
      'type', 'tag', 'fire_on', 'sector', 'target',
    ),

    property_value: $ => choice(
      $.identifier,
      $.hex_number,
      $.dec_number,
    ),

    // ── @reservoir Final_Output @ 0x0300 { ... } ───────────────────────────

    reservoir_declaration: $ => seq(
      '@reservoir',
      field('name',    $.identifier),
      '@',
      field('address', $.hex_number),
      field('body',    $.reservoir_body),
    ),

    reservoir_body: $ => seq(
      '{',
      repeat($.reservoir_property),
      '}',
    ),

    reservoir_property: $ => choice(
      seq(field('key', $.kw_arity),     ':', field('value', $.dec_number),        ';'),
      seq(field('key', $.kw_handshake), ':', field('value', $.boolean_literal),   ';'),
      seq(field('key', $.kw_on_dry),    ':', field('value', $.on_dry_value),      ';'),
    ),

    on_dry_value: $ => choice(
      'self.purge()',
      $.identifier,
    ),

    boolean_literal: _ => choice('true', 'false'),

    // ── Flow: Feedback_Merge <~ Seed_Gen; ──────────────────────────────────

    flow_statement: $ => seq(
      field('destination', $.port_ref),
      '<~',
      field('source',      $.port_ref),
      optional(field('guard', $.guard_clause)),
      ';',
    ),

    // ── Nerve: Fibonacci_Adder.cry ~> Feedback_Merge; ──────────────────────

    nerve_statement: $ => seq(
      field('cry_source',       $.port_ref),
      '~>',
      field('nerve_destination', $.port_ref),
      optional(field('guard', $.guard_clause)),
      ';',
    ),

    guard_clause: $ => seq(
      '/?',
      field('predicate', $.identifier),
    ),

    // ── Port reference: NodeName or NodeName.cry etc. ───────────────────────

    port_ref: $ => seq(
      field('node', $.identifier),
      optional(field('accessor', $.port_accessor)),
    ),

    port_accessor: _ => choice(
      '.cry',
      '.TRUE',
      '.FALSE',
      '.out',
    ),

    // ── #constraint max_dist(A.cry, B) <= 1.5mm; ───────────────────────────

    constraint_statement: $ => seq(
      '#',
      field('keyword', $.kw_constraint),
      field('fn',    $.constraint_fn),
      '(',
      field('port_a', $.port_ref),
      ',',
      field('port_b', $.port_ref),
      ')',
      field('op', choice('<=', '<')),
      field('distance', $.distance_literal),
      ';',
    ),

    constraint_fn: _ => 'max_dist',

    // ── Literals ────────────────────────────────────────────────────────────

    hex_number: _ => /0x[0-9A-Fa-f]+/,

    dec_number: _ => /[0-9]+/,

    // 1.5mm, 2.0mm — always ends with 'mm'
    distance_literal: _ => /[0-9]+\.[0-9]+mm/,

    // ── Comment ─────────────────────────────────────────────────────────────

    comment: _ => /\/\/.*/,

    // ── Identifier ──────────────────────────────────────────────────────────

    identifier: _ => token(/[A-Za-z_][A-Za-z0-9_]*/),

    kw_arity: _ => 'arity',
    kw_handshake: _ => 'handshake',
    kw_on_dry: _ => 'on_dry',
    kw_constraint: _ => 'constraint',
  },
});
