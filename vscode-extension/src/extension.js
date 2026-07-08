'use strict';

const vscode = require('vscode');
const path = require('path');
const { FileIndex } = require('./traceParents');
const { TraceParentsProvider } = require('./parentsTreeProvider');
const { activateFullWebview } = require('./fullWebview');

function activate(context) {
    const fileIndexHolder = { current: null };
    const provider = new TraceParentsProvider(fileIndexHolder);
    const treeView = vscode.window.createTreeView('apexflowTraceParentsView', {
        treeDataProvider: provider,
    });
    context.subscriptions.push(treeView);

    const output = vscode.window.createOutputChannel('ApexFlow Trace Parents');
    context.subscriptions.push(output);

    // Full ApexFlow experience — architecture map, Analyze Flow, Trace
    // Parents, and every context-menu action, reusing the same webview UI as
    // the browser tool (public/apexflow.html) with its File System Access /
    // IndexedDB layer swapped for a bridge to this Node.js extension host.
    activateFullWebview(context, output);

    function getWorkspaceRootFor(fsPath) {
        if (fsPath) {
            const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fsPath));
            if (folder) return folder.uri.fsPath;
        }
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length) return folders[0].uri.fsPath;
        return fsPath ? path.dirname(fsPath) : null;
    }

    // Builds (or reuses) the FileIndex for `root`. Reading every .js/.html
    // file's content is the unavoidable cost — this just makes sure it's paid
    // at most once per workspace root per session instead of on every trace.
    async function ensureIndex(root, forceRebuild) {
        if (!root) throw new Error('No workspace folder open — open the project folder in VS Code first.');
        if (fileIndexHolder.current && fileIndexHolder.current.root === root && !forceRebuild) {
            return fileIndexHolder.current;
        }
        const index = new FileIndex(root);
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'ApexFlow: scanning workspace files',
                cancellable: false,
            },
            async (progressReporter) => {
                await index.build((done, total) => {
                    progressReporter.report({ message: `${done.toLocaleString()}/${total.toLocaleString()} files` });
                });
            }
        );
        output.appendLine(
            `[${new Date().toLocaleTimeString()}] Scanned ${index.fileCount.toLocaleString()} files under "${root}" in ${index.buildMs}ms ` +
            `(${index.fileCount ? (index.buildMs / index.fileCount).toFixed(2) : 0}ms/file avg)`
        );
        fileIndexHolder.current = index;
        return index;
    }

    async function traceFrom(componentName, filePath) {
        let root;
        try {
            root = getWorkspaceRootFor(filePath);
        } catch (e) {
            vscode.window.showErrorMessage(String(e.message || e));
            return;
        }
        if (!root) {
            vscode.window.showWarningMessage('ApexFlow: open a project folder/workspace first.');
            return;
        }
        try {
            await ensureIndex(root, false);
        } catch (e) {
            vscode.window.showErrorMessage(`ApexFlow Trace Parents failed: ${e.message || e}`);
            return;
        }
        provider.setRoot(componentName, filePath || null);
        await vscode.commands.executeCommand('workbench.view.explorer');
        try {
            await treeView.reveal(provider.rootNode, { expand: 2, select: true, focus: true });
        } catch (e) {
            // reveal can fail if the view isn't visible yet — non-fatal
        }
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('apexflowTraceParents.traceFromFile', async (uri) => {
            const target = uri instanceof vscode.Uri ? uri : vscode.window.activeTextEditor?.document.uri;
            if (!target) {
                vscode.window.showWarningMessage('ApexFlow: open or right-click a .js/.html file first.');
                return;
            }
            const base = path.basename(target.fsPath).replace(/\.(js|html)$/i, '');
            await traceFrom(base, target.fsPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('apexflowTraceParents.traceByName', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Component name to trace parents for',
                placeHolder: 'e.g. rm_resourceAvailabilityTile',
                ignoreFocusOut: true,
            });
            if (!name) return;
            await traceFrom(name.trim(), null);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('apexflowTraceParents.refresh', async () => {
            if (!provider.rootNode) {
                vscode.window.showInformationMessage('ApexFlow: nothing traced yet — run "Trace Parents…" first.');
                return;
            }
            const root = getWorkspaceRootFor(provider.rootNode.filePath);
            if (!root) return;
            try {
                await ensureIndex(root, true);
            } catch (e) {
                vscode.window.showErrorMessage(`ApexFlow rescan failed: ${e.message || e}`);
                return;
            }
            provider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('apexflowTraceParents.openFile', async (filePath) => {
            if (!filePath) return;
            try {
                const doc = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(doc, { preview: true });
            } catch (e) {
                vscode.window.showErrorMessage(`Could not open ${filePath}: ${e.message || e}`);
            }
        })
    );

    // Workspace contents can change under us (git checkout, pull, editing) —
    // keep the cached index correct by updating just the one file that
    // changed instead of invalidating (and later fully re-reading) everything,
    // which would erase most of the point of caching in the first place.
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{js,html}');
    watcher.onDidChange(uri => { fileIndexHolder.current?.updateFile(uri.fsPath).then(() => provider.refresh()); });
    watcher.onDidCreate(uri => { fileIndexHolder.current?.updateFile(uri.fsPath).then(() => provider.refresh()); });
    watcher.onDidDelete(uri => { fileIndexHolder.current?.removeFile(uri.fsPath); provider.refresh(); });
    context.subscriptions.push(watcher);
}

function deactivate() {}

module.exports = { activate, deactivate };
