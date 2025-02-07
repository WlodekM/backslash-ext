const vscode = require('vscode');
const { readFileSync } = require("fs");
const path = require("path")

const blocks = JSON.parse(readFileSync(path.join(__dirname, '../blocks.json')));
console.log(Object.keys(blocks).length, blocks.control_forever)

const extBlocks = new Map()
let exts = []
globalThis.vsc = vscode

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

/**
 * 
 * @param {vscode.ExtensionContext} context 
 */
function activate(context) {
    console.log("AAAAA")
    const provider = vscode.languages.registerCompletionItemProvider(
        'backslash', // Match your language ID from package.json
        {
            provideCompletionItems(document, position, token, context) {
                const np = position.translate(0, -1);
                let dict = Object.assign({}, blocks)
                for (const extUrl of exts) {
                    Object.assign(dict, extBlocks.get(extUrl))
                }
                const items = [
                    new vscode.CompletionItem('if', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('else', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('for', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('while', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('return', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('true', vscode.CompletionItemKind.Constant),
                    new vscode.CompletionItem('false', vscode.CompletionItemKind.Constant),
                    ...Object.entries(dict).map(([block, data]) => {
                        if (!block || block == undefined || block == 'undefined') return;
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
                return items;
            }
        },
        '' // Triggers on any character; you can set this to a trigger character like '.' or ':'
    );

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
        vscode.languages.registerHoverProvider('backslash', {
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
