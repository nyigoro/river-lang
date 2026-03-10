import { readFileSync } from "node:fs";
import { parseTokens, tokenize, typeCheck } from "./index.js";

function main(): void {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: npm run dev -- <file.rasm>");
    process.exit(1);
  }

  const source = readFileSync(inputPath, "utf8");
  const tokens = tokenize(source);
  const { ast, errors } = parseTokens(tokens);
  const result = typeCheck(ast, errors);

  if (!result.ok) {
    for (const diag of result.diagnostics) {
      console.error(`[typecheck] ${diag.message}`);
    }
    process.exit(2);
  }

  console.log(JSON.stringify(ast, null, 2));
}

main();
