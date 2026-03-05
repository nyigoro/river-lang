import { Token } from "../lexer/token.js";
import { ChannelGraphAst } from "./ast.js";

export function parseTokens(tokens: Token[]): ChannelGraphAst {
  let epoch = "";
  const constraints: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) {
      continue;
    }

    const next = tokens[i + 1];

    if (token.kind === "DotEpoch" && next?.kind === "Identifier") {
      epoch = next.lexeme;
    }
    if (token.kind === "Constraint") {
      constraints.push(token.lexeme);
    }
  }

  return {
    epoch,
    nodes: [],
    flows: [],
    constraints
  };
}
