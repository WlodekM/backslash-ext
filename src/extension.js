const vscode = require('vscode');
const { readFileSync, existsSync } = require("fs");
const path = require("path")
const { Lexer, TokenType, Parser } = require('./tshv2/main.js');
// const { getNodeChildren } = require('./tshv2/getNodeChildren.js');
const childProcess = require('node:child_process')

const selector = { language: 'backslash', scheme: 'file' };
const defaultBlocks = JSON.parse(readFileSync(path.join(__dirname, '../blocks.json')));
// console.log(Object.keys(blocks).length, blocks.control_forever)

const extBlocks = new Map()
let exts = []
globalThis.vsc = vscode
let dictFormat = 'blockly'

function datauri(str) {
	const encoder = new TextEncoder();
	const utf8Bytes = encoder.encode(str);
	
	let binaryString = '';
	for (let byte of utf8Bytes) {
		binaryString += String.fromCharCode(byte);
	}
	
	const base64String = btoa(binaryString);
	
	return `data:text/javascript;base64,${base64String}`;
}

async function fetchBlocksFromURL(url) {
	if (extBlocks.has(url)) return;
	try {
		const nop = () => {};
		let ext = null;
		//@ts-ignore:
		const Scratch = globalThis.Scratch = {
			translate: a=>a,
			extensions: {
				unsandboxed: true,
				register: e => {ext = e}
			},
			vm: {
				runtime: {
					on: nop
				}
			},
			BlockType: {
				BOOLEAN: "Boolean",
				BUTTON: "button",
				LABEL: "label",
				COMMAND: "command",
				CONDITIONAL: "conditional",
				EVENT: "event",
				HAT: "hat",
				LOOP: "loop",
				REPORTER: "reporter",
				XML: "xml"
			},
			TargetType: {
				SPRITE: "sprite",
				STAGE: "stage"
			},
			Cast: {},
			ArgumentType: {
				ANGLE: "angle",
				BOOLEAN: "Boolean",
				COLOR: "color",
				NUMBER: "number",
				STRING: "string",
				MATRIX: "matrix",
				NOTE: "note",
				IMAGE: "image",
				COSTUME: "costume",
				SOUND: "sound"
			}
		}
		//@ts-ignore:
		Scratch.translate.setup = nop
		const text = await (await fetch(url)).text();
		const dataUri = datauri(text)
		await import(dataUri);
		if (ext == null || !ext?.getInfo) return "Extension didnt load properly";
		const { blocks, id: extid } = ext.getInfo();
		extBlocks.set(url, Object.fromEntries(
				blocks.map(block => {
					if (typeof block !== 'object' || !block.opcode)
						return [];
					return block.arguments ? [extid+'_'+block.opcode, {args0: Object.entries(block.arguments ?? {}).map(a => {
						return {
							name: a[0],
							type: 'input_value'
						}
					}) ?? []}] : [extid+'_'+block.opcode, {}]
				})
			));
		// Object.assign(blocks, newBlocks); // Merge new blocks
		console.log(`Blocks updated from: ${url}`, extBlocks);
	} catch (error) {
		console.error("Error fetching blocks:", error);
	}
}

async function parseIncludes(document) {
	const includeRegex = /^(?<!\/\/\s*)\s*#include\s*<"extension"\s*"(.*?)"\s*>\s*$/gm;
	exts = [];
	const matches = [...document.getText().matchAll(includeRegex)];
	for (const match of matches) {
		const url = match[1];
		exts.push(url)
		await fetchBlocksFromURL(url);
	}
}

function documentBlock(block, data, branches = false) {
	// return 'A'
	const category = block.split('_')[0]
	const name = block.split('_').filter((_, i) => i != 0).join("_")
	const args = Object.keys(data)
		.filter(a => a.startsWith('args'))
		.map(n => data[n])
		.filter(a => a[0]?.type != 'field_image');
	const branchfull = args.filter(a => a && a[0]?.type == 'input_statement')
	return `${category}.${name}(${(args[0] ?? []).map(a => `${a.name}: ${a.type}-${a.check ?? a.type}`).join(', ')})${''
	}${branches ? ' ' + branchfull.map(a => '{ }').join(' ') : ''}`
}
function documentBslBlock(block, data, branches = false) {
	// return 'A'
	const [category, ...the_rest] = block.split('_')
	const name = the_rest.join("_")
	const args = data[0]
	const branchfull = data[2]
	return `${category}.${name}(${(args ?? []).filter(arg=>arg).filter(a=>a.name).map(a => `${a.name}: ${a.blocklyType ?? 'unknown'}-${a.variableTypes1 ?? a.blocklyType ?? 'unknown'}`).join(', ')})${''
	}${branches ? ' ' + branchfull.map(_ => '{ }').join(' ') : ''}`
}

