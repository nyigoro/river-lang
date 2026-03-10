#include "tree_sitter/parser.h"

#if defined(__GNUC__) || defined(__clang__)
#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
#endif

#define LANGUAGE_VERSION 14
#define STATE_COUNT 79
#define LARGE_STATE_COUNT 2
#define SYMBOL_COUNT 66
#define ALIAS_COUNT 0
#define TOKEN_COUNT 44
#define EXTERNAL_TOKEN_COUNT 0
#define FIELD_COUNT 21
#define MAX_ALIAS_SEQUENCE_LENGTH 11
#define PRODUCTION_ID_COUNT 13

enum ts_symbol_identifiers {
  sym_identifier = 1,
  anon_sym_DOTepoch = 2,
  anon_sym_SEMI = 3,
  anon_sym_DOTsector = 4,
  anon_sym_LBRACK = 5,
  anon_sym_DASH = 6,
  anon_sym_RBRACK = 7,
  anon_sym_DOTnode = 8,
  anon_sym_AT = 9,
  anon_sym_LBRACE = 10,
  anon_sym_RBRACE = 11,
  anon_sym_COLON = 12,
  anon_sym_type = 13,
  anon_sym_tag = 14,
  anon_sym_fire_on = 15,
  anon_sym_sector = 16,
  anon_sym_target = 17,
  anon_sym_ATreservoir = 18,
  anon_sym_self_DOTpurge_LPAREN_RPAREN = 19,
  anon_sym_true = 20,
  anon_sym_false = 21,
  anon_sym_LT_TILDE = 22,
  anon_sym_TILDE_GT = 23,
  anon_sym_SLASH_QMARK = 24,
  anon_sym_DOTcry = 25,
  anon_sym_DOTTRUE = 26,
  anon_sym_DOTFALSE = 27,
  anon_sym_DOTout = 28,
  anon_sym_POUND = 29,
  anon_sym_LPAREN = 30,
  anon_sym_COMMA = 31,
  anon_sym_RPAREN = 32,
  anon_sym_LT_EQ = 33,
  anon_sym_LT = 34,
  sym_constraint_fn = 35,
  sym_hex_number = 36,
  sym_dec_number = 37,
  sym_distance_literal = 38,
  sym_comment = 39,
  sym_kw_arity = 40,
  sym_kw_handshake = 41,
  sym_kw_on_dry = 42,
  sym_kw_constraint = 43,
  sym_source_file = 44,
  sym_epoch_directive = 45,
  sym_sector_directive = 46,
  sym_node_declaration = 47,
  sym_node_body = 48,
  sym_node_property = 49,
  sym_property_key = 50,
  sym_property_value = 51,
  sym_reservoir_declaration = 52,
  sym_reservoir_body = 53,
  sym_reservoir_property = 54,
  sym_on_dry_value = 55,
  sym_boolean_literal = 56,
  sym_flow_statement = 57,
  sym_nerve_statement = 58,
  sym_guard_clause = 59,
  sym_port_ref = 60,
  sym_port_accessor = 61,
  sym_constraint_statement = 62,
  aux_sym_source_file_repeat1 = 63,
  aux_sym_node_body_repeat1 = 64,
  aux_sym_reservoir_body_repeat1 = 65,
};

static const char * const ts_symbol_names[] = {
  [ts_builtin_sym_end] = "end",
  [sym_identifier] = "identifier",
  [anon_sym_DOTepoch] = ".epoch",
  [anon_sym_SEMI] = ";",
  [anon_sym_DOTsector] = ".sector",
  [anon_sym_LBRACK] = "[",
  [anon_sym_DASH] = "-",
  [anon_sym_RBRACK] = "]",
  [anon_sym_DOTnode] = ".node",
  [anon_sym_AT] = "@",
  [anon_sym_LBRACE] = "{",
  [anon_sym_RBRACE] = "}",
  [anon_sym_COLON] = ":",
  [anon_sym_type] = "type",
  [anon_sym_tag] = "tag",
  [anon_sym_fire_on] = "fire_on",
  [anon_sym_sector] = "sector",
  [anon_sym_target] = "target",
  [anon_sym_ATreservoir] = "@reservoir",
  [anon_sym_self_DOTpurge_LPAREN_RPAREN] = "self.purge()",
  [anon_sym_true] = "true",
  [anon_sym_false] = "false",
  [anon_sym_LT_TILDE] = "<~",
  [anon_sym_TILDE_GT] = "~>",
  [anon_sym_SLASH_QMARK] = "/\?",
  [anon_sym_DOTcry] = ".cry",
  [anon_sym_DOTTRUE] = ".TRUE",
  [anon_sym_DOTFALSE] = ".FALSE",
  [anon_sym_DOTout] = ".out",
  [anon_sym_POUND] = "#",
  [anon_sym_LPAREN] = "(",
  [anon_sym_COMMA] = ",",
  [anon_sym_RPAREN] = ")",
  [anon_sym_LT_EQ] = "<=",
  [anon_sym_LT] = "<",
  [sym_constraint_fn] = "constraint_fn",
  [sym_hex_number] = "hex_number",
  [sym_dec_number] = "dec_number",
  [sym_distance_literal] = "distance_literal",
  [sym_comment] = "comment",
  [sym_kw_arity] = "kw_arity",
  [sym_kw_handshake] = "kw_handshake",
  [sym_kw_on_dry] = "kw_on_dry",
  [sym_kw_constraint] = "kw_constraint",
  [sym_source_file] = "source_file",
  [sym_epoch_directive] = "epoch_directive",
  [sym_sector_directive] = "sector_directive",
  [sym_node_declaration] = "node_declaration",
  [sym_node_body] = "node_body",
  [sym_node_property] = "node_property",
  [sym_property_key] = "property_key",
  [sym_property_value] = "property_value",
  [sym_reservoir_declaration] = "reservoir_declaration",
  [sym_reservoir_body] = "reservoir_body",
  [sym_reservoir_property] = "reservoir_property",
  [sym_on_dry_value] = "on_dry_value",
  [sym_boolean_literal] = "boolean_literal",
  [sym_flow_statement] = "flow_statement",
  [sym_nerve_statement] = "nerve_statement",
  [sym_guard_clause] = "guard_clause",
  [sym_port_ref] = "port_ref",
  [sym_port_accessor] = "port_accessor",
  [sym_constraint_statement] = "constraint_statement",
  [aux_sym_source_file_repeat1] = "source_file_repeat1",
  [aux_sym_node_body_repeat1] = "node_body_repeat1",
  [aux_sym_reservoir_body_repeat1] = "reservoir_body_repeat1",
};

