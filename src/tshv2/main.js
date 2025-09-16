"use strict";
// import { timestamp } from "https://jsr.io/@std/yaml/1.0.6/_type/timestamp.ts";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = exports.Lexer = exports.TokenType = void 0;
// Token types
var TokenType;
(function (TokenType) {
    TokenType["VAR"] = "VAR";
    TokenType["FN"] = "FN";
    TokenType["WARP_FN"] = "WFN";
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    TokenType["NUMBER"] = "NUMBER";
    TokenType["ASSIGN"] = "ASSIGN";
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["LBRACE"] = "LBRACE";
    TokenType["RBRACE"] = "RBRACE";
    TokenType["COMMA"] = "COMMA";
    TokenType["BINOP"] = "BINOP";
    TokenType["STRING"] = "STRING";
    TokenType["IF"] = "IF";
    TokenType["FOR"] = "FOR";
    TokenType["ELSE"] = "ELSE";
    TokenType["EOF"] = "EOF";
    TokenType["GREATER"] = "GREATER";
    TokenType["GREENFLAG"] = "GREENFLAG";
    TokenType["INCLUDE"] = "INCLUDE";
    TokenType["LIST"] = "LIST";
    TokenType["NOT"] = "NOT";
    TokenType["RETURN"] = "RETURN";
    TokenType["ASSIGNBINOP"] = "ASSIGNBINOP";
})(TokenType || (exports.TokenType = TokenType = {}));
// Lexer
class Lexer {
    constructor(source) {
        this.position = 0;
        this.tokens = [];
        this.source = source;
    }
    isAlpha(char) {
        return /[a-zA-Z_#]/.test(char);
    }
    isDigit(char) {
        return /-?[\d\.]/.test(char);
    }
    isWhitespace(char) {
        return /\s/.test(char);
    }
    advance() {
        return this.source[this.position++];
    }
    peek(offset = 0) {
        return this.source[this.position + offset] || "";
    }
    match(expected) {
        if (this.peek() === expected) {
            this.position++;
            return true;
        }
        return false;
    }
    pushToken(tokenData) {
        var _a;
        // console.log(tokenData, this.position)
        const fullToken = {
            start: (_a = tokenData.start) !== null && _a !== void 0 ? _a : this.position,
            ...tokenData,
            end: tokenData.start ? this.position : this.position + 1
        };
        this.tokens.push(fullToken);
    }
    tokenize() {
        this.tokens = [];
        let inComment = false;
        let global = 0;
        let line = 0;
        let start = 0;
        while (this.position < this.source.length) {
            const char = this.advance();
            if (char == '\n')
                line++;
            if (global > 0)
                global--;
            if (inComment) {
                if (char == '\n')
                    inComment = false;
                continue;
            }
            else if (char == '/' && this.peek() == '/') {
                inComment = true;
            }
            else if (this.isWhitespace(char)) {
                continue;
            }
            else if (this.isAlpha(char)) {
                let identifier = char;
                start = this.position;
                while (this.isAlpha(this.peek()) || this.isDigit(this.peek())) {
                    identifier += this.advance();
                }
                if (identifier.toLowerCase() === "#include")
                    this.pushToken({ line, start, type: TokenType.INCLUDE, value: identifier });
                else if (identifier === 'return')
                    this.pushToken({ line, start, type: TokenType.RETURN, value: identifier });
                else if (identifier === "var")
                    this.pushToken({ line, start, type: TokenType.VAR, value: global > 0 ? 'global' : identifier });
                else if (identifier === "list")
                    this.pushToken({ line, start, type: TokenType.LIST, value: global > 0 ? 'global' : identifier });
                else if (identifier === "global")
                    global = 3;
                else if (identifier === "fn")
                    this.pushToken({ line, start, type: TokenType.FN, value: identifier });
                else if (identifier === "warp")
                    this.pushToken({ line, start, type: TokenType.WARP_FN, value: identifier });
                else if (identifier === "if")
                    this.pushToken({ line, start, type: TokenType.IF, value: identifier });
                else if (identifier === "for")
                    this.pushToken({ line, start, type: TokenType.FOR, value: identifier });
                else if (identifier === "gf")
                    this.pushToken({ line, start, type: TokenType.GREENFLAG, value: identifier });
                else if (identifier === "start")
                    this.pushToken({ line, start, type: TokenType.GREENFLAG, value: identifier });
                else if (identifier === "else")
                    this.pushToken({ line, start, type: TokenType.ELSE, value: identifier });
                else
                    this.pushToken({ line, start, type: TokenType.IDENTIFIER, value: identifier });
            }
            else if (this.isDigit(char)) {
                let number = char;
                start = this.position;
                while (this.isDigit(this.peek())) {
                    number += this.advance();
                }
                this.pushToken({ line, start, type: TokenType.NUMBER, value: number });
            }
            else if (char === '"') {
                start = this.position;
                let string = "";
                while (!((this.peek() == '"' && this.peek(-1) !== '\\')
                    || this.peek() == "")) {
                    // console.log(this.position, this.peek(), this.peek(-1))
                    string += this.advance();
                }
                if (!this.match('"')) {
                    throw new Error("Unterminated string");
                }
                this.pushToken({ line, start, type: TokenType.STRING, value: string });
            }
            else if (char === "(")
                this.pushToken({ line, type: TokenType.LPAREN, value: char });
            else if (char === ")")
                this.pushToken({ line, type: TokenType.RPAREN, value: char });
            else if (char === "{")
                this.pushToken({ line, type: TokenType.LBRACE, value: char });
            else if (char === "}")
                this.pushToken({ line, type: TokenType.RBRACE, value: char });
            else if (char === ",")
                this.pushToken({ line, type: TokenType.COMMA, value: char });
            else if (char === "+" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.ASSIGNBINOP, value: '+=' });
                this.advance();
            }
            else if (char === "-" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.ASSIGNBINOP, value: '-=' });
                this.advance();
            }
            else if (char === "/" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.ASSIGNBINOP, value: '/=' });
                this.advance();
            }
            else if (char === "*" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.ASSIGNBINOP, value: '*=' });
                this.advance();
            }
            else if (char === "%" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.ASSIGNBINOP, value: '%=' });
                this.advance();
            }
            else if (char === "+")
                this.pushToken({ line, type: TokenType.BINOP, value: char });
            else if (char === "-")
                this.pushToken({ line, type: TokenType.BINOP, value: char });
            else if (char === "*")
                this.pushToken({ line, type: TokenType.BINOP, value: char });
            else if (char === "/")
                this.pushToken({ line, type: TokenType.BINOP, value: char });
            else if (char === "%")
                this.pushToken({ line, type: TokenType.BINOP, value: char });
            else if (char === "=" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.BINOP, value: char });
                this.advance();
            }
            else if (char === "&" && this.peek() === '&') {
                this.pushToken({ line, type: TokenType.BINOP, value: char });
                this.advance();
            }
            else if (char === "!" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.BINOP, value: '!=' });
                this.advance();
            }
            else if (char === "<" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.BINOP, value: '<=' });
                this.advance();
            }
            else if (char === ">" && this.peek() === '=') {
                this.pushToken({ line, type: TokenType.BINOP, value: '>=' });
                this.advance();
            }
            else if (char === ">")
                this.pushToken({ line, type: TokenType.BINOP, value: char });
            else if (char === "<")
                this.pushToken({ line, type: TokenType.BINOP, value: char });
            else if (char === "=")
                this.pushToken({ line, type: TokenType.ASSIGN, value: char });
            else if (char === "!")
                this.pushToken({ line, type: TokenType.NOT, value: char });
            else {
                throw new Error(`Unexpected character: ${char}`);
                // throw new Error(`Unexpected character: ${char} on line ${line+1}\n${
                // 	this.source.split('').filter((_,i)=>Math.abs(i-this.position) <= 6).join('')
                // }\n     ^`);
            }
        }
        this.pushToken({ line, start, type: TokenType.EOF, value: "" });
        return this.tokens;
    }
}
exports.Lexer = Lexer;
// Parser
class Parser {
    constructor(tokens, source) {
        this.position = 0;
        this.tokens = tokens;
        this.source = source;
    }
    peek(ahead = 0) {
        return this.tokens[this.position + ahead];
    }
    advance() {
        return this.tokens[this.position++];
    }
    match(...types) {
        if (types.includes(this.peek().type)) {
            this.advance();
            return true;
        }
        return false;
    }
    matchTk(types, token = this.peek()) {
        if (types.includes(token.type)) {
            return true;
        }
        return false;
    }
    expect(type, errorMessage) {
        if (this.peek().type === type) {
            return this.advance();
        }
        let ch = 0;
        const line = (this.source.split('\n')
            .map((l, i) => {
            ch += l.length;
            return {
                start: ch - l.length,
                len: l.length,
                i,
                l,
            };
        })
            .find((l) => l.start <= this.position
            && l.start + l.len >= this.position));
        const positionInLine = this.position - (line ? (line.start) : 0);
        // if (line)
        // 	positionInLine - (line.l.length - line.l.replace(/^\s*/,'').length)
        // console.error('trace: tokens', this.tokens, '\nIDX:', this.position);
        throw new Error(errorMessage);
        const trace = this.source.split('\n')
            .map(l => l.replace(/^\s*/, ''))
            .map((t, l) => `${l + 1} | ${t}`)
            .map((t, l) => {
            if (l != this.peek().line)
                return t;
            return `${t}\n${' '.repeat(l.toString().length)} |${' '.repeat(positionInLine)}^ ${errorMessage}`;
        })
            .filter((_, l) => Math.abs(l - this.peek().line) < 4);
        throw new Error('\n' + trace.join('\n'));
    }
    parse() {
        const nodes = [];
        while (this.peek().type !== TokenType.EOF) {
            nodes.push(this.parseStatement());
        }
        return nodes;
    }
    parseStatement() {
        if (this.match(TokenType.VAR)) {
            const node = this.peek(-1);
            const type = node.value;
            const identifier = this.expect(TokenType.IDENTIFIER, "Expected variable name").value;
            this.expect(TokenType.ASSIGN, "Expected '=' after variable name");
            const value = this.parseAssignment();
            return { type: "VariableDeclaration", identifier, value, vtype: type };
        }
        if (this.match(TokenType.LIST)) {
            const type = this.peek(-1).value;
            const identifier = this.expect(TokenType.IDENTIFIER, "Expected list name").value;
            this.expect(TokenType.ASSIGN, "Expected '=' after list name");
            const value = [];
            this.expect(TokenType.LBRACE, "Expected {array} as list value");
            while (!this.match(TokenType.RBRACE) || this.match(TokenType.EOF)) {
                value.push(this.parsePrimary());
                this.match(TokenType.COMMA);
            }
            if (!this.peek())
                throw 'reached EOF';
            return { type: "ListDeclaration", identifier, value, vtype: type };
        }
        if (this.match(TokenType.INCLUDE)) {
            if (this.expect(TokenType.BINOP, 'Expected < after #include').value !== '<')
                throw new Error("Expected < after #include");
            const itype = this.expect(TokenType.STRING, 'Expected string (type)').value;
            const path = this.expect(TokenType.STRING, 'Expected string (path)').value;
            if (this.expect(TokenType.BINOP, 'Expected > after include statement').value !== '>')
                throw new Error("Expected > after include statement");
            return { itype, path, type: "Include" };
        }
        function doFn(warp) {
            const name = this.expect(TokenType.IDENTIFIER, "Expected function name").value;
            this.expect(TokenType.LPAREN, "Expected '(' after function name");
            const params = [];
            if (!this.match(TokenType.RPAREN)) {
                do {
                    params.push(this.expect(TokenType.IDENTIFIER, "Expected parameter name").value);
                } while (this.match(TokenType.COMMA));
                this.expect(TokenType.RPAREN, "Expected ')' after parameters");
            }
            this.expect(TokenType.LBRACE, "Expected '{' before function body");
            const body = this.parseBlock();
            return { type: "FunctionDeclaration", name, params, body, warp };
        }
        if (this.match(TokenType.WARP_FN)) {
            this.expect(TokenType.FN, "Expected 'fn' after 'warp'");
            return doFn.call(this, true);
        }
        if (this.match(TokenType.FN)) {
            return doFn.call(this, false);
        }
        if (this.match(TokenType.IF)) {
            this.expect(TokenType.LPAREN, "Expected '(' after 'if'");
            const condition = this.parseAssignment();
            this.expect(TokenType.RPAREN, "Expected ')' after if condition");
            this.expect(TokenType.LBRACE, "Expected '{' after if condition");
            const thenBranch = this.parseBlock();
            let elseBranch;
            if (this.match(TokenType.ELSE)) {
                this.expect(TokenType.LBRACE, "Expected '{' after 'else'");
                elseBranch = this.parseBlock();
            }
            return { type: "If", condition, thenBranch, elseBranch };
        }
        if (this.match(TokenType.FOR)) {
            this.expect(TokenType.LPAREN, "Expected '(' after 'for'");
            const varname = this.parseAssignment();
            const of = this.expect(TokenType.IDENTIFIER, 'expected of');
            if (of.value !== 'of')
                throw new Error('expected of');
            const times = this.parseAssignment();
            this.expect(TokenType.RPAREN, "Expected ')' after for");
            this.expect(TokenType.LBRACE, "Expected '{' after for");
            const branch = this.parseBlock();
            return { type: "For", varname, times, branch };
        }
        if (this.match(TokenType.GREENFLAG)) {
            this.expect(TokenType.LBRACE, "Expected '{' after greenflag");
            const branch = this.parseBlock();
            return { type: "GreenFlag", branch };
        }
        if (this.match(TokenType.RETURN)) {
            const value = this.parseCall();
            return { type: "Return", value };
        }
        return this.parseAssignment();
    }
    parseBlock() {
        const nodes = [];
        while (!this.match(TokenType.RBRACE)) {
            nodes.push(this.parseStatement());
        }
        return nodes;
    }
    parseAssignment() {
        if (this.match(TokenType.NOT)) {
            return {
                type: 'Not',
                body: this.parseAssignment(),
            };
        }
        const expr = this.parseBinaryExpression();
        if (this.match(TokenType.ASSIGN)) {
            if (expr.type !== "Identifier")
                throw new Error("Invalid assignment target; expected an identifier");
            const value = this.parseAssignment();
            return { type: "Assignment", identifier: expr.name, value };
        }
        if (this.peek().type == TokenType.ASSIGNBINOP) {
            const uh = this.advance();
            //FIXME - prolly would be better to put this in asttoblocks
            if (expr.type !== "Identifier")
                throw new Error("Invalid assignment target; expected an identifier");
            const value = this.parseAssignment();
            return { type: "Assignment", identifier: expr.name, value: {
                    type: 'BinaryExpression',
                    left: {
                        type: 'Identifier',
                        name: expr.name
                    },
                    right: value,
                    operator: uh.value[0]
                } };
        }
        return expr;
    }
    parseBinaryExpression() {
        let left = this.parseCall();
        while (this.peek().type === TokenType.BINOP || this.peek().type === TokenType.GREATER) {
            const operator = this.advance().value;
            const right = this.parseCall();
            left = { type: "BinaryExpression", operator, left, right };
        }
        return left;
    }
    parseCall() {
        let expr = this.parsePrimary();
        while (this.peek().type === TokenType.LPAREN) {
            expr = this.finishCall(expr);
        }
        return expr;
    }
    finishCall(callee) {
        this.expect(TokenType.LPAREN, "Expected '(' after function name");
        const args = [];
        if (this.peek().type !== TokenType.RPAREN) {
            do {
                args.push(this.parseAssignment());
            } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, "Expected ')' after arguments");
        if (this.peek().type === TokenType.LBRACE) {
            const branches = [];
            do {
                this.expect(TokenType.LBRACE, "Expected '{' for branch block");
                branches.push(this.parseBlock());
            } while (this.peek().type === TokenType.LBRACE);
            if (callee.type !== "Identifier")
                throw new Error("Branch function call expects an identifier");
            return {
                type: "BranchFunctionCall",
                identifier: callee.name,
                args,
                branches,
            };
        }
        if (callee.type !== "Identifier")
            throw new Error("Function call expects an identifier");
        return {
            type: "FunctionCall",
            identifier: callee.name,
            args,
        };
    }
    parsePrimary(allowOther = true) {
        const token = this.peek();
        if (this.match(TokenType.NUMBER)) {
            return { type: "Literal", value: Number(token.value) };
        }
        if (this.match(TokenType.STRING)) {
            return { type: "Literal", value: token.value };
        }
        if (this.match(TokenType.IDENTIFIER) && allowOther) {
            if (["True", "true", "False", "false"].includes(token.value)) {
                return {
                    type: "Boolean",
                    value: token.value === "True" || token.value === "true"
                };
            }
            return { type: "Identifier", name: token.value };
        }
        if (this.match(TokenType.LPAREN) && allowOther) {
            const expr = this.parseAssignment();
            this.expect(TokenType.RPAREN, "Expected ')' after expression");
            return expr;
        }
        if (this.peek().type == TokenType.BINOP && this.peek(1).type == TokenType.NUMBER) {
            const operator = this.expect(TokenType.BINOP, 'uh oh').value;
            const right = this.parseCall();
            const left = {
                type: 'Literal',
                value: 0
            };
            return { type: "BinaryExpression", operator, left, right };
        }
        throw new Error(`Unexpected token: ${token.type}`);
        const trace = this.source.split('\n')
            .map(l => l.replace(/^\s*/, ''))
            .map((t, l) => `${l + 1} | ${t}`)
            .map((t, l) => {
            if (l != token.line)
                return t;
            return `${t}\n${' '.repeat(l.toString().length)} | ^ Unexpected token: ${token.type}`;
        })
            .filter((_, l) => Math.abs(l - token.line) < 4);
        throw new Error('\n' + trace.join('\n'));
    }
}
exports.Parser = Parser;