/**
 * 
 * @param {vscode.ExtensionContext} context 
 */
function activate(context) {
	/** @typedef {"var" | "list"} VarType */
	/** @type {Map<string, [string, VarType, "local"][]>} */
	const varStore = new Map();
	/** @type {Map<string, [string, VarType, "global", string][]>} */
	const global_varStore = new Map();
	let blocks = defaultBlocks;
	// const ext = vscode.extensions.getExtension('backslash');
	// if (ext) {
	//     // ext.
	//     vscode.workspace.config
	// }
	console.log("AAAAA")
	const config = vscode.workspace.getConfiguration('backslash');
	const backslashPath = config.get('pathToBackslash');
	function getBlocksFromPath() {
		if (!backslashPath)
			return;
		if (!existsSync(backslashPath))
			return;
		// i think this works for changing the working dir
		childProcess.execSync("pwd", {
			cwd: backslashPath,
		});
		const result = childProcess.execSync(`deno task getblocksjson`);
		const r = result.toString('utf-8')
		try {
			const parsed = JSON.parse(r);
			blocks = parsed;
			dictFormat = 'backslash';
		} catch (error) {
			console.error(error)
		}
	}
	getBlocksFromPath();
	vscode.workspace.onDidChangeConfiguration((e) => {
		if (!e.affectsConfiguration('backslash.pathToBackslash'))
			return;
		getBlocksFromPath()
	})
	// console.log(, config.inspect('pathToBackslash'))
	const provider = vscode.languages.registerCompletionItemProvider(
		selector, // Match your language ID from package.json
		{
			provideCompletionItems(document, position, token, context) {
				if (!varStore.has(document.uri.toString()))
					updateDiagnostics(document, new Map())
				if (context.triggerKind == vscode.CompletionTriggerKind.TriggerCharacter) {
					const line = document.lineAt(position);
					const textBefore = line.text.slice(0, position.character);

					if (!textBefore.endsWith('::')) return [];

					const items = [
						new vscode.CompletionItem('str_length', vscode.CompletionItemKind.Method),
						new vscode.CompletionItem('letter', vscode.CompletionItemKind.Method),
						new vscode.CompletionItem('join', vscode.CompletionItemKind.Method),
					]

					let varname = '';

					let i = 3;

					while (/[a-zA-Z_#]|-?[\d\.]/.test(textBefore.at(-i))) {
						varname=textBefore.at(-i)+varname
						i++
					}

					const varData = [...varStore.values()].flat(1)
						.find(([v])=>v==varname);

					console.log(varname, [...varStore.values()].flat(1), varData, 'meow meow meow meow')
					if (!varData)
						return items;

					// items.push(new vscode.CompletionItem(varname))

					if (varData[1] == 'list') {
						items.push(
							...([
								'push',
								'replace',
								'remove',
								'insert',
								'clear',
								'at',
								'indexof',
								'contains'
							].map(n => {
								const i = new vscode.CompletionItem(n, vscode.CompletionItemKind.Method)
								i.insertText = new vscode.SnippetString(`${n}($0)`);
								i.documentation = `method for \`${varData[1]}\` variables`
								return i
							})),
							...([
								'length',
								'json',
								'initial_json',
								'id'
							].map(n => {
								const i = new vscode.CompletionItem(n, vscode.CompletionItemKind.Method)
								i.insertText = new vscode.SnippetString(`${n}($0)`);
								i.documentation = `method for \`${varData[1]}\` variables`
								return i
							}))
						)
					}

					return items
				}
				// const np = position.translate(0, -1);
				let dict = Object.assign({}, blocks)
				for (const extUrl of exts) {
					Object.assign(dict, extBlocks.get(extUrl))
				}
				
				// console.log(dictFormat, dict)
				const items = [
					new vscode.CompletionItem('if', vscode.CompletionItemKind.Keyword),
					new vscode.CompletionItem('else', vscode.CompletionItemKind.Keyword),
					new vscode.CompletionItem('for', vscode.CompletionItemKind.Keyword),
					new vscode.CompletionItem('while', vscode.CompletionItemKind.Keyword),
					new vscode.CompletionItem('return', vscode.CompletionItemKind.Keyword),
					new vscode.CompletionItem('on', vscode.CompletionItemKind.Keyword),
					new vscode.CompletionItem('true', vscode.CompletionItemKind.Constant),
					new vscode.CompletionItem('false', vscode.CompletionItemKind.Constant),
					...Object.entries(dict).map(([block, data]) => {
						if (!block || block == undefined || block == 'undefined') return console.log('uuhhmm');
						if (Array.isArray(data)) {
							const type = data[1];
							const args = data[0];
							if (type == 'branch') {
								const ci = new vscode.CompletionItem(block, vscode.CompletionItemKind.Keyword);
								ci.command = {
									command: '',
									title: '',
								}
								ci.insertText = new vscode.SnippetString(`${block}($0) ${
									data[2].map((_,i) => `{\n\t$${i+1}\n}`).join(' ')
								}`);
								try {
									ci.documentation = documentBslBlock(block, data, true)
								} catch (error) {
									console.error(error)
									ci.documentation = String(error)
								}
								return ci
							}
							const ci = new vscode.CompletionItem(block, vscode.CompletionItemKind.Function);
							ci.command = {
								command: '',
								title: '',
							}
							ci.insertText = new vscode.SnippetString(`${block}($0)`);
							// console.log('meow', block)
							try {
								ci.documentation = documentBslBlock(block, data, false)
							} catch (error) {
								console.error(error)
								ci.documentation = String(error)
							}
							// console.log('mrrp', ci.documentation)
							return ci
						}
						const args = Object.keys(data)
							.filter(a => a.startsWith('args'))
							.map(n => data[n])
							.filter(a => a[0]?.type != 'field_image');
						if (args[1] && args[1][0]?.type == 'input_statement' ||
							args[0] && args[0][0]?.type == 'input_statement'
						) {
							const ci = new vscode.CompletionItem(block, vscode.CompletionItemKind.Keyword);
							ci.command = {
								command: '',
								title: '',
							}
							ci.insertText = new vscode.SnippetString(`${block}($1) {\n\t$0\n}`);
							ci.documentation = documentBlock(block, data, true)
							return ci
						}
						const ci = new vscode.CompletionItem(block, vscode.CompletionItemKind.Function);
						ci.command = {
							command: '',
							title: '',
						}
						ci.insertText = new vscode.SnippetString(`${block}($0)`);
						ci.documentation = documentBlock(block, data, false)
						return ci
					})
				].filter(a => a != null);
				for (const vars of [varStore.get(document.uri.toString()) ?? [], ...global_varStore.values()]) {
					items.unshift(...vars.map(([variable, type, scope, source]) => {
						const item = new vscode.CompletionItem(variable, {
							var: vscode.CompletionItemKind.Variable,
							list: vscode.CompletionItemKind.Constant,
						}[type]);
						item.documentation = `${scope} ${type}${source ? ` from ${source}` : ''}`
						item.sortText = `_${variable}`
						return item;
					}) || [])
				}
				// for (const vars of ) {
				// 	items.unshift(...vars.map(v => {
				// 		const item = new vscode.CompletionItem(v, vscode.CompletionItemKind.Variable);
				// 		return item;
				// 	}) || [])
				// }
				return items;
			}
		},
		'', ':' // Triggers on any character; you can set this to a trigger character like '.' or ':'
	);
	vscode.workspace.onDidOpenTextDocument(doc => {
		global_varStore.set(doc.uri.toString(), []);
		varStore.set(doc.uri.toString(), []);
		updateDiagnostics(doc, collection)
	});

	vscode.workspace.onDidCloseTextDocument(doc => {
		global_varStore.delete(doc.uri.toString())
		varStore.delete(doc.uri.toString());
	});
	// function findVars(ast, doc) {
	//     console.log("findign var decls")
	//     /**
	//      * @param {string[]} currLocalVars 
	//      * @param {string[]} currGlobalVars 
	//      * @param {import('./tshv2/main.js').ASTNode} node 
	//      */
	//     function getVars(currLocalVars, currGlobalVars, node) {
	//         console.debug('>', node)
	//         if (!node) return [currLocalVars, currGlobalVars]
	//         let [local, global] = [currLocalVars, currGlobalVars];
	//         if (node.type == 'VariableDeclaration') {
	//             [local, global][['var', 'global'].indexOf(node.vtype)].push(node.identifier);
	//             return [local, global]
	//         }
	//         const children = getNodeChildren(node);
	//         for (const child of children) {
	//             const [addL, addG] = getVars(local, global, child);
	//             local.push(...addL);
	//             global.push(...addG);
	//         }
	//         return [local, global]
	//     }

	//     const [thisLocalVars, thisGlobalVars] = [[], []]
	//     for (const node of ast) {
	//         console.log('j')
	//         const [local, global] = getVars([], [], node);
	//         console.log(node, local, global)
	//         thisLocalVars.push(...local);
	//         thisGlobalVars.push(...global);
	//     }

	//     varStore.set(doc.uri.toString(), thisLocalVars);
	//     console.log(doc.uri.toString())
	//     console.log(thisLocalVars)
	//     console.log(varStore)
	// }
	/**
	 * @param {vscode.TextDocument} doc
	 * @param {vscode.DiagnosticCollection} collection
	 */
	function updateDiagnostics(doc, collection) {
		if (doc.languageId !== 'backslash') return;
		console.log('upd')

		/** @type {vscode.Diagnostic[]} */
		const diagnostics = [];

		const text = doc.getText().replace(/\/\/@ignore-checker\n(.*)/g, '\n');
		
		const lexer = new Lexer(text);
		
		try {
			lexer.tokenize()
		} catch (error) {
			const range = new vscode.Range(
				doc.positionAt(lexer.position),
				doc.positionAt(lexer.position)
			);

			diagnostics.push({
				severity: vscode.DiagnosticSeverity.Error,
				range,
				message: `Lexing error: ${error}`,
				source: 'backslash',
			});
			collection.set(doc.uri, diagnostics);
			return;
		}

		const parser = new Parser(lexer.tokens, text);
		let ast;
		try {
			ast = parser.parse()
		} catch (error) {
			const errorToken = lexer.tokens[parser.position];
			console.error(error)
			console.log(errorToken, lexer, parser)
			const range = new vscode.Range(
				doc.positionAt(errorToken.start - 1),
				doc.positionAt(errorToken.end - 2)
			);

			diagnostics.push({
				severity: vscode.DiagnosticSeverity.Error,
				range,
				message: `Parsing error: ${error}`,
				source: 'backslash',
			});
			collection.set(doc.uri, diagnostics);
			return;
		}

		varStore.set(doc.uri.toString(), [
			...parser.localVars.map(v => [v, 'var', 'local']),
			...parser.localLists.map(v => [v, 'list', 'local'])
		]);
		global_varStore.set(doc.uri.toString(), [
			...parser.globalVars.map(v => [v, 'var', 'global', doc.fileName]),
			...parser.globalLists.map(v => [v, 'list', 'global', doc.fileName])
		]);

		collection.set(doc.uri, diagnostics);
	}
	vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document, collection));

	const collection = vscode.languages.createDiagnosticCollection('backslash');
	context.subscriptions.push(collection);
	/** @typedef {import('./tshv2/main.js').Token} Token */
	/** @type {TokenType[]} */
	// const keywords = [
	//     TokenType.ELSE,
	//     TokenType.FN,
	//     TokenType.FOR,
	//     TokenType.GREENFLAG,
	//     TokenType.IF
	// ]
	/** @typedef {"namespace" | "class" | "enum" | "interface" | "struct" | "typeParameter" | "type" | "parameter" | "variable" | "property" | "enumMember" | "decorator" | "event" | "function" | "method" | "macro" | "label" | "comment" | "string" | "keyword" | "number" | "regexp" | "operator"} vsTokenType*/
	/** @type {Record<TokenType, [vsTokenType] | [vsTokenType, string] | false | (lastToken: TokenType | undefined, nextToken: TokenType | undefined) => ([vsTokenType, string] | [vsTokenType])} */
	const tokenTypeToVs = {
		ASSIGN: ['operator'],
		ASSIGNBINOP: ['operator'],
		BINOP: ['operator'],
		COMMA: false,
		ELSE: ['keyword'],
		EOF: false,
		FN: false,
		FOR: ['keyword'],
		GREATER: ['operator'],
		GREENFLAG: ['keyword'],
		IDENTIFIER: (last) => {
			if (!last)
				return ['variable'];
			if (last == TokenType.FN)
				return ['function', 'declaration']
			if (next == TokenType.LPAREN)
				return ['function']
			if (last != TokenType.VAR && last != TokenType.LIST)
				return ['variable'];
			return ['variable', 'declaration'];
		},
		IF: ['keyword'],
		INCLUDE: ['keyword'],
		LBRACE: false,
		LIST: ['keyword'],
		LPAREN: ['operator'],
		NOT: ['operator'],
		NUMBER: ['number'],
		RBRACE: false,
		RETURN: ['keyword'],
		RPAREN: false,
		STRING: ['string'],
		VAR: ['keyword'],
		WFN: ['keyword']
	}
	const tokenTypes = ['keyword', 'opcode', 'operator', 'identifier'];
	const tokenModifiers = ['declaration', 'documentation'];
	const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
	const _provider = {
		provideDocumentSemanticTokens(document, token) {
			const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
			const lexer = new Lexer(document.getText());
			/** @type {vscode.Diagnostic[]} */
			const diagnostics = [];
			let tokens;
			try {
				tokens = lexer.tokenize()
			} catch (error) {
				const range = new vscode.Range(
					doc.positionAt(lexer.position),
					doc.positionAt(lexer.position)
				);

				diagnostics.push({
					severity: vscode.DiagnosticSeverity.Error,
					range,
					message: `Lexing error: ${error}`,
					source: 'backslash',
				});
				console.error('uh oh, error')
				return tokensBuilder.build();
			}
			for (let i; i < tokens.length; i++) {
				/** @type {Token} */
				const token = tokens[i];
				const last = tokens[i-1]
				const next = tokens[i+1]
				const definition = tokenTypeToVs[token.type] ?? ['keyword']
				if (definition === false)
					continue;
				const [type, modifier] = typeof definition == 'function' ? definition(last, next) : definition;

				tokensBuilder.push(
					new vscode.Range(document.positionAt(token.start), document.positionAt(token.end)),
					type,
					[...(modifier??[])]
				);
			}
			console.log('yippee')
			return tokensBuilder.build();
		}
	}
	const p = vscode.languages.registerDocumentSemanticTokensProvider(
		selector,
		_provider,
		legend
	)

	console.log("uh")

	console.debug(provider)

	context.subscriptions.push(provider);
	function isFunction(word) {
		let dict = Object.assign({}, blocks)
		for (const extUrl of exts) {
			Object.assign(dict, extBlocks.get(extUrl))
		}
		return Object.keys(dict).includes(word)
	}
	function getFunctionDocumentation(block) {
		let dict = Object.assign({}, blocks)
		for (const extUrl of exts) {
			Object.assign(dict, extBlocks.get(extUrl))
		}
		const data = dict[block]
		if (Array.isArray(data))
			return documentBslBlock(block, data, data[1] == 'branch')
		const args = Object.keys(data)
			.filter(a => a.startsWith('args'))
			.map(n => data[n])
			.filter(a => a[0]?.type != 'field_image');
		if (args[0] && args[0][0]?.type == 'input_statement') {
			args.unshift([])
		}
		if (args[1] && args[1][0]?.type == 'input_statement') {
			return documentBlock(block, data, true)
		}
		return documentBlock(block, data, false)
	}
	context.subscriptions.push(
		vscode.languages.registerHoverProvider(selector, {
			provideHover(document, position, token) {
				const word = document.getText(document.getWordRangeAtPosition(position));
				
				if (isFunction(word)) {
					const documentation = getFunctionDocumentation(word);
					return new vscode.Hover(documentation);
				}
			}
		}),
		vscode.workspace.onDidChangeTextDocument(async (event) => {
			console.log(event.document.languageId)
			if (event.document.languageId === 'backslash') {
				await parseIncludes(event.document);
			}
		}),
		vscode.workspace.onDidOpenTextDocument(async (event) => {
			console.log(event.languageId)
			if (event.languageId === 'backslash') {
				await parseIncludes(event);
			}
		})
	);
	const editor = vscode.window.activeTextEditor;
	if (editor.document.languageId === 'backslash') {
		parseIncludes(editor.document);
	}
}

module.exports = { activate }