static const TSSymbol ts_symbol_map[] = {
  [ts_builtin_sym_end] = ts_builtin_sym_end,
  [sym_identifier] = sym_identifier,
  [anon_sym_DOTepoch] = anon_sym_DOTepoch,
  [anon_sym_SEMI] = anon_sym_SEMI,
  [anon_sym_DOTsector] = anon_sym_DOTsector,
  [anon_sym_LBRACK] = anon_sym_LBRACK,
  [anon_sym_DASH] = anon_sym_DASH,
  [anon_sym_RBRACK] = anon_sym_RBRACK,
  [anon_sym_DOTnode] = anon_sym_DOTnode,
  [anon_sym_AT] = anon_sym_AT,
  [anon_sym_LBRACE] = anon_sym_LBRACE,
  [anon_sym_RBRACE] = anon_sym_RBRACE,
  [anon_sym_COLON] = anon_sym_COLON,
  [anon_sym_type] = anon_sym_type,
  [anon_sym_tag] = anon_sym_tag,
  [anon_sym_fire_on] = anon_sym_fire_on,
  [anon_sym_sector] = anon_sym_sector,
  [anon_sym_target] = anon_sym_target,
  [anon_sym_ATreservoir] = anon_sym_ATreservoir,
  [anon_sym_self_DOTpurge_LPAREN_RPAREN] = anon_sym_self_DOTpurge_LPAREN_RPAREN,
  [anon_sym_true] = anon_sym_true,
  [anon_sym_false] = anon_sym_false,
  [anon_sym_LT_TILDE] = anon_sym_LT_TILDE,
  [anon_sym_TILDE_GT] = anon_sym_TILDE_GT,
  [anon_sym_SLASH_QMARK] = anon_sym_SLASH_QMARK,
  [anon_sym_DOTcry] = anon_sym_DOTcry,
  [anon_sym_DOTTRUE] = anon_sym_DOTTRUE,
  [anon_sym_DOTFALSE] = anon_sym_DOTFALSE,
  [anon_sym_DOTout] = anon_sym_DOTout,
  [anon_sym_POUND] = anon_sym_POUND,
  [anon_sym_LPAREN] = anon_sym_LPAREN,
  [anon_sym_COMMA] = anon_sym_COMMA,
  [anon_sym_RPAREN] = anon_sym_RPAREN,
  [anon_sym_LT_EQ] = anon_sym_LT_EQ,
  [anon_sym_LT] = anon_sym_LT,
  [sym_constraint_fn] = sym_constraint_fn,
  [sym_hex_number] = sym_hex_number,
  [sym_dec_number] = sym_dec_number,
  [sym_distance_literal] = sym_distance_literal,
  [sym_comment] = sym_comment,
  [sym_kw_arity] = sym_kw_arity,
  [sym_kw_handshake] = sym_kw_handshake,
  [sym_kw_on_dry] = sym_kw_on_dry,
  [sym_kw_constraint] = sym_kw_constraint,
  [sym_source_file] = sym_source_file,
  [sym_epoch_directive] = sym_epoch_directive,
  [sym_sector_directive] = sym_sector_directive,
  [sym_node_declaration] = sym_node_declaration,
  [sym_node_body] = sym_node_body,
  [sym_node_property] = sym_node_property,
  [sym_property_key] = sym_property_key,
  [sym_property_value] = sym_property_value,
  [sym_reservoir_declaration] = sym_reservoir_declaration,
  [sym_reservoir_body] = sym_reservoir_body,
  [sym_reservoir_property] = sym_reservoir_property,
  [sym_on_dry_value] = sym_on_dry_value,
  [sym_boolean_literal] = sym_boolean_literal,
  [sym_flow_statement] = sym_flow_statement,
  [sym_nerve_statement] = sym_nerve_statement,
  [sym_guard_clause] = sym_guard_clause,
  [sym_port_ref] = sym_port_ref,
  [sym_port_accessor] = sym_port_accessor,
  [sym_constraint_statement] = sym_constraint_statement,
  [aux_sym_source_file_repeat1] = aux_sym_source_file_repeat1,
  [aux_sym_node_body_repeat1] = aux_sym_node_body_repeat1,
  [aux_sym_reservoir_body_repeat1] = aux_sym_reservoir_body_repeat1,
};

static const TSSymbolMetadata ts_symbol_metadata[] = {
  [ts_builtin_sym_end] = {
    .visible = false,
    .named = true,
  },
  [sym_identifier] = {
    .visible = true,
    .named = true,
  },
  [anon_sym_DOTepoch] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_SEMI] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_DOTsector] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_LBRACK] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_DASH] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_RBRACK] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_DOTnode] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_AT] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_LBRACE] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_RBRACE] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_COLON] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_type] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_tag] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_fire_on] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_sector] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_target] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_ATreservoir] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_self_DOTpurge_LPAREN_RPAREN] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_true] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_false] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_LT_TILDE] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_TILDE_GT] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_SLASH_QMARK] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_DOTcry] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_DOTTRUE] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_DOTFALSE] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_DOTout] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_POUND] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_LPAREN] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_COMMA] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_RPAREN] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_LT_EQ] = {
    .visible = true,
    .named = false,
  },
  [anon_sym_LT] = {
    .visible = true,
    .named = false,
  },
  [sym_constraint_fn] = {
    .visible = true,
    .named = true,
  },
  [sym_hex_number] = {
    .visible = true,
    .named = true,
  },
  [sym_dec_number] = {
    .visible = true,
    .named = true,
  },
  [sym_distance_literal] = {
    .visible = true,
    .named = true,
  },
  [sym_comment] = {
    .visible = true,
    .named = true,
  },
  [sym_kw_arity] = {
    .visible = true,
    .named = true,
  },
  [sym_kw_handshake] = {
    .visible = true,
    .named = true,
  },
  [sym_kw_on_dry] = {
    .visible = true,
    .named = true,
  },
  [sym_kw_constraint] = {
    .visible = true,
    .named = true,
  },
  [sym_source_file] = {
    .visible = true,
    .named = true,
  },
  [sym_epoch_directive] = {
    .visible = true,
    .named = true,
  },
  [sym_sector_directive] = {
    .visible = true,
    .named = true,
  },
  [sym_node_declaration] = {
    .visible = true,
    .named = true,
  },
  [sym_node_body] = {
    .visible = true,
    .named = true,
  },
  [sym_node_property] = {
    .visible = true,
    .named = true,
  },
  [sym_property_key] = {
    .visible = true,
    .named = true,
  },
  [sym_property_value] = {
    .visible = true,
    .named = true,
  },
  [sym_reservoir_declaration] = {
    .visible = true,
    .named = true,
  },
  [sym_reservoir_body] = {
    .visible = true,
    .named = true,
  },
  [sym_reservoir_property] = {
    .visible = true,
    .named = true,
  },
  [sym_on_dry_value] = {
    .visible = true,
    .named = true,
  },
  [sym_boolean_literal] = {
    .visible = true,
    .named = true,
  },
  [sym_flow_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_nerve_statement] = {
    .visible = true,
    .named = true,
  },
  [sym_guard_clause] = {
    .visible = true,
    .named = true,
  },
  [sym_port_ref] = {
    .visible = true,
    .named = true,
  },
  [sym_port_accessor] = {
    .visible = true,
    .named = true,
  },
  [sym_constraint_statement] = {
    .visible = true,
    .named = true,
  },
  [aux_sym_source_file_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_node_body_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_reservoir_body_repeat1] = {
    .visible = false,
    .named = false,
  },
};

enum ts_field_identifiers {
  field_accessor = 1,
  field_address = 2,
  field_body = 3,
  field_cry_source = 4,
  field_destination = 5,
  field_distance = 6,
  field_end = 7,
  field_fn = 8,
  field_guard = 9,
  field_key = 10,
  field_keyword = 11,
  field_name = 12,
  field_nerve_destination = 13,
  field_node = 14,
  field_op = 15,
  field_port_a = 16,
  field_port_b = 17,
  field_predicate = 18,
  field_source = 19,
  field_start = 20,
  field_value = 21,
};

static const char * const ts_field_names[] = {
  [0] = NULL,
  [field_accessor] = "accessor",
  [field_address] = "address",
  [field_body] = "body",
  [field_cry_source] = "cry_source",
  [field_destination] = "destination",
  [field_distance] = "distance",
  [field_end] = "end",
  [field_fn] = "fn",
  [field_guard] = "guard",
  [field_key] = "key",
  [field_keyword] = "keyword",
  [field_name] = "name",
  [field_nerve_destination] = "nerve_destination",
  [field_node] = "node",
  [field_op] = "op",
  [field_port_a] = "port_a",
  [field_port_b] = "port_b",
  [field_predicate] = "predicate",
  [field_source] = "source",
  [field_start] = "start",
  [field_value] = "value",
};

static const TSFieldMapSlice ts_field_map_slices[PRODUCTION_ID_COUNT] = {
  [1] = {.index = 0, .length = 1},
  [2] = {.index = 1, .length = 2},
  [3] = {.index = 3, .length = 1},
  [4] = {.index = 4, .length = 2},
  [5] = {.index = 6, .length = 2},
  [6] = {.index = 8, .length = 3},
  [7] = {.index = 11, .length = 1},
  [8] = {.index = 12, .length = 3},
  [9] = {.index = 15, .length = 3},
  [10] = {.index = 18, .length = 3},
  [11] = {.index = 21, .length = 2},
  [12] = {.index = 23, .length = 6},
};

static const TSFieldMapEntry ts_field_map_entries[] = {
  [0] =
    {field_node, 0},
  [1] =
    {field_accessor, 1},
    {field_node, 0},
  [3] =
    {field_value, 1},
  [4] =
    {field_destination, 0},
    {field_source, 2},
  [6] =
    {field_cry_source, 0},
    {field_nerve_destination, 2},
  [8] =
    {field_address, 3},
    {field_body, 4},
    {field_name, 1},
  [11] =
    {field_predicate, 1},
  [12] =
    {field_destination, 0},
    {field_guard, 3},
    {field_source, 2},
  [15] =
    {field_cry_source, 0},
    {field_guard, 3},
    {field_nerve_destination, 2},
  [18] =
    {field_end, 5},
    {field_name, 1},
    {field_start, 3},
  [21] =
    {field_key, 0},
    {field_value, 2},
  [23] =
    {field_distance, 9},
    {field_fn, 2},
    {field_keyword, 1},
    {field_op, 8},
    {field_port_a, 4},
    {field_port_b, 6},
};

