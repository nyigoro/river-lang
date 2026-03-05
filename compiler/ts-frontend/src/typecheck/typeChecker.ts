import { ChannelGraphAst } from "../parser/ast.js";

export interface TypeCheckResult {
  ok: boolean;
  diagnostics: string[];
}

export function typeCheck(ast: ChannelGraphAst): TypeCheckResult {
  const diagnostics: string[] = [];

  if (!ast.epoch) {
    diagnostics.push("Missing .epoch declaration.");
  }

  return {
    ok: diagnostics.length === 0,
    diagnostics
  };
}