"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeChildren = getNodeChildren;
function getNodeChildren(node) {
    const children = [];
    let n;
    n = node;
    if (n.type == 'FunctionDeclaration') {
        children.push(...n.body);
    }
    n = node;
    if (n.type == 'Assignment') {
        children.push(n.value);
    }
    n = node;
    if (n.type == 'BinaryExpression') {
        children.push(n.left, n.right);
    }
    n = node;
    if (n.type == 'Not') {
        children.push(n.body);
    }
    n = node;
    if (n.type == 'FunctionCall') {
        children.push(...n.args);
    }
    n = node;
    if (n.type == 'BranchFunctionCall') {
        children.push(...n.args, ...n.branches.reduce((p, c) => {
            p.push(...c);
            return p;
        }, []));
    }
    //FIXME - i dont think this was ever actually implemented in asttoblocks :sob:
    n = node;
    if (n.type == 'StartBlock') {
        children.push(...n.body);
    }
    n = node;
    if (n.type == 'If') {
        children.push(...n.thenBranch, ...(n.elseBranch ?? []), n.condition);
    }
    //FIXME - or this,, this sounds useful i really shoul implement it
    n = node;
    if (n.type == 'For') {
        children.push(...n.branch, n.times, n.varname);
    }
    n = node;
    if (n.type == 'GreenFlag') {
        children.push(...n.branch);
    }
    n = node;
    if (n.type == 'ListDeclaration') {
        children.push(...n.value);
    }
    n = node;
    if (n.type == 'Return') {
        children.push(n.value);
    }
    return children;
}