static const TSSymbol ts_alias_sequences[PRODUCTION_ID_COUNT][MAX_ALIAS_SEQUENCE_LENGTH] = {
  [0] = {0},
};

static const uint16_t ts_non_terminal_alias_map[] = {
  0,
};

static const TSStateId ts_primary_state_ids[STATE_COUNT] = {
  [0] = 0,
  [1] = 1,
  [2] = 2,
  [3] = 3,
  [4] = 4,
  [5] = 5,
  [6] = 6,
  [7] = 7,
  [8] = 8,
  [9] = 9,
  [10] = 10,
  [11] = 11,
  [12] = 12,
  [13] = 13,
  [14] = 14,
  [15] = 15,
  [16] = 16,
  [17] = 17,
  [18] = 18,
  [19] = 19,
  [20] = 20,
  [21] = 21,
  [22] = 22,
  [23] = 23,
  [24] = 24,
  [25] = 25,
  [26] = 26,
  [27] = 27,
  [28] = 28,
  [29] = 29,
  [30] = 30,
  [31] = 31,
  [32] = 32,
  [33] = 33,
  [34] = 34,
  [35] = 35,
  [36] = 36,
  [37] = 37,
  [38] = 38,
  [39] = 39,
  [40] = 40,
  [41] = 41,
  [42] = 42,
  [43] = 43,
  [44] = 44,
  [45] = 45,
  [46] = 46,
  [47] = 47,
  [48] = 48,
  [49] = 49,
  [50] = 50,
  [51] = 51,
  [52] = 52,
  [53] = 53,
  [54] = 54,
  [55] = 55,
  [56] = 56,
  [57] = 57,
  [58] = 58,
  [59] = 59,
  [60] = 60,
  [61] = 61,
  [62] = 62,
  [63] = 63,
  [64] = 64,
  [65] = 65,
  [66] = 66,
  [67] = 67,
  [68] = 68,
  [69] = 69,
  [70] = 70,
  [71] = 71,
  [72] = 72,
  [73] = 73,
  [74] = 74,
  [75] = 75,
  [76] = 76,
  [77] = 77,
  [78] = 78,
};

static bool ts_lex(TSLexer *lexer, TSStateId state) {
  START_LEXER();
  eof = lexer->eof(lexer);
  switch (state) {
    case 0:
      if (eof) ADVANCE(52);
      ADVANCE_MAP(
        '#', 74,
        '(', 75,
        ')', 77,
        ',', 76,
        '-', 57,
        '.', 11,
        '/', 5,
        '0', 82,
        ':', 64,
        ';', 54,
        '<', 80,
        '@', 61,
        '[', 56,
        ']', 58,
        's', 89,
        '{', 62,
        '}', 63,
        '~', 7,
      );
      if (('\t' <= lookahead && lookahead <= '\r') ||
          lookahead == ' ') SKIP(0);
      if (('1' <= lookahead && lookahead <= '9')) ADVANCE(83);
      if (('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z')) ADVANCE(92);
      END_STATE();
    case 1:
      if (lookahead == '(') ADVANCE(2);
      END_STATE();
    case 2:
      if (lookahead == ')') ADVANCE(66);
      END_STATE();
    case 3:
      if (lookahead == '.') ADVANCE(49);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(3);
      END_STATE();
    case 4:
      if (lookahead == '/') ADVANCE(87);
      END_STATE();
    case 5:
      if (lookahead == '/') ADVANCE(87);
      if (lookahead == '?') ADVANCE(69);
      END_STATE();
    case 6:
      if (lookahead == '/') ADVANCE(4);
      if (lookahead == '<') ADVANCE(79);
      if (lookahead == '@') ADVANCE(60);
      if (('\t' <= lookahead && lookahead <= '\r') ||
          lookahead == ' ') SKIP(6);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(3);
      END_STATE();
    case 7:
      if (lookahead == '>') ADVANCE(68);
      END_STATE();
    case 8:
      if (lookahead == 'A') ADVANCE(12);
      END_STATE();
    case 9:
      if (lookahead == 'E') ADVANCE(71);
      END_STATE();
    case 10:
      if (lookahead == 'E') ADVANCE(72);
      END_STATE();
    case 11:
      if (lookahead == 'F') ADVANCE(8);
      if (lookahead == 'T') ADVANCE(13);
      if (lookahead == 'c') ADVANCE(35);
      if (lookahead == 'e') ADVANCE(33);
      if (lookahead == 'n') ADVANCE(29);
      if (lookahead == 'o') ADVANCE(44);
      if (lookahead == 's') ADVANCE(19);
      END_STATE();
    case 12:
      if (lookahead == 'L') ADVANCE(14);
      END_STATE();
    case 13:
      if (lookahead == 'R') ADVANCE(15);
      END_STATE();
    case 14:
      if (lookahead == 'S') ADVANCE(10);
      END_STATE();
    case 15:
      if (lookahead == 'U') ADVANCE(9);
      END_STATE();
    case 16:
      if (lookahead == 'c') ADVANCE(25);
      END_STATE();
    case 17:
      if (lookahead == 'c') ADVANCE(43);
      END_STATE();
    case 18:
      if (lookahead == 'd') ADVANCE(21);
      END_STATE();
    case 19:
      if (lookahead == 'e') ADVANCE(17);
      END_STATE();
    case 20:
      if (lookahead == 'e') ADVANCE(41);
      END_STATE();
    case 21:
      if (lookahead == 'e') ADVANCE(59);
      END_STATE();
    case 22:
      if (lookahead == 'e') ADVANCE(1);
      END_STATE();
    case 23:
      if (lookahead == 'e') ADVANCE(36);
      END_STATE();
    case 24:
      if (lookahead == 'g') ADVANCE(22);
      END_STATE();
    case 25:
      if (lookahead == 'h') ADVANCE(53);
      END_STATE();
    case 26:
      if (lookahead == 'i') ADVANCE(39);
      END_STATE();
    case 27:
      if (lookahead == 'm') ADVANCE(28);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(27);
      END_STATE();
    case 28:
      if (lookahead == 'm') ADVANCE(86);
      END_STATE();
    case 29:
      if (lookahead == 'o') ADVANCE(18);
      END_STATE();
    case 30:
      if (lookahead == 'o') ADVANCE(26);
      END_STATE();
    case 31:
      if (lookahead == 'o') ADVANCE(16);
      END_STATE();
    case 32:
      if (lookahead == 'o') ADVANCE(37);
      END_STATE();
    case 33:
      if (lookahead == 'p') ADVANCE(31);
      END_STATE();
    case 34:
      if (lookahead == 'p') ADVANCE(45);
      END_STATE();
    case 35:
      if (lookahead == 'r') ADVANCE(47);
      END_STATE();
    case 36:
      if (lookahead == 'r') ADVANCE(46);
      END_STATE();
    case 37:
      if (lookahead == 'r') ADVANCE(55);
      END_STATE();
    case 38:
      if (lookahead == 'r') ADVANCE(24);
      END_STATE();
    case 39:
      if (lookahead == 'r') ADVANCE(65);
      END_STATE();
    case 40:
      if (lookahead == 'r') ADVANCE(20);
      END_STATE();
    case 41:
      if (lookahead == 's') ADVANCE(23);
      END_STATE();
    case 42:
      if (lookahead == 't') ADVANCE(73);
      END_STATE();
    case 43:
      if (lookahead == 't') ADVANCE(32);
      END_STATE();
    case 44:
      if (lookahead == 'u') ADVANCE(42);
      END_STATE();
    case 45:
      if (lookahead == 'u') ADVANCE(38);
      END_STATE();
    case 46:
      if (lookahead == 'v') ADVANCE(30);
      END_STATE();
    case 47:
      if (lookahead == 'y') ADVANCE(70);
      END_STATE();
    case 48:
      if (lookahead == '~') ADVANCE(67);
      END_STATE();
    case 49:
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(27);
      END_STATE();
    case 50:
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'F') ||
          ('a' <= lookahead && lookahead <= 'f')) ADVANCE(81);
      END_STATE();
    case 51:
      if (eof) ADVANCE(52);
      ADVANCE_MAP(
        '#', 74,
        ')', 77,
        ',', 76,
        '.', 11,
        '/', 5,
        '0', 84,
        ';', 54,
        '<', 48,
        '@', 40,
        '}', 63,
        '~', 7,
      );
      if (('\t' <= lookahead && lookahead <= '\r') ||
          lookahead == ' ') SKIP(51);
      if (('1' <= lookahead && lookahead <= '9')) ADVANCE(85);
      if (('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z')) ADVANCE(92);
      END_STATE();
    case 52:
      ACCEPT_TOKEN(ts_builtin_sym_end);
      END_STATE();
    case 53:
      ACCEPT_TOKEN(anon_sym_DOTepoch);
      END_STATE();
    case 54:
      ACCEPT_TOKEN(anon_sym_SEMI);
      END_STATE();
    case 55:
      ACCEPT_TOKEN(anon_sym_DOTsector);
      END_STATE();
    case 56:
      ACCEPT_TOKEN(anon_sym_LBRACK);
      END_STATE();
    case 57:
      ACCEPT_TOKEN(anon_sym_DASH);
      END_STATE();
    case 58:
      ACCEPT_TOKEN(anon_sym_RBRACK);
      END_STATE();
    case 59:
      ACCEPT_TOKEN(anon_sym_DOTnode);
      END_STATE();
    case 60:
      ACCEPT_TOKEN(anon_sym_AT);
      END_STATE();
    case 61:
      ACCEPT_TOKEN(anon_sym_AT);
      if (lookahead == 'r') ADVANCE(20);
      END_STATE();
    case 62:
      ACCEPT_TOKEN(anon_sym_LBRACE);
      END_STATE();
    case 63:
      ACCEPT_TOKEN(anon_sym_RBRACE);
      END_STATE();
    case 64:
      ACCEPT_TOKEN(anon_sym_COLON);
      END_STATE();
    case 65:
      ACCEPT_TOKEN(anon_sym_ATreservoir);
      END_STATE();
    case 66:
      ACCEPT_TOKEN(anon_sym_self_DOTpurge_LPAREN_RPAREN);
      END_STATE();
    case 67:
      ACCEPT_TOKEN(anon_sym_LT_TILDE);
      END_STATE();
    case 68:
      ACCEPT_TOKEN(anon_sym_TILDE_GT);
      END_STATE();
    case 69:
      ACCEPT_TOKEN(anon_sym_SLASH_QMARK);
      END_STATE();
    case 70:
      ACCEPT_TOKEN(anon_sym_DOTcry);
      END_STATE();
    case 71:
      ACCEPT_TOKEN(anon_sym_DOTTRUE);
      END_STATE();
    case 72:
      ACCEPT_TOKEN(anon_sym_DOTFALSE);
      END_STATE();
    case 73:
      ACCEPT_TOKEN(anon_sym_DOTout);
      END_STATE();
    case 74:
      ACCEPT_TOKEN(anon_sym_POUND);
      END_STATE();
    case 75:
      ACCEPT_TOKEN(anon_sym_LPAREN);
      END_STATE();
    case 76:
      ACCEPT_TOKEN(anon_sym_COMMA);
      END_STATE();
    case 77:
      ACCEPT_TOKEN(anon_sym_RPAREN);
      END_STATE();
    case 78:
      ACCEPT_TOKEN(anon_sym_LT_EQ);
      END_STATE();
    case 79:
      ACCEPT_TOKEN(anon_sym_LT);
      if (lookahead == '=') ADVANCE(78);
      END_STATE();
    case 80:
      ACCEPT_TOKEN(anon_sym_LT);
      if (lookahead == '=') ADVANCE(78);
      if (lookahead == '~') ADVANCE(67);
      END_STATE();
    case 81:
      ACCEPT_TOKEN(sym_hex_number);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'F') ||
          ('a' <= lookahead && lookahead <= 'f')) ADVANCE(81);
      END_STATE();
    case 82:
      ACCEPT_TOKEN(sym_dec_number);
      if (lookahead == '.') ADVANCE(49);
      if (lookahead == 'x') ADVANCE(50);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(83);
      END_STATE();
    case 83:
      ACCEPT_TOKEN(sym_dec_number);
      if (lookahead == '.') ADVANCE(49);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(83);
      END_STATE();
    case 84:
      ACCEPT_TOKEN(sym_dec_number);
      if (lookahead == 'x') ADVANCE(50);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(85);
      END_STATE();
    case 85:
      ACCEPT_TOKEN(sym_dec_number);
      if (('0' <= lookahead && lookahead <= '9')) ADVANCE(85);
      END_STATE();
    case 86:
      ACCEPT_TOKEN(sym_distance_literal);
      END_STATE();
    case 87:
      ACCEPT_TOKEN(sym_comment);
      if (lookahead != 0 &&
          lookahead != '\n') ADVANCE(87);
      END_STATE();
    case 88:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == '.') ADVANCE(34);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z')) ADVANCE(92);
      END_STATE();
    case 89:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'e') ADVANCE(91);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z')) ADVANCE(92);
      END_STATE();
    case 90:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'f') ADVANCE(88);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z')) ADVANCE(92);
      END_STATE();
    case 91:
      ACCEPT_TOKEN(sym_identifier);
      if (lookahead == 'l') ADVANCE(90);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z')) ADVANCE(92);
      END_STATE();
    case 92:
      ACCEPT_TOKEN(sym_identifier);
      if (('0' <= lookahead && lookahead <= '9') ||
          ('A' <= lookahead && lookahead <= 'Z') ||
          lookahead == '_' ||
          ('a' <= lookahead && lookahead <= 'z')) ADVANCE(92);
      END_STATE();
    default:
      return false;
  }
}

