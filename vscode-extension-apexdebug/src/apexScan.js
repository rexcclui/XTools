'use strict';

// Pure Node.js scan for Apex source files (.cls/.trigger), used to power the
// webview's "View Source" snippet popups. Mirrors the browser tool's
// walkDirForSrc/walkDirForAllApex logic (public/sf-debug-viewer.html): prefer
// files living under a force-app directory; if none are found, fall back to
// every Apex file under the scanned root. Kept dependency-free (no `vscode`
// import) so it can be exercised directly in tests without a VS Code host.

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const SKIP_DIRS = new Set([
    '__tests__', '__mocks__', 'node_modules', '.git', '.sfdx', '.sf', 'dist',
    'build', 'target', 'out', '.next', '.cache', '.vscode',
]);

const APEX_FILE_RE = /\.(cls|trigger)$/i;

// Returns { name, scope, files } where files is [{key, path}] — key is the
// lowercased class name the webview's _srcFileMap is keyed by, path is the
// absolute path the host reads on demand when a snippet is requested.
async function scanApexSources(rootAbsPath) {
    const all = [];
    const forceApp = [];

    async function walk(absPath, underForceApp) {
        let entries;
        try {
            entries = await fsp.readdir(absPath, { withFileTypes: true });
        } catch (e) {
            return; // vanished / permission denied — skip
        }
        await Promise.all(entries.map(async (e) => {
            if (e.isDirectory()) {
                if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) return;
                await walk(path.join(absPath, e.name), underForceApp || e.name.toLowerCase() === 'force-app');
            } else if (e.isFile() && APEX_FILE_RE.test(e.name)) {
                const rec = { key: e.name.replace(APEX_FILE_RE, '').toLowerCase(), path: path.join(absPath, e.name) };
                all.push(rec);
                if (underForceApp) forceApp.push(rec);
            }
        }));
    }

    const startInScope = path.basename(rootAbsPath).toLowerCase() === 'force-app';
    await walk(rootAbsPath, startInScope);

    const files = forceApp.length ? forceApp : all;
    return {
        name: path.basename(rootAbsPath),
        scope: forceApp.length ? 'force-app' : 'selected-folder',
        files,
    };
}

module.exports = { scanApexSources, SKIP_DIRS };
