'use strict';

// Pure Node.js directory-walk logic used by the extension host to answer the
// webview's 'walkTree' requests. Kept dependency-free (no `vscode` import) so
// it can be exercised directly in tests without an actual VS Code host.

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

// Mirrors LWC_SKIP_DIRS / isSourceFile from webview/apexflow.html — kept in
// sync manually since the two run in different processes (webview vs. host)
// and can't share a module.
const SKIP_DIRS = new Set([
    '__tests__', '__mocks__', 'node_modules', '.git', '.sfdx', '.sf', 'dist',
    'build', 'target', 'out', '.next', '.cache', '.vscode',
]);

function isSourceFile(name) {
    const n = name.toLowerCase();
    return n.endsWith('.cls') || n.endsWith('.java') || n.endsWith('.js') || n.endsWith('.html');
}

// One fast, native fs walk of the whole project, fanning subdirectories out
// via Promise.all (same shape/rationale as apexflow.html's own
// buildHandleTree) — returns a plain {kind,name,path,absPath,children} tree
// which the webview hydrates into the shape the rest of the app expects.
async function walkTree(rootAbsPath, rootName) {
    async function walk(absPath, name, parentPath) {
        const relPath = parentPath ? `${parentPath}/${name}` : name;
        let stat;
        try {
            stat = await fsp.stat(absPath);
        } catch (e) {
            return null; // vanished / permission denied — skip
        }
        if (stat.isFile()) {
            return isSourceFile(name) ? { kind: 'file', name, path: relPath, absPath } : null;
        }
        if (!stat.isDirectory()) return null;
        if (SKIP_DIRS.has(name) || name.startsWith('.')) return null;

        let entries;
        try {
            entries = await fsp.readdir(absPath, { withFileTypes: true });
        } catch (e) {
            return null;
        }
        const childNodes = await Promise.all(
            entries.map(e => walk(path.join(absPath, e.name), e.name, relPath))
        );
        const children = childNodes.filter(Boolean);
        if (!children.length) return null;
        children.sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return { kind: 'dir', name, path: relPath, children };
    }

    return walk(rootAbsPath, rootName, '');
}

module.exports = { walkTree, isSourceFile, SKIP_DIRS };