static bool ts_lex_keywords(TSLexer *lexer, TSStateId state) {
  START_LEXER();
  eof = lexer->eof(lexer);
  switch (state) {
    case 0:
      ADVANCE_MAP(
        'a', 1,
        'c', 2,
        'f', 3,
        'h', 4,
        'm', 5,
        'o', 6,
        's', 7,
        't', 8,
      );
      if (('\t' <= lookahead && lookahead <= '\r') ||
          lookahead == ' ') SKIP(0);
      END_STATE();
    case 1:
      if (lookahead == 'r') ADVANCE(9);
      END_STATE();
    case 2:
      if (lookahead == 'o') ADVANCE(10);
      END_STATE();
    case 3:
      if (lookahead == 'a') ADVANCE(11);
      if (lookahead == 'i') ADVANCE(12);
      END_STATE();
    case 4:
      if (lookahead == 'a') ADVANCE(13);
      END_STATE();
    case 5:
      if (lookahead == 'a') ADVANCE(14);
      END_STATE();
    case 6:
      if (lookahead == 'n') ADVANCE(15);
      END_STATE();
    case 7:
      if (lookahead == 'e') ADVANCE(16);
      END_STATE();
    case 8:
      if (lookahead == 'a') ADVANCE(17);
      if (lookahead == 'r') ADVANCE(18);
      if (lookahead == 'y') ADVANCE(19);
      END_STATE();
    case 9:
      if (lookahead == 'i') ADVANCE(20);
      END_STATE();
    case 10:
      if (lookahead == 'n') ADVANCE(21);
      END_STATE();
    case 11:
      if (lookahead == 'l') ADVANCE(22);
      END_STATE();
    case 12:
      if (lookahead == 'r') ADVANCE(23);
      END_STATE();
    case 13:
      if (lookahead == 'n') ADVANCE(24);
      END_STATE();
    case 14:
      if (lookahead == 'x') ADVANCE(25);
      END_STATE();
    case 15:
      if (lookahead == '_') ADVANCE(26);
      END_STATE();
    case 16:
      if (lookahead == 'c') ADVANCE(27);
      END_STATE();
    case 17:
      if (lookahead == 'g') ADVANCE(28);
      if (lookahead == 'r') ADVANCE(29);
      END_STATE();
    case 18:
      if (lookahead == 'u') ADVANCE(30);
      END_STATE();
    case 19:
      if (lookahead == 'p') ADVANCE(31);
      END_STATE();
    case 20:
      if (lookahead == 't') ADVANCE(32);
      END_STATE();
    case 21:
      if (lookahead == 's') ADVANCE(33);
      END_STATE();
    case 22:
      if (lookahead == 's') ADVANCE(34);
      END_STATE();
    case 23:
      if (lookahead == 'e') ADVANCE(35);
      END_STATE();
    case 24:
      if (lookahead == 'd') ADVANCE(36);
      END_STATE();
    case 25:
      if (lookahead == '_') ADVANCE(37);
      END_STATE();
    case 26:
      if (lookahead == 'd') ADVANCE(38);
      END_STATE();
    case 27:
      if (lookahead == 't') ADVANCE(39);
      END_STATE();
    case 28:
      ACCEPT_TOKEN(anon_sym_tag);
      END_STATE();
    case 29:
      if (lookahead == 'g') ADVANCE(40);
      END_STATE();
    case 30:
      if (lookahead == 'e') ADVANCE(41);
      END_STATE();
    case 31:
      if (lookahead == 'e') ADVANCE(42);
      END_STATE();
    case 32:
      if (lookahead == 'y') ADVANCE(43);
      END_STATE();
    case 33:
      if (lookahead == 't') ADVANCE(44);
      END_STATE();
    case 34:
      if (lookahead == 'e') ADVANCE(45);
      END_STATE();
    case 35:
      if (lookahead == '_') ADVANCE(46);
      END_STATE();
    case 36:
      if (lookahead == 's') ADVANCE(47);
      END_STATE();
    case 37:
      if (lookahead == 'd') ADVANCE(48);
      END_STATE();
    case 38:
      if (lookahead == 'r') ADVANCE(49);
      END_STATE();
    case 39:
      if (lookahead == 'o') ADVANCE(50);
      END_STATE();
    case 40:
      if (lookahead == 'e') ADVANCE(51);
      END_STATE();
    case 41:
      ACCEPT_TOKEN(anon_sym_true);
      END_STATE();
    case 42:
      ACCEPT_TOKEN(anon_sym_type);
      END_STATE();
    case 43:
      ACCEPT_TOKEN(sym_kw_arity);
      END_STATE();
    case 44:
      if (lookahead == 'r') ADVANCE(52);
      END_STATE();
    case 45:
      ACCEPT_TOKEN(anon_sym_false);
      END_STATE();
    case 46:
      if (lookahead == 'o') ADVANCE(53);
      END_STATE();
    case 47:
      if (lookahead == 'h') ADVANCE(54);
      END_STATE();
    case 48:
      if (lookahead == 'i') ADVANCE(55);
      END_STATE();
    case 49:
      if (lookahead == 'y') ADVANCE(56);
      END_STATE();
    case 50:
      if (lookahead == 'r') ADVANCE(57);
      END_STATE();
    case 51:
      if (lookahead == 't') ADVANCE(58);
      END_STATE();
    case 52:
      if (lookahead == 'a') ADVANCE(59);
      END_STATE();
    case 53:
      if (lookahead == 'n') ADVANCE(60);
      END_STATE();
    case 54:
      if (lookahead == 'a') ADVANCE(61);
      END_STATE();
    case 55:
      if (lookahead == 's') ADVANCE(62);
      END_STATE();
    case 56:
      ACCEPT_TOKEN(sym_kw_on_dry);
      END_STATE();
    case 57:
      ACCEPT_TOKEN(anon_sym_sector);
      END_STATE();
    case 58:
      ACCEPT_TOKEN(anon_sym_target);
      END_STATE();
    case 59:
      if (lookahead == 'i') ADVANCE(63);
      END_STATE();
    case 60:
      ACCEPT_TOKEN(anon_sym_fire_on);
      END_STATE();
    case 61:
      if (lookahead == 'k') ADVANCE(64);
      END_STATE();
    case 62:
      if (lookahead == 't') ADVANCE(65);
      END_STATE();
    case 63:
      if (lookahead == 'n') ADVANCE(66);
      END_STATE();
    case 64:
      if (lookahead == 'e') ADVANCE(67);
      END_STATE();
    case 65:
      ACCEPT_TOKEN(sym_constraint_fn);
      END_STATE();
    case 66:
      if (lookahead == 't') ADVANCE(68);
      END_STATE();
    case 67:
      ACCEPT_TOKEN(sym_kw_handshake);
      END_STATE();
    case 68:
      ACCEPT_TOKEN(sym_kw_constraint);
      END_STATE();
    default:
      return false;
  }
}

