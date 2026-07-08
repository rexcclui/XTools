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
// Also returns the specific file that was right-clicked (or is active), if
// any, so the caller can auto-load that exact component into the diagram —
// "open the diagram" from a file's context menu should show that file, not
// just the folder it lives in.
function resolveInvocation(uri) {
    const targetUri = uri instanceof vscode.Uri ? uri : (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri);
    let root = null;
    if (targetUri) {
        const folder = vscode.workspace.getWorkspaceFolder(targetUri);
        if (folder) root = { path: folder.uri.fsPath, name: folder.name };
    }
    if (!root) root = getDefaultWorkspaceRoot();
    return { root, openFile: targetUri ? targetUri.fsPath : null };
}

function getWebviewHtml(context) {
    const htmlPath = path.join(context.extensionPath, 'webview', 'apexflow.html');
    return fs.readFileSync(htmlPath, 'utf8');
}

function activateFullWebview(context, output) {
    let panel = null;
    let pendingInvocation = null; // { root, openFile } from whatever invoked apexflowFull.open, consumed on the webview's 'ready'

    async function handleMessage(msg) {
        if (!panel) return;
        const reply = (result) => panel.webview.postMessage({ reqId: msg.reqId, result });
        const replyError = (err) => panel.webview.postMessage({ reqId: msg.reqId, error: String((err && err.message) || err) });

        try {
            switch (msg.type) {
                case 'ready': {
                    const inv = pendingInvocation || { root: getDefaultWorkspaceRoot(), openFile: null };
                    const root = inv.root;
                    panel.webview.postMessage({
                        type: 'init',
                        path: root ? root.path : null,
                        name: root ? root.name : null,
                        openFile: inv.openFile,
                    });
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
                case 'openFile': {
                    // View Code / View Source: open the real file in a genuine
                    // VS Code editor tab instead of the in-page code viewer —
                    // that viewer was built for the browser tool, which has no
                    // such option; here we do, so use it.
                    const doc = await vscode.workspace.openTextDocument(msg.path);
                    const editor = await vscode.window.showTextDocument(doc, {
                        viewColumn: msg.viewColumn === 'beside' ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
                        preview: true,
                    });
                    if (typeof msg.line === 'number' && msg.line >= 0) {
                        const pos = new vscode.Position(msg.line, 0);
                        editor.selection = new vscode.Selection(pos, pos);
                        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
                    }
                    reply(true);
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
            const invocation = resolveInvocation(uri);
            if (panel) {
                panel.reveal(vscode.ViewColumn.Active);
                // Already open — if this invocation points at a different
                // folder/file (e.g. right-clicked a file in another workspace
                // folder), load it there instead of silently ignoring it.
                if (invocation.root) {
                    panel.webview.postMessage({
                        type: 'init',
                        path: invocation.root.path,
                        name: invocation.root.name,
                        openFile: invocation.openFile,
                    });
                }
                return;
            }
            pendingInvocation = invocation;
            panel = vscode.window.createWebviewPanel(
                'apexflowFull',
                'ApexFlow',
                vscode.ViewColumn.Active,
                { enableScripts: true, retainContextWhenHidden: true }
            );
            panel.webview.html = getWebviewHtml(context);
            panel.webview.onDidReceiveMessage(handleMessage);
            panel.onDidDispose(() => { panel = null; pendingInvocation = null; });
        })
    );
}

module.exports = { activateFullWebview };
