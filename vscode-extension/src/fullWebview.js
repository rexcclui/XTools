'use strict';

const vscode = require('vscode');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { walkTree } = require('./vfsWalk');

function getDefaultWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length) {
        return { path: folders[0].uri.fsPath, name: folders[0].name };
    }
    return null;
}

// In a multi-root workspace (e.g. "Add Folder to Workspace…"), the folder the
// user actually cares about is whichever one they right-clicked in, or has
// open in the active editor — not necessarily the first folder added to the
// workspace. Falls back to the first workspace folder only if neither is
// available (e.g. invoked from the Command Palette with nothing open).
function resolveRootFor(uri) {
    const targetUri = uri instanceof vscode.Uri ? uri : (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri);
    if (targetUri) {
        const folder = vscode.workspace.getWorkspaceFolder(targetUri);
        if (folder) return { path: folder.uri.fsPath, name: folder.name };
    }
    return getDefaultWorkspaceRoot();
}

function getWebviewHtml(context) {
    const htmlPath = path.join(context.extensionPath, 'webview', 'apexflow.html');
    return fs.readFileSync(htmlPath, 'utf8');
}

function activateFullWebview(context, output) {
    let panel = null;
    let pendingRoot = null; // set by whatever invoked apexflowFull.open, consumed on the webview's 'ready'

    async function handleMessage(msg) {
        if (!panel) return;
        const reply = (result) => panel.webview.postMessage({ reqId: msg.reqId, result });
        const replyError = (err) => panel.webview.postMessage({ reqId: msg.reqId, error: String((err && err.message) || err) });

        try {
            switch (msg.type) {
                case 'ready': {
                    const root = pendingRoot || getDefaultWorkspaceRoot();
                    panel.webview.postMessage({ type: 'init', path: root ? root.path : null, name: root ? root.name : null });
                    break;
                }
                case 'walkTree': {
                    const start = Date.now();
                    const tree = await walkTree(msg.path, path.basename(msg.path));
                    output.appendLine(`[ApexFlow] Scanned "${msg.path}" in ${Date.now() - start}ms`);
                    reply(tree);
                    break;
                }
                case 'readFile': {
                    const [text, stat] = await Promise.all([
                        fsp.readFile(msg.path, 'utf8'),
                        fsp.stat(msg.path).catch(() => null),
                    ]);
                    reply({ text, size: stat ? stat.size : text.length, lastModified: stat ? stat.mtimeMs : 0 });
                    break;
                }
                case 'pickFolder': {
                    const picked = await vscode.window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false,
                        openLabel: 'Open as ApexFlow project',
                    });
                    if (!picked || !picked.length) { reply(null); break; }
                    reply({ path: picked[0].fsPath, name: path.basename(picked[0].fsPath) });
                    break;
                }
                default:
                    reply(null);
            }
        } catch (e) {
            replyError(e);
        }
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('apexflowFull.open', (uri) => {
            const root = resolveRootFor(uri);
            if (panel) {
                panel.reveal(vscode.ViewColumn.Active);
                // Already open — if this invocation points at a different
                // folder (e.g. right-clicked a file in another workspace
                // folder), reload it there instead of silently ignoring it.
                if (root) panel.webview.postMessage({ type: 'init', path: root.path, name: root.name });
                return;
            }
            pendingRoot = root;
            panel = vscode.window.createWebviewPanel(
                'apexflowFull',
                'ApexFlow',
                vscode.ViewColumn.Active,
                { enableScripts: true, retainContextWhenHidden: true }
            );
            panel.webview.html = getWebviewHtml(context);
            panel.webview.onDidReceiveMessage(handleMessage);
            panel.onDidDispose(() => { panel = null; pendingRoot = null; });
        })
    );
}

module.exports = { activateFullWebview };
