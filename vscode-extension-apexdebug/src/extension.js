'use strict';

const vscode = require('vscode');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const cp = require('child_process');
const { scanApexSources } = require('./apexScan');

// ── sf CLI helpers (Load Debug Logs from Org) ───────────────────────────────

function execCli(command) {
    return new Promise((resolve, reject) => {
        // exec (not execFile) so `sf.cmd` resolves through the shell on Windows.
        cp.exec(command, { maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
            if (err) {
                err.stdout = stdout;
                err.stderr = stderr;
                reject(err);
            } else {
                resolve(stdout);
            }
        });
    });
}

function isCliMissing(err) {
    // ENOENT / exit code 127: the shell could not find the binary at all.
    // The string checks cover cmd.exe ("is not recognized"), bash ("command
    // not found") and dash ("sf: not found").
    return !!err && (err.code === 'ENOENT' || err.code === 127
        || /is not recognized|command not found|: not found|No such file or directory/i.test(String(err.stderr || err.message || '')));
}

// sf exits non-zero on org/auth errors but still prints a JSON envelope with
// the real message on stdout — surface that instead of the generic exec error.
function cliErrorMessage(err) {
    try {
        const parsed = JSON.parse(err.stdout);
        if (parsed && (parsed.message || parsed.name)) return parsed.message || parsed.name;
    } catch (_) { /* not JSON — fall through */ }
    return String(err.stderr || err.message || err).trim();
}

// Run one resolved CLI command and parse its --json output.
async function runCliJson(cmd) {
    try {
        const stdout = await execCli(cmd);
        try {
            return JSON.parse(stdout);
        } catch (_) {
            throw new Error(`unexpected CLI output from "${cmd}": ${String(stdout).slice(0, 200)}`);
        }
    } catch (e) {
        throw new Error(cliErrorMessage(e));
    }
}

// ── CLI discovery ───────────────────────────────────────────────────────────
// The extension host often runs with a minimal PATH (VS Code launched from
// the Dock / Start menu doesn't get the shell's PATH), so `sf` working in the
// user's terminal doesn't mean plain `cp.exec('sf …')` can find it. Resolve
// the binary once per session: explicit setting → PATH → login-shell lookup
// (picks up nvm/Homebrew PATH edits from shell rc files) → well-known install
// locations.

let cachedCli; // { bin, flavor: 'sf' | 'sfdx' } | null; undefined = not resolved yet

function cliFlavor(binPath) {
    return /sfdx(\.cmd|\.exe)?$/i.test(binPath) ? 'sfdx' : 'sf';
}

function cliCandidatePaths() {
    const os = require('os');
    const home = os.homedir();
    const paths = [];
    if (process.platform === 'win32') {
        const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
        const pf = process.env.ProgramFiles || 'C:\\Program Files';
        const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
        paths.push(
            path.join(local, 'sf', 'client', 'bin', 'sf.cmd'),        // sf installer
            path.join(pf, 'sf', 'bin', 'sf.cmd'),
            path.join(appData, 'npm', 'sf.cmd'),                      // npm -g
            path.join(appData, 'npm', 'sfdx.cmd'),
            path.join(local, 'sfdx', 'client', 'bin', 'sfdx.cmd'),
        );
    } else {
        paths.push(
            '/usr/local/bin/sf',                                       // macOS pkg / npm -g
            '/opt/homebrew/bin/sf',                                    // Homebrew (Apple Silicon)
            path.join(home, '.local', 'share', 'sf', 'client', 'bin', 'sf'),
            path.join(home, '.npm-global', 'bin', 'sf'),
            path.join(home, '.volta', 'bin', 'sf'),
            '/usr/bin/sf',
            '/usr/local/bin/sfdx',
            '/opt/homebrew/bin/sfdx',
        );
        // nvm-managed node: ~/.nvm/versions/node/<version>/bin/sf
        try {
            const nvmDir = path.join(home, '.nvm', 'versions', 'node');
            for (const ver of fs.readdirSync(nvmDir).sort().reverse()) {
                paths.push(path.join(nvmDir, ver, 'bin', 'sf'));
            }
        } catch (_) { /* no nvm */ }
    }
    return paths;
}

