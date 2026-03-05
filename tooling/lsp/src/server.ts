#!/usr/bin/env node
/**
 * RIVER-LANG LSP — src/server.ts
 *
 * Protocol-level language server. Works with any LSP client:
 * Neovim (nvim-lspconfig), Helix, Emacs (lsp-mode), VSCode, etc.
 *
 * Capabilities:
 *   - textDocument/publishDiagnostics  — lexer + parser + semantic errors
 *   - textDocument/hover               — node type, address, sector, constraints
 *   - textDocument/definition          — go-to node declaration
 *   - textDocument/references          — find all uses of a node
 *   - textDocument/completion          — keywords, node names, port accessors
 *   - textDocument/documentSymbol      — outline: nodes, sectors, reservoir
 *
 * Transport: --stdio (default) for all clients.
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  Diagnostic,
  DiagnosticSeverity,
  Hover,
  Location,
  CompletionItem,
  CompletionItemKind,
  DocumentSymbol,
  SymbolKind as LspSymbolKind,
  Range,
  Position,
  MarkupKind,
  TextDocumentPositionParams,
  ReferenceParams,
  CompletionParams,
  DocumentSymbolParams,
  DefinitionParams,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { tokenize }  from './lexer';
import { parse }     from './parser';
import { analyse }   from './analyser';
import { Span, Symbol, ChannelGraphAst, LspDiag } from './types';

// ── Connection setup ──────────────────────────────────────────────────────────

const connection = createConnection(ProposedFeatures.all);
const documents  = new TextDocuments(TextDocument);

// Per-document analysis cache
interface DocState {
  ast:     ChannelGraphAst;
  symbols: Map<string, Symbol>;
  diags:   LspDiag[];
}
const cache = new Map<string, DocState>();

// ── Conversion helpers ────────────────────────────────────────────────────────

function spanToRange(span: Span): Range {
  return {
    start: { line: span.start.line, character: span.start.column },
    end:   { line: span.end.line,   character: span.end.column   },
  };
}

function lspSeverity(s: LspDiag['severity']): DiagnosticSeverity {
  switch (s) {
    case 'error':   return DiagnosticSeverity.Error;
    case 'warning': return DiagnosticSeverity.Warning;
    case 'info':    return DiagnosticSeverity.Information;
    case 'hint':    return DiagnosticSeverity.Hint;
    default:        return DiagnosticSeverity.Error;
  }
}

// ── Analysis pipeline ─────────────────────────────────────────────────────────

function analyseDocument(doc: TextDocument): DocState {
  const src  = doc.getText();
  const { tokens, errors: lexErrors } = tokenize(src);
  const { ast, diags: parseErrors }   = parse(tokens);
  const { diags: semErrors, symbols } = analyse(ast);

  const allDiags: LspDiag[] = [
    ...lexErrors.map(e => ({
      severity: 'error' as const,
      rule:     'lex',
      message:  e.message,
      span:     e.span,
    })),
    ...parseErrors,
    ...semErrors,
  ];

  return { ast, symbols, diags: allDiags };
}

function publishDiagnostics(doc: TextDocument): DocState {
  const state = analyseDocument(doc);
  cache.set(doc.uri, state);

  const lspDiags: Diagnostic[] = state.diags.map(d => ({
    severity: lspSeverity(d.severity),
    range:    spanToRange(d.span),
    message:  d.hint ? `${d.message}\n\n${d.hint}` : d.message,
    source:   'river-lang',
    code:     d.rule,
  }));

  connection.sendDiagnostics({ uri: doc.uri, diagnostics: lspDiags });
  return state;
}

// ── Find token at position ────────────────────────────────────────────────────

function wordAtPosition(doc: TextDocument, pos: Position): string | null {
  const line = doc.getText({
    start: { line: pos.line, character: 0 },
    end:   { line: pos.line, character: 10000 },
  });
  const ch = pos.character;
  let start = ch;
  let end   = ch;
  const isIdent = (c: string) => /[a-zA-Z0-9_]/.test(c);
  while (start > 0 && isIdent(line[start - 1])) start--;
  while (end < line.length && isIdent(line[end])) end++;
  if (start === end) return null;
  return line.slice(start, end);
}

// ── Initialization ────────────────────────────────────────────────────────────

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider:           true,
      definitionProvider:      true,
      referencesProvider:      true,
      completionProvider:      { triggerCharacters: ['.', '@', '#', '<', '~'] },
      documentSymbolProvider:  true,
    },
    serverInfo: { name: 'river-lang-lsp', version: '0.1.0' },
  };
});

// ── Document events ───────────────────────────────────────────────────────────

documents.onDidChangeContent(change => {
  publishDiagnostics(change.document);
});

documents.onDidOpen(e => {
  publishDiagnostics(e.document);
});

documents.onDidClose(e => {
  cache.delete(e.document.uri);
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// ── Hover ─────────────────────────────────────────────────────────────────────

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const state = cache.get(doc.uri) ?? publishDiagnostics(doc);
  const word  = wordAtPosition(doc, params.position);
  if (!word) return null;

  const sym = state.symbols.get(word);
  if (!sym) return null;

  // Build hover markdown
  const lines: string[] = [];

  if (sym.kind === 'node') {
    // Find node in AST
    const node = state.ast.nodes.find(n => n.name === word);
    lines.push(`**${sym.name}** *(node)*`);
    if (node) {
      lines.push('');
      lines.push(`\`\`\`\ntype:    ${node.nodeType || '?'}\naddress: 0x${node.address.toString(16).toUpperCase().padStart(4,'0')}\n${node.sector ? `sector:  ${node.sector}` : ''}\n${node.tag    ? `tag:     ${node.tag}` : ''}\n\`\`\``);
    }

    // Find flows involving this node
    const outFlows = state.ast.flows.filter(f => f.from.node === word).map(f => `  → ${f.to.node}${f.to.accessor ? `.${f.to.accessor}` : ''}`);
    const inFlows  = state.ast.flows.filter(f => f.to.node   === word).map(f => `  ← ${f.from.node}${f.from.accessor ? `.${f.from.accessor}` : ''}`);
    const nerves   = state.ast.nerves.filter(f => f.from.node === word || f.to.node === word)
                       .map(f => `  ${f.from.node}.cry ~> ${f.to.node}`);

    if (outFlows.length || inFlows.length) {
      lines.push('');
      lines.push('**Connections:**');
      lines.push(...inFlows, ...outFlows);
    }
    if (nerves.length) {
      lines.push('');
      lines.push('**Nerves:**');
      lines.push(...nerves);
    }

    // Constraints involving this node
    const constraints = state.ast.constraints.filter(
      c => c.portA.node === word || c.portB.node === word
    ).map(c => `  ${c.fn}(${c.portA.node}${c.portA.accessor?`.${c.portA.accessor}`:''}, ${c.portB.node}) ${c.op} ${c.value}${c.unit}`);
    if (constraints.length) {
      lines.push('');
      lines.push('**Constraints:**');
      lines.push(...constraints);
    }

  } else if (sym.kind === 'sector') {
    const sec = state.ast.sectors.find(s => s.name === word)!;
    lines.push(`**${sym.name}** *(sector)*`);
    lines.push('');
    lines.push(`\`\`\`\nrange: [0x${sec.start.toString(16).toUpperCase()} - 0x${sec.end.toString(16).toUpperCase()}]\nsize:  ${sec.end - sec.start + 1} addresses\n\`\`\``);
    const nodesInSector = state.ast.nodes.filter(n => n.sector === word);
    if (nodesInSector.length) {
      lines.push('');
      lines.push(`**Nodes (${nodesInSector.length}):** ${nodesInSector.map(n => n.name).join(', ')}`);
    }

  } else if (sym.kind === 'reservoir') {
    const res = state.ast.reservoir!;
    lines.push(`**${sym.name}** *(reservoir)*`);
    lines.push('');
    lines.push(`\`\`\`\naddress:   0x${res.address.toString(16).toUpperCase().padStart(4,'0')}\narity:     ${res.arity}\nhandshake: ${res.handshake}\non_dry:    ${res.onDry}\n\`\`\``);
  }

  return {
    contents: { kind: MarkupKind.Markdown, value: lines.join('\n') },
    range:    spanToRange(sym.span),
  };
});

// ── Go-to definition ──────────────────────────────────────────────────────────

connection.onDefinition((params: DefinitionParams): Location | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const state = cache.get(doc.uri) ?? publishDiagnostics(doc);
  const word  = wordAtPosition(doc, params.position);
  if (!word) return null;

  const sym = state.symbols.get(word);
  if (!sym) return null;

  return {
    uri:   params.textDocument.uri,
    range: spanToRange(sym.span),
  };
});

// ── References ────────────────────────────────────────────────────────────────

connection.onReferences((params: ReferenceParams): Location[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const state = cache.get(doc.uri) ?? publishDiagnostics(doc);
  const word  = wordAtPosition(doc, params.position);
  if (!word) return [];

  const locations: Location[] = [];
  const uri = params.textDocument.uri;

  // Include declaration
  if (params.context.includeDeclaration) {
    const sym = state.symbols.get(word);
    if (sym) locations.push({ uri, range: spanToRange(sym.span) });
  }

  // All flows referencing this node
  for (const flow of [...state.ast.flows, ...state.ast.nerves]) {
    if (flow.from.node === word || flow.to.node === word) {
      locations.push({ uri, range: spanToRange(flow.span) });
    }
  }

  // All constraints referencing this node
  for (const c of state.ast.constraints) {
    if (c.portA.node === word || c.portB.node === word) {
      locations.push({ uri, range: spanToRange(c.span) });
    }
  }

  return locations;
});

// ── Completion ────────────────────────────────────────────────────────────────

const DIRECTIVE_COMPLETIONS: CompletionItem[] = [
  { label: '.epoch',  kind: CompletionItemKind.Keyword, detail: '.epoch 0x<EPOCH_ID>;', documentation: 'Set the hardware epoch for this channel graph.' },
  { label: '.sector', kind: CompletionItemKind.Keyword, detail: '.sector <Name> [0x000 - 0x1FF];', documentation: 'Declare a physical sector (address range).' },
  { label: '.node',   kind: CompletionItemKind.Keyword, detail: '.node <Name> @ 0x<ADDR> { type: ...; }', documentation: 'Declare a processing node.' },
  { label: '@reservoir', kind: CompletionItemKind.Keyword, detail: '@reservoir <Name> @ 0x<ADDR> { arity: 1; }', documentation: 'Declare the output reservoir.' },
  { label: '#constraint', kind: CompletionItemKind.Keyword, detail: '#constraint max_dist(A.cry, B) <= 1.5mm;', documentation: 'Add a layout distance constraint.' },
];

const KEYWORD_COMPLETIONS: CompletionItem[] = [
  { label: 'type',      kind: CompletionItemKind.Property, detail: 'type: <NodeType>;' },
  { label: 'tag',       kind: CompletionItemKind.Property, detail: 'tag: <TagValue>;' },
  { label: 'fire_on',   kind: CompletionItemKind.Property, detail: 'fire_on: <Event>;' },
  { label: 'arity',     kind: CompletionItemKind.Property, detail: 'arity: <N>;' },
  { label: 'handshake', kind: CompletionItemKind.Property, detail: 'handshake: true;' },
  { label: 'on_dry',    kind: CompletionItemKind.Property, detail: 'on_dry: self.purge();' },
  { label: 'sector',    kind: CompletionItemKind.Property, detail: 'sector: <SectorName>;' },
  { label: 'max_dist',  kind: CompletionItemKind.Function, detail: 'max_dist(A.cry, B) <= 1.5mm' },
];

const PORT_COMPLETIONS: CompletionItem[] = [
  { label: '.cry',   kind: CompletionItemKind.Field, detail: 'Cry (thirst) port — Layer 3 upstream', documentation: 'Used in nerve connections: Node.cry ~> UpstreamNode' },
  { label: '.TRUE',  kind: CompletionItemKind.Field, detail: 'Gate TRUE branch output' },
  { label: '.FALSE', kind: CompletionItemKind.Field, detail: 'Gate FALSE branch output' },
  { label: '.out',   kind: CompletionItemKind.Field, detail: 'Node output port' },
];

const FLOW_COMPLETIONS: CompletionItem[] = [
  { label: '<~', kind: CompletionItemKind.Operator, detail: 'Downstream flow:  A <~ B  (B flows into A)' },
  { label: '~>', kind: CompletionItemKind.Operator, detail: 'Upstream nerve:   A.cry ~> B  (A sends Cry to B)' },
];

connection.onCompletion((params: CompletionParams): CompletionItem[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const state = cache.get(doc.uri) ?? publishDiagnostics(doc);

  // Node name completions from the symbol table
  const nodeCompletions: CompletionItem[] = [];
  for (const [name, sym] of state.symbols) {
    const kind = sym.kind === 'node'      ? CompletionItemKind.Variable
               : sym.kind === 'sector'    ? CompletionItemKind.Module
               : /* reservoir */            CompletionItemKind.Class;
    nodeCompletions.push({
      label:         name,
      kind,
      detail:        sym.detail,
      documentation: `${sym.kind} @ 0x${sym.address.toString(16).toUpperCase()}`,
    });
  }

  return [
    ...DIRECTIVE_COMPLETIONS,
    ...KEYWORD_COMPLETIONS,
    ...PORT_COMPLETIONS,
    ...FLOW_COMPLETIONS,
    ...nodeCompletions,
  ];
});

