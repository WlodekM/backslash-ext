import type {
	AssignmentNode,
	ASTNode,
	BinaryExpressionNode,
	BranchFunctionCallNode,
	FunctionCallNode,
	FunctionDeclarationNode,
	GreenFlagNode,
	IfNode,
	ListDeclarationNode,
	NotNode,
	ReturnNode,
	StartBlockNode,
	ForNode,
	LiteralNode,
	VariableDeclarationNode
} from "./main.ts";

export function getNodeChildren(node: ASTNode): ASTNode[] {
	const children: ASTNode[] = [];

	let n;
	n = node as FunctionDeclarationNode;
	if (n.type == 'FunctionDeclaration') {
		children.push(...n.body)
	}
	n = node as AssignmentNode;
	if (n.type == 'Assignment') {
		children.push(n.value)
	}
	n = node as BinaryExpressionNode;
	if (n.type == 'BinaryExpression') {
		children.push(n.left, n.right)
	}
	n = node as NotNode;
	if (n.type == 'Not') {
		children.push(n.body)
	}
	n = node as FunctionCallNode;
	if (n.type == 'FunctionCall') {
		children.push(...n.args)
	}
	n = node as BranchFunctionCallNode;
	if (n.type == 'BranchFunctionCall') {
		children.push(...n.args, ...n.branches.reduce((p: ASTNode[], c) => {
			p.push(...c);
			return p;
		}, []))
	}
	//FIXME - i dont think this was ever actually implemented in asttoblocks :sob:
	n = node as StartBlockNode;
	if (n.type == 'StartBlock') {
		children.push(...n.body)
	}
	n = node as IfNode;
	if (n.type == 'If') {
		children.push(...n.thenBranch, ...(n.elseBranch??[]),n.condition)
	}
	//FIXME - or this,, this sounds useful i really shoul implement it
	n = node as ForNode;
	if (n.type == 'For') {
		children.push(...n.branch, n.times, n.varname)
	}
	n = node as GreenFlagNode;
	if (n.type == 'GreenFlag') {
		children.push(...n.branch)
	}
	n = node as ListDeclarationNode;
	if (n.type == 'ListDeclaration') {
		children.push(...n.value)
	}
	n = node as ReturnNode;
	if (n.type == 'Return') {
		children.push(n.value)
	}

	return children
}