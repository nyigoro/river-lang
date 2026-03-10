# RIVER-LANG Syntax Highlighting

Two grammar formats covering all major editors.

## Files

```
tooling/syntax/
├── river-lang.tmLanguage.json          TextMate grammar (VSCode, Helix, Zed, Sublime)
├── vscode-extension/
│   ├── package.json                    VSCode extension manifest
│   └── language-configuration.json    Brackets, comments, auto-pairs
└── tree-sitter-river/
    ├── grammar.js                      Tree-sitter grammar definition
    ├── package.json                    npm metadata for tree-sitter
    ├── queries/
    │   ├── highlights.scm              Highlight captures (Neovim, Helix, Zed)
    │   ├── locals.scm                  Scope/definition/reference queries
    │   └── indents.scm                 Indentation hints
    └── test/corpus/
        └── fibonacci.txt              corpus parse correctness tests
```

## Tokens highlighted

| Token | Scope |
|---|---|
| `//` comments | `comment.line` |
| `.epoch`, `.sector`, `.node`, `@reservoir` | `keyword.control.directive` |
| Node names | `entity.name.function.node` |
| Sector names | `entity.name.type.sector` |
| Reservoir name | `entity.name.type.reservoir` |
| `0x...` addresses | `constant.numeric.hex` |
| `<~` flow operator | `keyword.operator.flow.downstream` |
| `~>` nerve operator | `keyword.operator.flow.upstream.nerve` |
| `.cry`, `.TRUE`, `.FALSE`, `.out` | `variable.other.port-accessor` |
| `self.purge()` | `support.function.builtin` |
| `#constraint`, `max_dist` | `keyword.control.constraint` |
| `<`, `<=` constraint operators | `keyword.operator.comparison` |
| `/?` guard operator | `keyword.operator.guard` |
| `1.5mm` distances | `constant.numeric.float.distance` |
| `true`, `false` | `constant.language.boolean` |
| Property keys (`type:`, `arity:`, …) | `keyword.other.property` |

## VSCode

Copy `vscode-extension/` alongside `river-lang.tmLanguage.json` and load as an
unpacked extension (`Extensions: Install from VSIX` or Developer mode).

Once published to the Marketplace, install by name: `river-lang`.

## Helix

Add to `~/.config/helix/languages.toml`:

```toml
[[language]]
name       = "rasm"
scope      = "source.rasm"
file-types = ["rasm"]
comment-token = "//"
grammar    = "river"

[language.language-server.river-lang-lsp]
command = "river-lang-lsp"
args    = ["--stdio"]
```

Point Helix at the Tree-sitter grammar by adding to your Helix `grammars` config:

```toml
[[grammar]]
name   = "river"
source = { path = "/path/to/river-lang/tooling/syntax/tree-sitter-river" }
```

Then run `hx --grammar build`.

## Neovim (nvim-treesitter)

```lua
-- In your nvim-treesitter config:
require('nvim-treesitter.configs').setup({
  ensure_installed = {},   -- manual install below
})

-- Register the parser
local parser_config = require('nvim-treesitter.parsers').get_parser_configs()
parser_config.river = {
  install_info = {
    url    = '/path/to/river-lang/tooling/syntax/tree-sitter-river',
    files  = { 'src/parser.c' },
    branch = 'main',
  },
  filetype = 'rasm',
}

-- Associate .rasm files with the parser
vim.filetype.add({ extension = { rasm = 'rasm' } })
```

Then in Neovim: `:TSInstall river`

## Building the Tree-sitter parser

Requires `tree-sitter-cli` ≥ 0.22:

```bash
cd tooling/syntax/tree-sitter-river
npm install
npm run generate   # produces src/parser.c
npm run test       # runs corpus tests in test/corpus/
```
Commit `src/parser.c` if your editor/plugin manager consumes the grammar
without running `npm run generate` automatically.

On Windows, `tree-sitter-cli` can fail under some Node versions (for example
Node 24 with `EISDIR: lstat 'C:'`). If that happens, run the same commands in
WSL with Node 22 LTS.
