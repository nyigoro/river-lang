import { Token, TokenKind } from "./token.js";

const SINGLE_TOKENS: Record<string, TokenKind> = {
  ".epoch": "DotEpoch",
  ".sector": "DotSector",
  ".node": "DotNode",
  "@reservoir": "Reservoir",
  "<~": "FlowIn",
  "~>": "FlowOut",
  "/?": "Guard"
};

function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\r" || ch === "\n";
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let column = 1;
  const charAt = (index: number): string => source.charAt(index);

  const pushToken = (kind: TokenKind, lexeme: string, startOffset: number, startLine: number, startColumn: number): void => {
    tokens.push({
      kind,
      lexeme,
      start: { offset: startOffset, line: startLine, column: startColumn },
      end: { offset: i, line, column }
    });
  };

  while (i < source.length) {
    const ch = charAt(i);

    if (ch === "\n") {
      i += 1;
      line += 1;
      column = 1;
      continue;
    }

    if (ch === ";") {
      while (i < source.length && charAt(i) !== "\n") {
        i += 1;
        column += 1;
      }
      continue;
    }

    if (ch === "#") {
      const startOffset = i;
      const startLine = line;
      const startColumn = column;
      i += 1;
      column += 1;
      while (i < source.length && !isWhitespace(charAt(i))) {
        i += 1;
        column += 1;
      }
      pushToken("Constraint", source.slice(startOffset, i), startOffset, startLine, startColumn);
      continue;
    }

    if (isWhitespace(ch)) {
      i += 1;
      column += 1;
      continue;
    }

    const startOffset = i;
    const startLine = line;
    const startColumn = column;

    const maybeTwo = source.slice(i, i + 2);
    const maybeDirective = source.slice(i).match(/^(\.epoch|\.sector|\.node|@reservoir)/)?.[0];

    const directiveKind = maybeDirective ? SINGLE_TOKENS[maybeDirective] : undefined;
    if (maybeDirective && directiveKind) {
      i += maybeDirective.length;
      column += maybeDirective.length;
      pushToken(directiveKind, maybeDirective, startOffset, startLine, startColumn);
      continue;
    }

    const twoKind = SINGLE_TOKENS[maybeTwo];
    if (twoKind) {
      i += 2;
      column += 2;
      pushToken(twoKind, maybeTwo, startOffset, startLine, startColumn);
      continue;
    }

    while (i < source.length && !isWhitespace(charAt(i))) {
      i += 1;
      column += 1;
    }
    pushToken("Identifier", source.slice(startOffset, i), startOffset, startLine, startColumn);
  }

  tokens.push({
    kind: "EOF",
    lexeme: "",
    start: { offset: source.length, line, column },
    end: { offset: source.length, line, column }
  });

  return tokens;
}
