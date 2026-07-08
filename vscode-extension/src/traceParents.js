'use strict';

const fs = require('fs/promises');
const path = require('path');

// Mirrors LWC_SKIP_DIRS from public/apexflow.html so the two tools stay
// consistent about what counts as noise.
const SKIP_DIRS = new Set([
    'node_modules', '.git', '.sfdx', '.sf', 'dist', 'build', 'target', 'out',
    '.next', '.cache', '.vscode', '__tests__', '__mocks__', '.gradle', '.idea',
    '.husky', '.localdevserver', '__snapshots__', 'staticresources',
]);

function escapeRegExpLiteral(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// camelCase -> kebab-case, e.g. rm_resourceAvailabilityTile -> rm_resource-availability-tile
function camelToKebab(name) {
    return String(name || '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Strips a leading "<parentLwc>." qualifier, if any (matches apexflow.html's
// bareComponentName — kept here in case names ever get qualified the same way).
function bareComponentName(name) {
    const text = String(name || '');
    const idx = text.lastIndexOf('.');
    return idx > 0 ? text.slice(idx + 1) : text;
}

// Recursively collects every .js/.html file under root, fanning subdirectories
// out via Promise.all so the walk doesn't serialize one folder at a time.
async function collectSourceFiles(root) {
    const out = [];

    async function walk(dir) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch (e) {
            return; // unreadable dir (permissions, race with fs) — skip it
        }
        const subWalks = [];
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue; // dot-dirs/files always skipped
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (SKIP_DIRS.has(entry.name)) continue;
                subWalks.push(walk(full));
            } else if (/\.(js|html)$/i.test(entry.name)) {
                out.push(full);
            }
        }
        await Promise.all(subWalks);
    }

    await walk(root);
    return out;
}

// Holds every .js/.html file's text under a workspace root, keyed by bare
// component name (its filename without extension), plus the regex-based
// reverse-reference lookup used to climb the ancestor chain. Node's fs runs
// with direct OS access (no browser File System Access API sandbox tax), and
// building this once per root and reusing it across traces is what keeps
// repeated queries fast.
class FileIndex {
    constructor(root) {
        this.root = root;
        this.jsByName = new Map();   // bare name -> { text, filePath }
        this.htmlByName = new Map();
        this.fileCount = 0;
        this.buildMs = 0;
    }

    async build(onProgress) {
        const start = Date.now();
        const files = await collectSourceFiles(this.root);
        const total = files.length;
        let cursor = 0;
        let done = 0;
        let lastReportAt = 0;
        const concurrency = Math.min(32, total) || 1;

        const worker = async () => {
            while (true) {
                const idx = cursor++;
                if (idx >= total) return;
                const filePath = files[idx];
                const isJs = /\.js$/i.test(filePath);
                const base = path.basename(filePath).replace(/\.(js|html)$/i, '');
                try {
                    const text = await fs.readFile(filePath, 'utf8');
                    const map = isJs ? this.jsByName : this.htmlByName;
                    // Same base name can legitimately appear in more than one
                    // folder (rare) — concatenating is safer than overwriting.
                    const existing = map.get(base);
                    map.set(base, {
                        text: existing ? `${existing.text}\n${text}` : text,
                        filePath: existing ? existing.filePath : filePath,
                    });
                } catch (e) {
                    // unreadable file — skip, don't fail the whole scan
                }
                done++;
                const now = Date.now();
                if (onProgress && (now - lastReportAt >= 150 || done === total)) {
                    lastReportAt = now;
                    onProgress(done, total);
                }
            }
        };

        await Promise.all(Array.from({ length: concurrency }, worker));
        this.fileCount = total;
        this.buildMs = Date.now() - start;
    }

    // Re-reads a single changed/created file in place, so a file-watcher event
    // doesn't have to invalidate (and pay to rebuild) the entire index — only
    // this one file's text is stale.
    async updateFile(filePath) {
        if (!/\.(js|html)$/i.test(filePath)) return;
        const isJs = /\.js$/i.test(filePath);
        const base = path.basename(filePath).replace(/\.(js|html)$/i, '');
        const map = isJs ? this.jsByName : this.htmlByName;
        try {
            const text = await fs.readFile(filePath, 'utf8');
            map.set(base, { text, filePath });
        } catch (e) {
            this.removeFile(filePath);
        }
    }

    // Drops a deleted file's entry — but only if it was actually the source
    // of that entry (guards the rare same-base-name-in-two-folders case).
    removeFile(filePath) {
        if (!/\.(js|html)$/i.test(filePath)) return;
        const isJs = /\.js$/i.test(filePath);
        const base = path.basename(filePath).replace(/\.(js|html)$/i, '');
        const map = isJs ? this.jsByName : this.htmlByName;
        const existing = map.get(base);
        if (existing && existing.filePath === filePath) map.delete(base);
    }

    // One hop: every other component that references `componentName`, either
    // as a JS import (static `from '<ns>/Name'` or dynamic `import('<ns>/Name')`,
    // namespace left as a wildcard so managed/custom namespaces match too, not
    // just `c/`) or as an `<ns-name>` template tag.
    findDirectParents(componentName) {
        const bare = bareComponentName(componentName);
        const kebab = camelToKebab(bare);
        const bareEsc = escapeRegExpLiteral(bare);
        const kebabEsc = escapeRegExpLiteral(kebab);
        const staticImportRe = new RegExp(`\\bfrom\\s+['"][\\w]+/${bareEsc}['"]`, 'i');
        const dynamicImportRe = new RegExp(`\\bimport\\(\\s*['"][\\w]+/${bareEsc}['"]`, 'i');
        const tagRe = new RegExp(`<[\\w]+-${kebabEsc}(?![\\w-])`, 'i');

        const parents = [];
        const matchedBareNames = new Set();

        for (const [candidateName, entry] of this.jsByName) {
            const candidateBare = bareComponentName(candidateName);
            if (candidateBare === bare || matchedBareNames.has(candidateBare)) continue;
            const line = entry.text.split('\n').find(l => staticImportRe.test(l) || dynamicImportRe.test(l));
            if (line) {
                matchedBareNames.add(candidateBare);
                parents.push({ componentName: candidateName, kind: 'js-import', snippet: line.trim(), filePath: entry.filePath });
            }
        }

        for (const [candidateName, entry] of this.htmlByName) {
            const candidateBare = bareComponentName(candidateName);
            if (candidateBare === bare || matchedBareNames.has(candidateBare)) continue;
            const line = entry.text.split('\n').find(l => tagRe.test(l));
            if (line) {
                matchedBareNames.add(candidateBare);
                parents.push({ componentName: candidateName, kind: 'html-tag', snippet: line.trim(), filePath: entry.filePath });
            }
        }

        return parents;
    }
}

module.exports = { FileIndex, collectSourceFiles, bareComponentName, camelToKebab, escapeRegExpLiteral };