// ── Document symbols (outline) ────────────────────────────────────────────────

connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const state = cache.get(doc.uri) ?? publishDiagnostics(doc);
  const result: DocumentSymbol[] = [];

  // Sectors
  for (const sec of state.ast.sectors) {
    result.push({
      name:           sec.name,
      detail:         `[0x${sec.start.toString(16).toUpperCase()}-0x${sec.end.toString(16).toUpperCase()}]`,
      kind:           LspSymbolKind.Module,
      range:          spanToRange(sec.span),
      selectionRange: spanToRange(sec.span),
    });
  }

  // Nodes
  for (const node of state.ast.nodes) {
    result.push({
      name:           node.name,
      detail:         `${node.nodeType} @ 0x${node.address.toString(16).toUpperCase().padStart(4,'0')}`,
      kind:           LspSymbolKind.Object,
      range:          spanToRange(node.span),
      selectionRange: spanToRange(node.span),
    });
  }

  // Reservoir
  if (state.ast.reservoir) {
    const res = state.ast.reservoir;
    result.push({
      name:           res.name,
      detail:         `reservoir @ 0x${res.address.toString(16).toUpperCase().padStart(4,'0')}`,
      kind:           LspSymbolKind.Class,
      range:          spanToRange(res.span),
      selectionRange: spanToRange(res.span),
    });
  }

  return result;
});

// ── Start ─────────────────────────────────────────────────────────────────────

documents.listen(connection);
connection.listen();