// A project-local CLI (npm-installed: <workspace>/node_modules/.bin/sf) is
// common in SFDX repos and is pinned to the project — prefer it over any
// global install. Also looks one folder level down so monorepos where the
// package lives in a subfolder (e.g. pse/app/node_modules) still resolve.
function workspaceCliPaths() {
    const names = process.platform === 'win32' ? ['sf.cmd', 'sfdx.cmd'] : ['sf', 'sfdx'];
    const paths = [];
    for (const folder of (vscode.workspace.workspaceFolders || [])) {
        const root = folder.uri.fsPath;
        const dirs = [root];
        try {
            for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
                if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                    dirs.push(path.join(root, entry.name));
                }
            }
        } catch (_) { /* unreadable root */ }
        for (const dir of dirs) {
            for (const name of names) paths.push(path.join(dir, 'node_modules', '.bin', name));
        }
    }
    return paths;
}

// Does `<bin> --version` run at all? (Distinguishes "missing binary" from an
// installed CLI, whatever it prints.)
function cliResponds(bin) {
    return execCli(`${bin} --version`).then(() => true, err => !isCliMissing(err));
}

// Ask the user's login shell where sf lives — sources ~/.zprofile/.bash_profile
// etc., which is where Homebrew and nvm add themselves to PATH.
function loginShellWhich(name) {
    if (process.platform === 'win32') return Promise.resolve(null);
    return new Promise(resolve => {
        const shell = process.env.SHELL || '/bin/bash';
        cp.exec(`${shell} -l -c "command -v ${name}"`, { timeout: 5000 }, (err, stdout) => {
            const found = String(stdout || '').trim().split('\n').pop();
            resolve(!err && found && found.startsWith('/') ? found : null);
        });
    });
}

async function resolveSfCli() {
    if (cachedCli !== undefined) return cachedCli;

    // 1. Explicit setting always wins.
    const configured = vscode.workspace.getConfiguration('apexDebug').get('sfCliPath');
    if (configured && String(configured).trim()) {
        cachedCli = { bin: `"${String(configured).trim()}"`, flavor: cliFlavor(configured) };
        return cachedCli;
    }
    // 2. Project-local install in the workspace (node_modules/.bin/sf).
    for (const candidate of workspaceCliPaths()) {
        try {
            if (fs.existsSync(candidate)) {
                cachedCli = { bin: `"${candidate}"`, flavor: cliFlavor(candidate) };
                return cachedCli;
            }
        } catch (_) { /* keep probing */ }
    }
    // 3. Whatever PATH the extension host does have.
    for (const name of ['sf', 'sfdx']) {
        if (await cliResponds(name)) { cachedCli = { bin: name, flavor: name }; return cachedCli; }
    }
    // 4. Login shell (macOS/Linux GUI launches).
    for (const name of ['sf', 'sfdx']) {
        const found = await loginShellWhich(name);
        if (found) { cachedCli = { bin: `"${found}"`, flavor: name }; return cachedCli; }
    }
    // 5. Well-known install locations.
    for (const candidate of cliCandidatePaths()) {
        try {
            if (fs.existsSync(candidate)) {
                cachedCli = { bin: `"${candidate}"`, flavor: cliFlavor(candidate) };
                return cachedCli;
            }
        } catch (_) { /* keep probing */ }
    }
    cachedCli = null;
    return null;
}

function listLogsCmd(cli, orgFlag) {
    return cli.flavor === 'sf'
        ? `${cli.bin} apex list log --json${orgFlag}`
        : `${cli.bin} force:apex:log:list --json${orgFlag}`;
}

function getLogCmd(cli, logId, orgFlag) {
    return cli.flavor === 'sf'
        ? `${cli.bin} apex get log --log-id ${logId} --json${orgFlag}`
        : `${cli.bin} force:apex:log:get --logid ${logId} --json${orgFlag}`;
}

function targetOrgFlag() {
    const org = vscode.workspace.getConfiguration('apexDebug').get('targetOrg');
    return org ? ` --target-org "${org}"` : '';
}