static const TSLexMode ts_lex_modes[STATE_COUNT] = {
  [0] = {.lex_state = 0},
  [1] = {.lex_state = 51},
  [2] = {.lex_state = 51},
  [3] = {.lex_state = 51},
  [4] = {.lex_state = 51},
  [5] = {.lex_state = 51},
  [6] = {.lex_state = 51},
  [7] = {.lex_state = 51},
  [8] = {.lex_state = 51},
  [9] = {.lex_state = 51},
  [10] = {.lex_state = 51},
  [11] = {.lex_state = 51},
  [12] = {.lex_state = 51},
  [13] = {.lex_state = 51},
  [14] = {.lex_state = 51},
  [15] = {.lex_state = 51},
  [16] = {.lex_state = 51},
  [17] = {.lex_state = 51},
  [18] = {.lex_state = 51},
  [19] = {.lex_state = 51},
  [20] = {.lex_state = 51},
  [21] = {.lex_state = 51},
  [22] = {.lex_state = 51},
  [23] = {.lex_state = 51},
  [24] = {.lex_state = 51},
  [25] = {.lex_state = 51},
  [26] = {.lex_state = 51},
  [27] = {.lex_state = 51},
  [28] = {.lex_state = 51},
  [29] = {.lex_state = 0},
  [30] = {.lex_state = 0},
  [31] = {.lex_state = 0},
  [32] = {.lex_state = 51},
  [33] = {.lex_state = 51},
  [34] = {.lex_state = 0},
  [35] = {.lex_state = 51},
  [36] = {.lex_state = 6},
  [37] = {.lex_state = 51},
  [38] = {.lex_state = 51},
  [39] = {.lex_state = 51},
  [40] = {.lex_state = 0},
  [41] = {.lex_state = 0},
  [42] = {.lex_state = 6},
  [43] = {.lex_state = 0},
  [44] = {.lex_state = 0},
  [45] = {.lex_state = 0},
  [46] = {.lex_state = 0},
  [47] = {.lex_state = 0},
  [48] = {.lex_state = 0},
  [49] = {.lex_state = 0},
  [50] = {.lex_state = 0},
  [51] = {.lex_state = 0},
  [52] = {.lex_state = 0},
  [53] = {.lex_state = 0},
  [54] = {.lex_state = 0},
  [55] = {.lex_state = 51},
  [56] = {.lex_state = 0},
  [57] = {.lex_state = 0},
  [58] = {.lex_state = 51},
  [59] = {.lex_state = 6},
  [60] = {.lex_state = 0},
  [61] = {.lex_state = 51},
  [62] = {.lex_state = 0},
  [63] = {.lex_state = 0},
  [64] = {.lex_state = 0},
  [65] = {.lex_state = 0},
  [66] = {.lex_state = 0},
  [67] = {.lex_state = 51},
  [68] = {.lex_state = 0},
  [69] = {.lex_state = 0},
  [70] = {.lex_state = 0},
  [71] = {.lex_state = 0},
  [72] = {.lex_state = 0},
  [73] = {.lex_state = 0},
  [74] = {.lex_state = 51},
  [75] = {.lex_state = 51},
  [76] = {.lex_state = 6},
  [77] = {.lex_state = 0},
  [78] = {.lex_state = 51},
};

