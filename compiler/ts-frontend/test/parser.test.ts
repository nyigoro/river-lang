import { strict as assert } from "node:assert";
import test from "node:test";
import { parseTokens } from "../src/parser/parser.js";

// Parser unit tests will expand in phase 3.
test("parser placeholder", () => {
  const ast = parseTokens([]);
  assert.equal(ast.epoch, "");
});