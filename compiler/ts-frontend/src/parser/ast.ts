export interface AstNode {
  id: string;
  sector?: string;
}

export interface AstFlow {
  from: string;
  to: string;
  guard?: string;
}

export interface ChannelGraphAst {
  epoch: string;
  nodes: AstNode[];
  flows: AstFlow[];
  constraints: string[];
}