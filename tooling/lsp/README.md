# RIVER-LANG Language Server

Protocol-level LSP server for `.rasm` files. Works with any LSP client.

## Capabilities

| Feature | Description |
|---|---|
| Diagnostics | Lexer errors, parse errors, semantic rules R0–R7 |
| Hover | Node type, address, sector, connections, constraints |
| Go-to definition | Jump to any node/sector/reservoir declaration |
| Find references | All flows, nerves, constraints referencing a node |
| Completion | Keywords, directives, node names, port accessors |
| Document outline | Symbols panel with nodes, sectors, reservoir |

## Build

```bash
cd tooling/lsp
npm install
npm run build
```

## Run

```bash
# stdio transport (works with all clients)
node dist/server.js --stdio
```

## Editor Setup

### Neovim (nvim-lspconfig)
See `editors/neovim.lua`. Add to your config:
```lua
vim.filetype.add({ extension = { rasm = 'rasm' } })
```
Then source `editors/neovim.lua`.

### Helix
Copy the contents of `editors/helix.toml` into `~/.config/helix/languages.toml`.

### VSCode
Install a generic LSP client extension, then add the snippet from
`editors/vscode-settings.json` to your `.vscode/settings.json`.

## Tests

```bash
npm run build && node --test dist/server.test.js
# 41 tests: Lexer (15) + Parser (11) + Analyser (15)
```

## Diagnostic Rules

| Rule | Description |
|---|---|
| R0 | `.epoch` missing or zero |
| R1 | Undefined node reference in flow/nerve/constraint |
| R2 | Duplicate node name |
| R3 | Duplicate physical address |
| R4 | Reservoir missing but referenced |
| R5 | Nerve source must use `.cry` port |
| R6 | Node address outside all sector ranges |
| R7 | Constraint distance exceeds configured maximum |