static const uint16_t ts_parse_table[LARGE_STATE_COUNT][SYMBOL_COUNT] = {
  [0] = {
    [ts_builtin_sym_end] = ACTIONS(1),
    [sym_identifier] = ACTIONS(1),
    [anon_sym_DOTepoch] = ACTIONS(1),
    [anon_sym_SEMI] = ACTIONS(1),
    [anon_sym_DOTsector] = ACTIONS(1),
    [anon_sym_LBRACK] = ACTIONS(1),
    [anon_sym_DASH] = ACTIONS(1),
    [anon_sym_RBRACK] = ACTIONS(1),
    [anon_sym_DOTnode] = ACTIONS(1),
    [anon_sym_AT] = ACTIONS(1),
    [anon_sym_LBRACE] = ACTIONS(1),
    [anon_sym_RBRACE] = ACTIONS(1),
    [anon_sym_COLON] = ACTIONS(1),
    [anon_sym_type] = ACTIONS(1),
    [anon_sym_tag] = ACTIONS(1),
    [anon_sym_fire_on] = ACTIONS(1),
    [anon_sym_sector] = ACTIONS(1),
    [anon_sym_target] = ACTIONS(1),
    [anon_sym_ATreservoir] = ACTIONS(1),
    [anon_sym_self_DOTpurge_LPAREN_RPAREN] = ACTIONS(1),
    [anon_sym_true] = ACTIONS(1),
    [anon_sym_false] = ACTIONS(1),
    [anon_sym_LT_TILDE] = ACTIONS(1),
    [anon_sym_TILDE_GT] = ACTIONS(1),
    [anon_sym_SLASH_QMARK] = ACTIONS(1),
    [anon_sym_DOTcry] = ACTIONS(1),
    [anon_sym_DOTTRUE] = ACTIONS(1),
    [anon_sym_DOTFALSE] = ACTIONS(1),
    [anon_sym_DOTout] = ACTIONS(1),
    [anon_sym_POUND] = ACTIONS(1),
    [anon_sym_LPAREN] = ACTIONS(1),
    [anon_sym_COMMA] = ACTIONS(1),
    [anon_sym_RPAREN] = ACTIONS(1),
    [anon_sym_LT_EQ] = ACTIONS(1),
    [anon_sym_LT] = ACTIONS(1),
    [sym_constraint_fn] = ACTIONS(1),
    [sym_hex_number] = ACTIONS(1),
    [sym_dec_number] = ACTIONS(1),
    [sym_distance_literal] = ACTIONS(1),
    [sym_comment] = ACTIONS(3),
    [sym_kw_arity] = ACTIONS(1),
    [sym_kw_handshake] = ACTIONS(1),
    [sym_kw_on_dry] = ACTIONS(1),
    [sym_kw_constraint] = ACTIONS(1),
  },
  [1] = {
    [sym_source_file] = STATE(65),
    [sym_epoch_directive] = STATE(2),
    [sym_sector_directive] = STATE(2),
    [sym_node_declaration] = STATE(2),
    [sym_reservoir_declaration] = STATE(2),
    [sym_flow_statement] = STATE(2),
    [sym_nerve_statement] = STATE(2),
    [sym_port_ref] = STATE(37),
    [sym_constraint_statement] = STATE(2),
    [aux_sym_source_file_repeat1] = STATE(2),
    [ts_builtin_sym_end] = ACTIONS(5),
    [sym_identifier] = ACTIONS(7),
    [anon_sym_DOTepoch] = ACTIONS(9),
    [anon_sym_DOTsector] = ACTIONS(11),
    [anon_sym_DOTnode] = ACTIONS(13),
    [anon_sym_ATreservoir] = ACTIONS(15),
    [anon_sym_POUND] = ACTIONS(17),
    [sym_comment] = ACTIONS(3),
  },
};

static const uint16_t ts_small_parse_table[] = {
  [0] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    ACTIONS(9), 1,
      anon_sym_DOTepoch,
    ACTIONS(11), 1,
      anon_sym_DOTsector,
    ACTIONS(13), 1,
      anon_sym_DOTnode,
    ACTIONS(15), 1,
      anon_sym_ATreservoir,
    ACTIONS(17), 1,
      anon_sym_POUND,
    ACTIONS(19), 1,
      ts_builtin_sym_end,
    STATE(37), 1,
      sym_port_ref,
    STATE(3), 8,
      sym_epoch_directive,
      sym_sector_directive,
      sym_node_declaration,
      sym_reservoir_declaration,
      sym_flow_statement,
      sym_nerve_statement,
      sym_constraint_statement,
      aux_sym_source_file_repeat1,
  [38] = 10,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(21), 1,
      ts_builtin_sym_end,
    ACTIONS(23), 1,
      sym_identifier,
    ACTIONS(26), 1,
      anon_sym_DOTepoch,
    ACTIONS(29), 1,
      anon_sym_DOTsector,
    ACTIONS(32), 1,
      anon_sym_DOTnode,
    ACTIONS(35), 1,
      anon_sym_ATreservoir,
    ACTIONS(38), 1,
      anon_sym_POUND,
    STATE(37), 1,
      sym_port_ref,
    STATE(3), 8,
      sym_epoch_directive,
      sym_sector_directive,
      sym_node_declaration,
      sym_reservoir_declaration,
      sym_flow_statement,
      sym_nerve_statement,
      sym_constraint_statement,
      aux_sym_source_file_repeat1,
  [76] = 4,
    ACTIONS(3), 1,
      sym_comment,
    STATE(23), 1,
      sym_port_accessor,
    ACTIONS(43), 4,
      anon_sym_DOTcry,
      anon_sym_DOTTRUE,
      anon_sym_DOTFALSE,
      anon_sym_DOTout,
    ACTIONS(41), 6,
      anon_sym_SEMI,
      anon_sym_LT_TILDE,
      anon_sym_TILDE_GT,
      anon_sym_SLASH_QMARK,
      anon_sym_COMMA,
      anon_sym_RPAREN,
  [97] = 5,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(45), 1,
      anon_sym_RBRACE,
    STATE(49), 1,
      sym_property_key,
    STATE(6), 2,
      sym_node_property,
      aux_sym_node_body_repeat1,
    ACTIONS(47), 5,
      anon_sym_type,
      anon_sym_tag,
      anon_sym_fire_on,
      anon_sym_sector,
      anon_sym_target,
  [118] = 5,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(49), 1,
      anon_sym_RBRACE,
    STATE(49), 1,
      sym_property_key,
    STATE(7), 2,
      sym_node_property,
      aux_sym_node_body_repeat1,
    ACTIONS(47), 5,
      anon_sym_type,
      anon_sym_tag,
      anon_sym_fire_on,
      anon_sym_sector,
      anon_sym_target,
  [139] = 5,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(51), 1,
      anon_sym_RBRACE,
    STATE(49), 1,
      sym_property_key,
    STATE(7), 2,
      sym_node_property,
      aux_sym_node_body_repeat1,
    ACTIONS(53), 5,
      anon_sym_type,
      anon_sym_tag,
      anon_sym_fire_on,
      anon_sym_sector,
      anon_sym_target,
  [160] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(56), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [173] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(58), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [186] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(60), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [199] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(62), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [212] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(64), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [225] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(66), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [238] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(68), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [251] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(70), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [264] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(72), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [277] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(74), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [290] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(76), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [303] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(78), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [316] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(80), 7,
      ts_builtin_sym_end,
      anon_sym_DOTepoch,
      anon_sym_DOTsector,
      anon_sym_DOTnode,
      anon_sym_ATreservoir,
      anon_sym_POUND,
      sym_identifier,
  [329] = 6,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(82), 1,
      anon_sym_RBRACE,
    ACTIONS(84), 1,
      sym_kw_arity,
    ACTIONS(86), 1,
      sym_kw_handshake,
    ACTIONS(88), 1,
      sym_kw_on_dry,
    STATE(26), 2,
      sym_reservoir_property,
      aux_sym_reservoir_body_repeat1,
  [349] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(90), 6,
      anon_sym_RBRACE,
      anon_sym_type,
      anon_sym_tag,
      anon_sym_fire_on,
      anon_sym_sector,
      anon_sym_target,
  [361] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(92), 6,
      anon_sym_SEMI,
      anon_sym_LT_TILDE,
      anon_sym_TILDE_GT,
      anon_sym_SLASH_QMARK,
      anon_sym_COMMA,
      anon_sym_RPAREN,
  [373] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(94), 6,
      anon_sym_SEMI,
      anon_sym_LT_TILDE,
      anon_sym_TILDE_GT,
      anon_sym_SLASH_QMARK,
      anon_sym_COMMA,
      anon_sym_RPAREN,
  [385] = 6,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(84), 1,
      sym_kw_arity,
    ACTIONS(86), 1,
      sym_kw_handshake,
    ACTIONS(88), 1,
      sym_kw_on_dry,
    ACTIONS(96), 1,
      anon_sym_RBRACE,
    STATE(21), 2,
      sym_reservoir_property,
      aux_sym_reservoir_body_repeat1,
  [405] = 6,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(98), 1,
      anon_sym_RBRACE,
    ACTIONS(100), 1,
      sym_kw_arity,
    ACTIONS(103), 1,
      sym_kw_handshake,
    ACTIONS(106), 1,
      sym_kw_on_dry,
    STATE(26), 2,
      sym_reservoir_property,
      aux_sym_reservoir_body_repeat1,
  [425] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(109), 4,
      anon_sym_RBRACE,
      sym_kw_arity,
      sym_kw_handshake,
      sym_kw_on_dry,
  [435] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(113), 1,
      sym_dec_number,
    STATE(69), 1,
      sym_property_value,
    ACTIONS(111), 2,
      sym_hex_number,
      sym_identifier,
  [449] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(115), 1,
      sym_identifier,
    ACTIONS(117), 1,
      anon_sym_self_DOTpurge_LPAREN_RPAREN,
    STATE(70), 1,
      sym_on_dry_value,
  [462] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(119), 1,
      anon_sym_SEMI,
    ACTIONS(121), 1,
      anon_sym_SLASH_QMARK,
    STATE(73), 1,
      sym_guard_clause,
  [475] = 4,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(121), 1,
      anon_sym_SLASH_QMARK,
    ACTIONS(123), 1,
      anon_sym_SEMI,
    STATE(64), 1,
      sym_guard_clause,
  [488] = 3,
    ACTIONS(3), 1,
      sym_comment,
    STATE(70), 1,
      sym_boolean_literal,
    ACTIONS(125), 2,
      anon_sym_true,
      anon_sym_false,
  [499] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    STATE(30), 1,
      sym_port_ref,
  [509] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(127), 1,
      anon_sym_LBRACE,
    STATE(14), 1,
      sym_node_body,
  [519] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    STATE(43), 1,
      sym_port_ref,
  [529] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(129), 1,
      anon_sym_LT_EQ,
    ACTIONS(131), 1,
      anon_sym_LT,
  [539] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(133), 1,
      anon_sym_LT_TILDE,
    ACTIONS(135), 1,
      anon_sym_TILDE_GT,
  [549] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    STATE(66), 1,
      sym_port_ref,
  [559] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(7), 1,
      sym_identifier,
    STATE(31), 1,
      sym_port_ref,
  [569] = 3,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(137), 1,
      anon_sym_LBRACE,
    STATE(15), 1,
      sym_reservoir_body,
  [579] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(139), 1,
      anon_sym_LPAREN,
  [586] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(141), 1,
      anon_sym_AT,
  [593] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(143), 1,
      anon_sym_COMMA,
  [600] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(145), 1,
      anon_sym_SEMI,
  [607] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(147), 1,
      anon_sym_DASH,
  [614] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(149), 1,
      anon_sym_RBRACK,
  [621] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(151), 1,
      sym_hex_number,
  [628] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(153), 1,
      anon_sym_COLON,
  [635] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(155), 1,
      anon_sym_COLON,
  [642] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(157), 1,
      sym_hex_number,
  [649] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(159), 1,
      sym_hex_number,
  [656] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(161), 1,
      anon_sym_COLON,
  [663] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(163), 1,
      anon_sym_COLON,
  [670] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(165), 1,
      anon_sym_COLON,
  [677] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(167), 1,
      sym_identifier,
  [684] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(169), 1,
      sym_hex_number,
  [691] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(171), 1,
      anon_sym_SEMI,
  [698] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(173), 1,
      sym_constraint_fn,
  [705] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(175), 1,
      anon_sym_AT,
  [712] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(177), 1,
      sym_hex_number,
  [719] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(179), 1,
      sym_dec_number,
  [726] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(181), 1,
      anon_sym_LBRACK,
  [733] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(183), 1,
      anon_sym_SEMI,
  [740] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(185), 1,
      anon_sym_SEMI,
  [747] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(187), 1,
      ts_builtin_sym_end,
  [754] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(189), 1,
      anon_sym_RPAREN,
  [761] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(191), 1,
      sym_kw_constraint,
  [768] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(193), 1,
      anon_sym_SEMI,
  [775] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(195), 1,
      anon_sym_SEMI,
  [782] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(197), 1,
      anon_sym_SEMI,
  [789] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(199), 1,
      anon_sym_SEMI,
  [796] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(201), 1,
      anon_sym_SEMI,
  [803] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(203), 1,
      anon_sym_SEMI,
  [810] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(205), 1,
      sym_identifier,
  [817] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(207), 1,
      sym_identifier,
  [824] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(209), 1,
      sym_distance_literal,
  [831] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(211), 1,
      anon_sym_SEMI,
  [838] = 2,
    ACTIONS(3), 1,
      sym_comment,
    ACTIONS(213), 1,
      sym_identifier,
};

