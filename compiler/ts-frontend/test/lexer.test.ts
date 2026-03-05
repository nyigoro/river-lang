import { strict as assert } from "node:assert";
import test from "node:test";
import { tokenize } from "../src/lexer/lexer.js";

test("tokenizes epoch", () => {
  const tokens = tokenize(".epoch alpha");
  assert.equal(tokens[0]?.kind, "DotEpoch");
  assert.equal(tokens[1]?.kind, "Identifier");
});