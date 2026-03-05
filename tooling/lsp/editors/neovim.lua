-- RIVER-LANG LSP — Neovim configuration
-- Place in: ~/.config/nvim/after/ftplugin/rasm.lua
-- Or add to your init.lua / plugins config.
--
-- Prerequisites:
--   npm install -g river-lang-lsp   (once published)
--   OR: node /path/to/river-lang-lsp/dist/server.js --stdio
--
-- Also add this to tell Neovim about .rasm files:
--   vim.filetype.add({ extension = { rasm = 'rasm' } })

local lspconfig = require('lspconfig')
local configs   = require('lspconfig.configs')

-- Register the river-lang server if not already known
if not configs.river_lang then
  configs.river_lang = {
    default_config = {
      -- Use the globally installed binary or a local path
      cmd         = { 'river-lang-lsp', '--stdio' },
      -- Alternatively, point directly at the built server:
      -- cmd = { 'node', vim.fn.expand('~/river-lang/tooling/lsp/dist/server.js'), '--stdio' },

      filetypes   = { 'rasm' },
      root_dir    = lspconfig.util.root_pattern('.river-root', 'Cargo.toml', '.git'),
      single_file_support = true,

      settings = {},
    },
  }
end

lspconfig.river_lang.setup({
  on_attach = function(client, bufnr)
    local opts = { noremap = true, silent = true, buffer = bufnr }

    -- Standard LSP keymaps
    vim.keymap.set('n', 'gd',         vim.lsp.buf.definition,     opts)  -- go-to definition
    vim.keymap.set('n', 'gr',         vim.lsp.buf.references,     opts)  -- find references
    vim.keymap.set('n', 'K',          vim.lsp.buf.hover,          opts)  -- hover docs
    vim.keymap.set('n', '<leader>ds', vim.lsp.buf.document_symbol, opts) -- outline

    -- Diagnostics
    vim.keymap.set('n', '[d', vim.diagnostic.goto_prev, opts)
    vim.keymap.set('n', ']d', vim.diagnostic.goto_next, opts)
    vim.keymap.set('n', '<leader>e', vim.diagnostic.open_float, opts)
  end,

  capabilities = require('cmp_nvim_lsp').default_capabilities(), -- if using nvim-cmp
})