static const uint32_t ts_small_parse_table_map[] = {
  [SMALL_STATE(2)] = 0,
  [SMALL_STATE(3)] = 38,
  [SMALL_STATE(4)] = 76,
  [SMALL_STATE(5)] = 97,
  [SMALL_STATE(6)] = 118,
  [SMALL_STATE(7)] = 139,
  [SMALL_STATE(8)] = 160,
  [SMALL_STATE(9)] = 173,
  [SMALL_STATE(10)] = 186,
  [SMALL_STATE(11)] = 199,
  [SMALL_STATE(12)] = 212,
  [SMALL_STATE(13)] = 225,
  [SMALL_STATE(14)] = 238,
  [SMALL_STATE(15)] = 251,
  [SMALL_STATE(16)] = 264,
  [SMALL_STATE(17)] = 277,
  [SMALL_STATE(18)] = 290,
  [SMALL_STATE(19)] = 303,
  [SMALL_STATE(20)] = 316,
  [SMALL_STATE(21)] = 329,
  [SMALL_STATE(22)] = 349,
  [SMALL_STATE(23)] = 361,
  [SMALL_STATE(24)] = 373,
  [SMALL_STATE(25)] = 385,
  [SMALL_STATE(26)] = 405,
  [SMALL_STATE(27)] = 425,
  [SMALL_STATE(28)] = 435,
  [SMALL_STATE(29)] = 449,
  [SMALL_STATE(30)] = 462,
  [SMALL_STATE(31)] = 475,
  [SMALL_STATE(32)] = 488,
  [SMALL_STATE(33)] = 499,
  [SMALL_STATE(34)] = 509,
  [SMALL_STATE(35)] = 519,
  [SMALL_STATE(36)] = 529,
  [SMALL_STATE(37)] = 539,
  [SMALL_STATE(38)] = 549,
  [SMALL_STATE(39)] = 559,
  [SMALL_STATE(40)] = 569,
  [SMALL_STATE(41)] = 579,
  [SMALL_STATE(42)] = 586,
  [SMALL_STATE(43)] = 593,
  [SMALL_STATE(44)] = 600,
  [SMALL_STATE(45)] = 607,
  [SMALL_STATE(46)] = 614,
  [SMALL_STATE(47)] = 621,
  [SMALL_STATE(48)] = 628,
  [SMALL_STATE(49)] = 635,
  [SMALL_STATE(50)] = 642,
  [SMALL_STATE(51)] = 649,
  [SMALL_STATE(52)] = 656,
  [SMALL_STATE(53)] = 663,
  [SMALL_STATE(54)] = 670,
  [SMALL_STATE(55)] = 677,
  [SMALL_STATE(56)] = 684,
  [SMALL_STATE(57)] = 691,
  [SMALL_STATE(58)] = 698,
  [SMALL_STATE(59)] = 705,
  [SMALL_STATE(60)] = 712,
  [SMALL_STATE(61)] = 719,
  [SMALL_STATE(62)] = 726,
  [SMALL_STATE(63)] = 733,
  [SMALL_STATE(64)] = 740,
  [SMALL_STATE(65)] = 747,
  [SMALL_STATE(66)] = 754,
  [SMALL_STATE(67)] = 761,
  [SMALL_STATE(68)] = 768,
  [SMALL_STATE(69)] = 775,
  [SMALL_STATE(70)] = 782,
  [SMALL_STATE(71)] = 789,
  [SMALL_STATE(72)] = 796,
  [SMALL_STATE(73)] = 803,
  [SMALL_STATE(74)] = 810,
  [SMALL_STATE(75)] = 817,
  [SMALL_STATE(76)] = 824,
  [SMALL_STATE(77)] = 831,
  [SMALL_STATE(78)] = 838,
};

