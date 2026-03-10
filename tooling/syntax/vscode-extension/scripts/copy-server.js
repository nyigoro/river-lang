const fs = require("node:fs");
const path = require("node:path");

const lspDist = path.resolve(__dirname, "..", "..", "..", "lsp", "dist");
const dest = path.resolve(__dirname, "..", "server");

if (!fs.existsSync(lspDist)) {
  console.error(`LSP build output not found at ${lspDist}. Run 'npm --prefix ../../lsp run build' first.`);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(lspDist, dest, { recursive: true });

console.log(`Copied LSP server from ${lspDist} to ${dest}`);
