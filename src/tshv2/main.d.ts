export declare enum TokenType {
    VAR = "VAR",
    FN = "FN",
    WARP_FN = "WFN",
    IDENTIFIER = "IDENTIFIER",
    NUMBER = "NUMBER",
    ASSIGN = "ASSIGN",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    LBRACE = "LBRACE",
    RBRACE = "RBRACE",
    COMMA = "COMMA",
    BINOP = "BINOP",
    STRING = "STRING",
    IF = "IF",
    FOR = "FOR",
    ELSE = "ELSE",
    EOF = "EOF",
    GREENFLAG = "GREENFLAG",
    INCLUDE = "INCLUDE",
    LIST = "LIST",
    NOT = "NOT",
    RETURN = "RETURN",
    ASSIGNBINOP = "ASSIGNBINOP",
    LBRACKET = "LBRAKET",
    RBRACKET = "RBRAKET",
    COLON_THINGY = "COLON_THINGY",
    ON = "ON",
    IN = "IN"
}
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    end: number;
    start: number;
}
export declare class Lexer {
    private source;
    private position;
    constructor(source: string);
    private isAlpha;
    private isDigit;
    private isWhitespace;
    private advance;
    private peek;
    private match;
    pushToken(tokenData: {
        type: TokenType;
        value: string;
        line: number;
        start?: number;
    }): void;
    tokens: Token[];
    tokenize(): Token[];
}
export type NodeType = "VariableDeclaration" | "FunctionDeclaration" | "Assignment" | "BinaryExpression" | "Not" | "Literal" | "Identifier" | "FunctionCall" | "BranchFunctionCall" | "StartBlock" | "If" | "For" | "GreenFlag" | "Boolean" | "Include" | "ListDeclaration" | "Return" | "ObjectAccess" | "ObjectMethodCall" | "OnEvent";
export interface ASTNode {
    type: string;
}
export interface VariableDeclarationNode extends ASTNode {
    type: "VariableDeclaration";
    identifier: string;
    value: ASTNode;
    vtype: 'var' | 'global';
}
export interface FunctionDeclarationNode extends ASTNode {
    type: "FunctionDeclaration";
    name: string;
    params: string[];
    body: ASTNode[];
    /** run without screen refresh */
    warp: boolean;
}
export interface AssignmentNode extends ASTNode {
    type: "Assignment";
    identifier: string;
    value: ASTNode;
}
export interface BinaryExpressionNode extends ASTNode {
    type: "BinaryExpression";
    operator: string;
    left: ASTNode;
    right: ASTNode;
}
export interface NotNode extends ASTNode {
    type: "Not";
    body: ASTNode;
}
export interface LiteralNode extends ASTNode {
    type: "Literal";
    value: string | number;
}
export interface IdentifierNode extends ASTNode {
    type: "Identifier";
    name: string;
}
export interface FunctionCallNode extends ASTNode {
    type: "FunctionCall";
    identifier: string;
    args: ASTNode[];
}
export interface BranchFunctionCallNode extends ASTNode {
    type: "BranchFunctionCall";
    identifier: string;
    args: ASTNode[];
    branches: ASTNode[][];
}
export interface StartBlockNode extends ASTNode {
    type: "StartBlock";
    body: ASTNode[];
}
export interface IfNode extends ASTNode {
    type: "If";
    condition: ASTNode;
    thenBranch: ASTNode[];
    elseBranch?: ASTNode[];
}
export interface ForNode extends ASTNode {
    type: "For";
    times: ASTNode;
    varname: IdentifierNode;
    branch: ASTNode[];
    define: boolean;
}
export interface GreenFlagNode extends ASTNode {
    type: "GreenFlag";
    branch: ASTNode[];
}
export interface BooleanNode extends ASTNode {
    type: "Boolean";
    value: boolean;
}
export interface IncludeNode extends ASTNode {
    type: "Include";
    itype: string;
    path: string;
}
export interface ListDeclarationNode extends ASTNode {
    type: "ListDeclaration";
    identifier: string;
    value: ASTNode[];
    vtype: 'list' | 'global';
}
export interface ReturnNode extends ASTNode {
    type: "Return";
    value: ASTNode;
}
export interface ObjectAccessNode extends ASTNode {
    type: "ObjectAccess";
    object: ASTNode;
    property: string;
}
export interface ObjectMethodCallNode extends ASTNode {
    type: "ObjectMethodCall";
    object: ASTNode;
    method: string;
    args: ASTNode[];
}
export interface OnEventNode extends ASTNode {
    type: "OnEvent";
    branch: ASTNode[];
    event: string;
}
export type Node = VariableDeclarationNode | FunctionDeclarationNode | AssignmentNode | BinaryExpressionNode | NotNode | LiteralNode | IdentifierNode | FunctionCallNode | BranchFunctionCallNode | StartBlockNode | IfNode | ForNode | GreenFlagNode | BooleanNode | IncludeNode | ListDeclarationNode | ReturnNode | ObjectAccessNode | ObjectMethodCallNode | OnEventNode;
export declare class Parser {
    private tokens;
    private source;
    position: number;
    localVars: string[];
    globalVars: string[];
    localLists: string[];
    globalLists: string[];
    traces: boolean;
    constructor(tokens: Token[], source: string);
    private peek;
    private trace;
    private advance;
    private match;
    private matchTk;
    private expect;
    parse(): ASTNode[];
    private parseStatement;
    private parseBlock;
    private parseAssignment;
    private parseBinaryExpression;
    private parseCall;
    private finishCall;
    private parsePrimary;
}