static const TSParseActionEntry ts_parse_actions[] = {
  [0] = {.entry = {.count = 0, .reusable = false}},
  [1] = {.entry = {.count = 1, .reusable = false}}, RECOVER(),
  [3] = {.entry = {.count = 1, .reusable = true}}, SHIFT_EXTRA(),
  [5] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_source_file, 0, 0, 0),
  [7] = {.entry = {.count = 1, .reusable = true}}, SHIFT(4),
  [9] = {.entry = {.count = 1, .reusable = true}}, SHIFT(60),
  [11] = {.entry = {.count = 1, .reusable = true}}, SHIFT(78),
  [13] = {.entry = {.count = 1, .reusable = true}}, SHIFT(75),
  [15] = {.entry = {.count = 1, .reusable = true}}, SHIFT(74),
  [17] = {.entry = {.count = 1, .reusable = true}}, SHIFT(67),
  [19] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_source_file, 1, 0, 0),
  [21] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2, 0, 0),
  [23] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2, 0, 0), SHIFT_REPEAT(4),
  [26] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2, 0, 0), SHIFT_REPEAT(60),
  [29] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2, 0, 0), SHIFT_REPEAT(78),
  [32] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2, 0, 0), SHIFT_REPEAT(75),
  [35] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2, 0, 0), SHIFT_REPEAT(74),
  [38] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_source_file_repeat1, 2, 0, 0), SHIFT_REPEAT(67),
  [41] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_port_ref, 1, 0, 1),
  [43] = {.entry = {.count = 1, .reusable = true}}, SHIFT(24),
  [45] = {.entry = {.count = 1, .reusable = true}}, SHIFT(17),
  [47] = {.entry = {.count = 1, .reusable = true}}, SHIFT(48),
  [49] = {.entry = {.count = 1, .reusable = true}}, SHIFT(13),
  [51] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_node_body_repeat1, 2, 0, 0),
  [53] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_node_body_repeat1, 2, 0, 0), SHIFT_REPEAT(48),
  [56] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_nerve_statement, 5, 0, 9),
  [58] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_epoch_directive, 3, 0, 3),
  [60] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_reservoir_body, 3, 0, 0),
  [62] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_flow_statement, 4, 0, 4),
  [64] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_nerve_statement, 4, 0, 5),
  [66] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_node_body, 3, 0, 0),
  [68] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_node_declaration, 5, 0, 6),
  [70] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_reservoir_declaration, 5, 0, 6),
  [72] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_flow_statement, 5, 0, 8),
  [74] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_node_body, 2, 0, 0),
  [76] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_constraint_statement, 11, 0, 12),
  [78] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_reservoir_body, 2, 0, 0),
  [80] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_sector_directive, 8, 0, 10),
  [82] = {.entry = {.count = 1, .reusable = true}}, SHIFT(10),
  [84] = {.entry = {.count = 1, .reusable = true}}, SHIFT(52),
  [86] = {.entry = {.count = 1, .reusable = true}}, SHIFT(53),
  [88] = {.entry = {.count = 1, .reusable = true}}, SHIFT(54),
  [90] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_node_property, 4, 0, 11),
  [92] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_port_ref, 2, 0, 2),
  [94] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_port_accessor, 1, 0, 0),
  [96] = {.entry = {.count = 1, .reusable = true}}, SHIFT(19),
  [98] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_reservoir_body_repeat1, 2, 0, 0),
  [100] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_reservoir_body_repeat1, 2, 0, 0), SHIFT_REPEAT(52),
  [103] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_reservoir_body_repeat1, 2, 0, 0), SHIFT_REPEAT(53),
  [106] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_reservoir_body_repeat1, 2, 0, 0), SHIFT_REPEAT(54),
  [109] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_reservoir_property, 4, 0, 11),
  [111] = {.entry = {.count = 1, .reusable = true}}, SHIFT(68),
  [113] = {.entry = {.count = 1, .reusable = false}}, SHIFT(68),
  [115] = {.entry = {.count = 1, .reusable = false}}, SHIFT(72),
  [117] = {.entry = {.count = 1, .reusable = true}}, SHIFT(72),
  [119] = {.entry = {.count = 1, .reusable = true}}, SHIFT(11),
  [121] = {.entry = {.count = 1, .reusable = true}}, SHIFT(55),
  [123] = {.entry = {.count = 1, .reusable = true}}, SHIFT(12),
  [125] = {.entry = {.count = 1, .reusable = true}}, SHIFT(71),
  [127] = {.entry = {.count = 1, .reusable = true}}, SHIFT(5),
  [129] = {.entry = {.count = 1, .reusable = true}}, SHIFT(76),
  [131] = {.entry = {.count = 1, .reusable = false}}, SHIFT(76),
  [133] = {.entry = {.count = 1, .reusable = true}}, SHIFT(33),
  [135] = {.entry = {.count = 1, .reusable = true}}, SHIFT(39),
  [137] = {.entry = {.count = 1, .reusable = true}}, SHIFT(25),
  [139] = {.entry = {.count = 1, .reusable = true}}, SHIFT(35),
  [141] = {.entry = {.count = 1, .reusable = true}}, SHIFT(50),
  [143] = {.entry = {.count = 1, .reusable = true}}, SHIFT(38),
  [145] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_guard_clause, 2, 0, 7),
  [147] = {.entry = {.count = 1, .reusable = true}}, SHIFT(56),
  [149] = {.entry = {.count = 1, .reusable = true}}, SHIFT(57),
  [151] = {.entry = {.count = 1, .reusable = true}}, SHIFT(40),
  [153] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_property_key, 1, 0, 0),
  [155] = {.entry = {.count = 1, .reusable = true}}, SHIFT(28),
  [157] = {.entry = {.count = 1, .reusable = true}}, SHIFT(34),
  [159] = {.entry = {.count = 1, .reusable = true}}, SHIFT(45),
  [161] = {.entry = {.count = 1, .reusable = true}}, SHIFT(61),
  [163] = {.entry = {.count = 1, .reusable = true}}, SHIFT(32),
  [165] = {.entry = {.count = 1, .reusable = true}}, SHIFT(29),
  [167] = {.entry = {.count = 1, .reusable = true}}, SHIFT(44),
  [169] = {.entry = {.count = 1, .reusable = true}}, SHIFT(46),
  [171] = {.entry = {.count = 1, .reusable = true}}, SHIFT(20),
  [173] = {.entry = {.count = 1, .reusable = true}}, SHIFT(41),
  [175] = {.entry = {.count = 1, .reusable = true}}, SHIFT(47),
  [177] = {.entry = {.count = 1, .reusable = true}}, SHIFT(63),
  [179] = {.entry = {.count = 1, .reusable = true}}, SHIFT(70),
  [181] = {.entry = {.count = 1, .reusable = true}}, SHIFT(51),
  [183] = {.entry = {.count = 1, .reusable = true}}, SHIFT(9),
  [185] = {.entry = {.count = 1, .reusable = true}}, SHIFT(8),
  [187] = {.entry = {.count = 1, .reusable = true}},  ACCEPT_INPUT(),
  [189] = {.entry = {.count = 1, .reusable = true}}, SHIFT(36),
  [191] = {.entry = {.count = 1, .reusable = true}}, SHIFT(58),
  [193] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_property_value, 1, 0, 0),
  [195] = {.entry = {.count = 1, .reusable = true}}, SHIFT(22),
  [197] = {.entry = {.count = 1, .reusable = true}}, SHIFT(27),
  [199] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_boolean_literal, 1, 0, 0),
  [201] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_on_dry_value, 1, 0, 0),
  [203] = {.entry = {.count = 1, .reusable = true}}, SHIFT(16),
  [205] = {.entry = {.count = 1, .reusable = true}}, SHIFT(59),
  [207] = {.entry = {.count = 1, .reusable = true}}, SHIFT(42),
  [209] = {.entry = {.count = 1, .reusable = true}}, SHIFT(77),
  [211] = {.entry = {.count = 1, .reusable = true}}, SHIFT(18),
  [213] = {.entry = {.count = 1, .reusable = true}}, SHIFT(62),
};

#ifdef __cplusplus
extern "C" {
#endif
#ifdef TREE_SITTER_HIDE_SYMBOLS
#define TS_PUBLIC
#elif defined(_WIN32)
#define TS_PUBLIC __declspec(dllexport)
#else
#define TS_PUBLIC __attribute__((visibility("default")))
#endif

TS_PUBLIC const TSLanguage *tree_sitter_river(void) {
  static const TSLanguage language = {
    .version = LANGUAGE_VERSION,
    .symbol_count = SYMBOL_COUNT,
    .alias_count = ALIAS_COUNT,
    .token_count = TOKEN_COUNT,
    .external_token_count = EXTERNAL_TOKEN_COUNT,
    .state_count = STATE_COUNT,
    .large_state_count = LARGE_STATE_COUNT,
    .production_id_count = PRODUCTION_ID_COUNT,
    .field_count = FIELD_COUNT,
    .max_alias_sequence_length = MAX_ALIAS_SEQUENCE_LENGTH,
    .parse_table = &ts_parse_table[0][0],
    .small_parse_table = ts_small_parse_table,
    .small_parse_table_map = ts_small_parse_table_map,
    .parse_actions = ts_parse_actions,
    .symbol_names = ts_symbol_names,
    .field_names = ts_field_names,
    .field_map_slices = ts_field_map_slices,
    .field_map_entries = ts_field_map_entries,
    .symbol_metadata = ts_symbol_metadata,
    .public_symbol_map = ts_symbol_map,
    .alias_map = ts_non_terminal_alias_map,
    .alias_sequences = &ts_alias_sequences[0][0],
    .lex_modes = ts_lex_modes,
    .lex_fn = ts_lex,
    .keyword_lex_fn = ts_lex_keywords,
    .keyword_capture_token = sym_identifier,
    .primary_state_ids = ts_primary_state_ids,
  };
  return &language;
}
#ifdef __cplusplus
}
#endif
