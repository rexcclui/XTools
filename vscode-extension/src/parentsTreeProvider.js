'use strict';

const vscode = require('vscode');
const { bareComponentName } = require('./traceParents');

// One node in the tree: a component, how it references the child beneath it
// (kind/snippet), and the set of bare component names already seen on the
// path down from the root — used to detect cycles per-branch instead of
// tracking a single global visited set (a component can legitimately appear
// on more than one branch of the ancestor tree).
class ParentNode {
    constructor(componentName, kind, snippet, filePath, ancestry, isCycle) {
        this.componentName = componentName;
        this.kind = kind; // 'root' | 'js-import' | 'html-tag'
        this.snippet = snippet;
        this.filePath = filePath;
        this.ancestry = ancestry;
        this.isCycle = !!isCycle;
    }
}

// Lazy, expand-on-demand ancestor tree — same idea as VS Code's built-in
// "Call Hierarchy: Show Incoming Calls" view. Expanding a node computes its
// direct parents on the spot (via the shared FileIndex, already built once
// per workspace root) rather than pre-computing the whole chain up front.
class TraceParentsProvider {
    constructor(fileIndexHolder) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.fileIndexHolder = fileIndexHolder; // { current: FileIndex | null }
        this.rootNode = null;
    }

    setRoot(componentName, filePath) {
        this.rootNode = new ParentNode(componentName, 'root', '', filePath, new Set([bareComponentName(componentName)]), false);
        this.refresh();
    }

    clear() {
        this.rootNode = null;
        this.refresh();
    }

    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(node) {
        const isRoot = node.kind === 'root';
        const collapsible = node.isCycle
            ? vscode.TreeItemCollapsibleState.None
            : vscode.TreeItemCollapsibleState.Collapsed;
        const item = new vscode.TreeItem(node.componentName, collapsible);

        if (node.isCycle) {
            item.description = '↩ already seen on this branch';
        } else if (isRoot) {
            item.description = 'target — expand to find its parents';
        } else {
            const kindLabel = node.kind === 'html-tag' ? '<c-…> tag' : 'js import';
            item.description = `${kindLabel} · ${node.snippet}`;
        }
        item.tooltip = node.snippet || node.componentName;
        item.iconPath = new vscode.ThemeIcon(
            isRoot ? 'target' : node.kind === 'html-tag' ? 'symbol-tag' : 'symbol-method'
        );
        if (node.filePath) {
            item.command = {
                command: 'apexflowTraceParents.openFile',
                title: 'Open Source',
                arguments: [node.filePath],
            };
        }
        return item;
    }

    getChildren(node) {
        if (!node) {
            return this.rootNode ? [this.rootNode] : [];
        }
        if (node.isCycle) return [];

        const index = this.fileIndexHolder.current;
        if (!index) return [];

        const parents = index.findDirectParents(node.componentName);
        if (parents.length === 0) return [];

        return parents.map(p => {
            const pBare = bareComponentName(p.componentName);
            const isCycle = node.ancestry.has(pBare);
            const nextAncestry = isCycle ? node.ancestry : new Set(node.ancestry).add(pBare);
            return new ParentNode(p.componentName, p.kind, p.snippet, p.filePath, nextAncestry, isCycle);
        });
    }
}

module.exports = { TraceParentsProvider, ParentNode };
