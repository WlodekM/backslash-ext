const vscode = require('vscode');
const { readFileSync } = require("fs");
const path = require("path")

const blocks = JSON.parse(readFileSync(path.join(__dirname, '../blocks.json')));

function documentBlock(block, data, branches = false) {
    const category = block.split('_')[0]
    const name = block.split('_').filter((_, i) => i != 0).join("_")
    const args = Object.keys(data)
        .filter(a => a.startsWith('args'))
        .map(n => data[n])
        .filter(a => a[0]?.type != 'field_image');
    const branchfull = args.filter(a => a && a[0]?.type == 'input_statement')
    return `${category}.${name}(${(args[0] ?? []).map(a => `${a.name}: ${a.type} ${a.check} ${Object.keys(a)}`).join(', ')})${''
    }${branches ? ' ' + branchfull.map(a => '{ }').join(' ') : ''}`
}

function activate(context) {
    console.log("AAAAA")
    const provider = vscode.languages.registerCompletionItemProvider(
        'backslash', // Match your language ID from package.json
        {
            provideCompletionItems(document, position, token, context) {
                console.log("AUTOCOMpLEEmaonoigo")
                const np = position.translate(0, -1);
                return [
                    new vscode.CompletionItem('if', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('else', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('for', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('while', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('return', vscode.CompletionItemKind.Keyword),
                    new vscode.CompletionItem('true', vscode.CompletionItemKind.Constant),
                    new vscode.CompletionItem('false', vscode.CompletionItemKind.Constant),
                    ...Object.entries(blocks).map(([block, data]) => {
                        const args = Object.keys(data)
                            .filter(a => a.startsWith('args'))
                            .map(n => data[n])
                            .filter(a => a[0]?.type != 'field_image');
                        if (args[1] && args[1][0]?.type == 'input_statement') {
                            const ci = new vscode.CompletionItem(block, vscode.CompletionItemKind.Keyword);
                            ci.insertText = new vscode.SnippetString(`${block}($1) {\n\t$0\n}`);
                            ci.documentation = documentBlock(block, data, true)
                            return ci
                        }
                        const ci = new vscode.CompletionItem(block, vscode.CompletionItemKind.Function);
                        ci.insertText = new vscode.SnippetString(`${block}($0)`);
                        ci.documentation = documentBlock(block, data, false)
                        return ci
                    })
                ];
            }
        },
        '' // Triggers on any character; you can set this to a trigger character like '.' or ':'
    );

    console.log("uh")

    console.debug(provider)

    context.subscriptions.push(provider);
    function isFunction(word) {
        return Object.keys(blocks).includes(word)
    }
    function getFunctionDocumentation(block) {
        const data = blocks[block]
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
        })
    )
}

module.exports = { activate }