function fmtBytes(n) {
    n = Number(n) || 0;
    if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB';
    if (n > 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
}

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

    // The resolved CLI is cached for the session — drop it if the override
    // setting or the workspace (project-local node_modules) changes.
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('apexDebug.sfCliPath')) cachedCli = undefined;
        }),
        vscode.workspace.onDidChangeWorkspaceFolders(() => { cachedCli = undefined; })
    );

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
                case 'loadOrgLogs': {
                    // The viewer's "⚡ Load Debug" button — list the org's
                    // debug logs via the sf CLI and load the picked ones.
                    await loadLogsFromOrg();
                    reply(true);
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

    // "Load Debug" — list the org's ApexLog records through the Salesforce
    // CLI, let the user pick one or more, download each with
    // `sf apex get log` and open them as viewer tabs. Reachable from the
    // viewer's toolbar button and from the Command Palette.
    async function loadLogsFromOrg() {
        try {
            const cli = await resolveSfCli();
            if (!cli) {
                const openSettings = 'Set CLI Path';
                const choice = await vscode.window.showErrorMessage(
                    'Apex Debug: Salesforce CLI not found — checked the workspace\'s node_modules/.bin, PATH, your login shell, and common install locations. ' +
                    'If it is installed, set "apexDebug.sfCliPath" to the executable\'s full path (find it with `which sf` / `where sf` in a terminal). ' +
                    'Otherwise install it from https://developer.salesforce.com/tools/salesforcecli and restart VS Code.',
                    openSettings
                );
                if (choice === openSettings) {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'apexDebug.sfCliPath');
                }
                return;
            }
            output.appendLine(`[${new Date().toLocaleTimeString()}] Using Salesforce CLI: ${cli.bin} (${cli.flavor})`);
            const orgFlag = targetOrgFlag();
            const listJson = await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Apex Debug: fetching debug log list from org…' },
                () => runCliJson(listLogsCmd(cli, orgFlag))
            );
            const logs = Array.isArray(listJson && listJson.result) ? listJson.result : [];
            if (!logs.length) {
                vscode.window.showInformationMessage('Apex Debug: no debug logs found in the org. Run some Apex with debug logging enabled, then try again.');
                return;
            }
            logs.sort((a, b) => String(b.StartTime || '').localeCompare(String(a.StartTime || '')));
            const items = logs.map(l => ({
                label: `${String(l.StartTime || '').replace('T', ' ').replace(/\.\d+.*$/, '')}  ${l.Operation || ''}`,
                description: `${l.Status || ''} · ${fmtBytes(l.LogLength)} · ${l.DurationMilliseconds || 0} ms`,
                detail: `${(l.LogUser && l.LogUser.Name) || ''} · ${l.Application || ''} · ${l.Id}`,
                log: l,
            }));
            const picked = await vscode.window.showQuickPick(items, {
                canPickMany: true,
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: `Select debug log(s) to load — ${logs.length} found in org`,
            });
            if (!picked || !picked.length) return;

            ensurePanel();
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Apex Debug: downloading log(s)…' },
                async (progress) => {
                    for (let i = 0; i < picked.length; i++) {
                        const l = picked[i].log;
                        progress.report({ message: `${i + 1}/${picked.length} — ${l.Id}` });
                        const got = await runCliJson(getLogCmd(cli, l.Id, orgFlag));
                        // Shape varies by CLI version: result may be the log
                        // string, { log }, or [ { log } ].
                        const r = got && got.result;
                        let text = '';
                        if (typeof r === 'string') text = r;
                        else if (Array.isArray(r) && r[0]) text = typeof r[0] === 'string' ? r[0] : (typeof r[0].log === 'string' ? r[0].log : '');
                        else if (r && typeof r.log === 'string') text = r.log;
                        if (!text.trim()) throw new Error(`log ${l.Id} came back empty`);
                        const stamp = String(l.StartTime || '').replace(/:/g, '-').replace(/\..*$/, '');
                        const op = String(l.Operation || 'log').replace(/[\\/:*?"<>| ]+/g, '_').replace(/^_+|_+$/g, '');
                        const name = `${stamp}_${op}_${String(l.Id).slice(-6)}.log`;
                        if (webviewReady) {
                            panel.webview.postMessage({ type: 'openLog', name, text });
                        } else {
                            pendingLogs.push({ name, text });
                        }
                        output.appendLine(`[${new Date().toLocaleTimeString()}] Loaded ${name} (${fmtBytes(text.length)}) from org`);
                    }
                }
            );
        } catch (e) {
            vscode.window.showErrorMessage(`Apex Debug: failed to load logs from org — ${String((e && e.message) || e)}`);
        }
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('apexDebug.open', () => ensurePanel())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('apexDebug.loadFromOrg', async () => {
            ensurePanel();
            await loadLogsFromOrg();
        })
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
