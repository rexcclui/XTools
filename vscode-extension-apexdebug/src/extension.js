'use strict';

const vscode = require('vscode');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { scanApexSources } = require('./apexScan');

function getWebviewHtml(context) {
    const htmlPath = path.join(context.extensionPath, 'webview', 'sf-debug-viewer.html');
    return fs.readFileSync(htmlPath, 'utf8');
}

function getDefaultWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length) {
        return { path: folders[0].uri.fsPath, name: folders[0].name };
    }
    return null;
}

function activate(context) {
    let panel = null;
    let webviewReady = false;
    // Logs requested before the webview finished loading (e.g. right-click a
    // .log file while no viewer is open yet) — flushed on the webview's 'ready'.
    let pendingLogs = [];

    const output = vscode.window.createOutputChannel('Apex Debug Log Parser');
    context.subscriptions.push(output);

    async function handleMessage(msg) {
        if (!panel) return;
        const reply = (result) => panel.webview.postMessage({ reqId: msg.reqId, result });
        const replyError = (err) => panel.webview.postMessage({ reqId: msg.reqId, error: String((err && err.message) || err) });

        try {
            switch (msg.type) {
                case 'ready': {
                    webviewReady = true;
                    const root = getDefaultWorkspaceRoot();
                    panel.webview.postMessage({
                        type: 'init',
                        path: root ? root.path : null,
                        name: root ? root.name : null,
                    });
                    const queued = pendingLogs;
                    pendingLogs = [];
                    for (const log of queued) {
                        panel.webview.postMessage({ type: 'openLog', name: log.name, text: log.text });
                    }
                    break;
                }
                case 'scanSource': {
                    // Index the workspace's Apex classes/triggers so the
                    // viewer's "View Source" snippet popups work without the
                    // browser tool's manual folder-picking dance.
                    const start = Date.now();
                    const res = await scanApexSources(msg.path);
                    output.appendLine(
                        `[${new Date().toLocaleTimeString()}] Found ${res.files.length} Apex files (${res.scope}) under "${msg.path}" in ${Date.now() - start}ms`
                    );
                    reply(res);
                    break;
                }
                case 'pickSourceFolder': {
                    // The viewer's "📂 Source" button — point snippets at a
                    // different project than the open workspace.
                    const picked = await vscode.window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false,
                        openLabel: 'Use as Apex source folder',
                    });
                    if (!picked || !picked.length) { reply(null); break; }
                    reply(await scanApexSources(picked[0].fsPath));
                    break;
                }
                case 'readFile': {
                    reply(await fsp.readFile(msg.path, 'utf8'));
                    break;
                }
                case 'openFile': {
                    // "View source" from the log tree: open the real file in a
                    // VS Code editor tab beside the viewer, at the log's line.
                    const doc = await vscode.workspace.openTextDocument(msg.path);
                    const editor = await vscode.window.showTextDocument(doc, {
                        viewColumn: vscode.ViewColumn.Beside,
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

    function ensurePanel() {
        if (panel) {
            panel.reveal(vscode.ViewColumn.Active);
            return;
        }
        webviewReady = false;
        panel = vscode.window.createWebviewPanel(
            'apexDebugLogParser',
            'Apex Debug Log Parser',
            vscode.ViewColumn.Active,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        panel.webview.html = getWebviewHtml(context);
        panel.webview.onDidReceiveMessage(handleMessage);
        panel.onDidDispose(() => { panel = null; webviewReady = false; pendingLogs = []; });
    }

    async function openLogUri(uri) {
        let text;
        // Prefer the open editor's buffer over disk so unsaved edits (or a log
        // pasted into an untitled-but-saved-as-.log file) show what's on screen.
        const openDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
        if (openDoc) {
            text = openDoc.getText();
        } else {
            try {
                text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
            } catch (e) {
                vscode.window.showErrorMessage(`Apex Debug Log Parser: could not read ${uri.fsPath}: ${e.message || e}`);
                return;
            }
        }
        const log = { name: path.basename(uri.fsPath), text };
        ensurePanel();
        if (webviewReady) {
            panel.webview.postMessage({ type: 'openLog', name: log.name, text: log.text });
        } else {
            pendingLogs.push(log);
        }
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('apexDebug.open', () => ensurePanel())
    );

    // Right-click a .log file (Explorer, editor tab, or inside the editor) →
    // open it straight in the viewer, parsed into a call tree. Explorer
    // multi-select passes (clickedUri, allSelectedUris) — open each selected
    // log as its own tab.
    context.subscriptions.push(
        vscode.commands.registerCommand('apexDebug.openLogFile', async (uri, uris) => {
            let targets = Array.isArray(uris) && uris.length ? uris : (uri ? [uri] : []);
            if (!targets.length && vscode.window.activeTextEditor) {
                targets = [vscode.window.activeTextEditor.document.uri];
            }
            targets = targets.filter(u => u instanceof vscode.Uri);
            if (!targets.length) {
                vscode.window.showWarningMessage('Apex Debug Log Parser: open or right-click a .log file first.');
                return;
            }
            for (const target of targets) await openLogUri(target);
        })
    );
}

function deactivate() {}

module.exports = { activate, deactivate };
