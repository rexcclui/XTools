# Apex Debug Log Parser — development notes

How the extension is built and wired up, plus packaging/install instructions.
For what it does and how to use it, see [README.md](./README.md) (that's what
the VS Code extension page shows) — this file keeps the technical details.

The extension is the full [Salesforce Apex Debug Log Parser](https://github.com/rexcclui/XTools/blob/main/public/sf-debug-viewer.html)
browser-tool experience — collapsible Apex call tree, SOQL & DML breakdown,
exceptions, method timings, multi-log tabs, full-text search and custom
highlighting — running inside VS Code instead of a browser tab, with a
right-click entry point on `.log` files.

## Two ways in

### Right-click a `.log` file → **Open in Apex Debug Log Parser**

Available in the Explorer, on an editor tab, and inside an open editor. The
file is read by the extension host and lands directly in the viewer, already
parsed into a call tree — no copy/paste. Explorer multi-select opens each
selected log as its own tab. If the file is open with unsaved edits, the
editor buffer (what you see) is what gets parsed.

### `Apex Debug Log Parser: Open Viewer` — Command Palette

Opens an empty viewer; paste a log, drop files onto it (both OS files and
drags from VS Code's own Explorer work), or use ▶ Load sample.

## How it's wired up

`webview/sf-debug-viewer.html` is the same file as `public/sf-debug-viewer.html`,
ported with the same approach as the CodeGraph Apex/LWC extension
(`../vscode-extension`): the log parser, call tree, tabs, search, and
highlighting have no filesystem dependency and run unchanged; only the narrow
browser-specific slice is swapped for a message-passing bridge to the
extension host (`src/extension.js`).

What actually changed, piece by piece:

- **Log input** — a new host-pushed `openLog` message feeds the right-click
  command's file straight into a tab (reusing the pristine initial tab so you
  don't get an empty "Log 1" sitting next to your log). Logs opened before
  the webview finishes loading are queued host-side and flushed on `ready`.
- **`openSourceFolder()`** (powers the "View Source" code-snippet popups) —
  instead of `window.showDirectoryPicker()` + a sandboxed directory walk, the
  host scans for `.cls`/`.trigger` files with native `fs` (`src/apexScan.js`,
  same force-app-first/fall-back-to-everything rules as the browser version)
  and the webview reads file bodies on demand through the bridge. The open
  workspace folder is **auto-scanned on load**, so snippets work immediately;
  the "📂 Source" button now opens VS Code's native folder picker for
  pointing at a different project.
- **Drag & drop** — extended to handle `text/uri-list`, which is what a drag
  from VS Code's own Explorer or editor tabs carries (OS-file drags still go
  through the original `FileReader` path).
- **Parsing worker** — unchanged. If Blob-URL workers are ever unavailable in
  a webview, the existing `parseLogAsync` main-thread fallback already covers
  it.
- **localStorage history** — unchanged; VS Code webviews have localStorage,
  though persistence across reloads isn't guaranteed. Everything was already
  try/catch-wrapped, so worst case is "no history", not breakage.
- **Removed** — the marketing intro banner and the `/api/visits` counter
  fetch (there's no server behind a webview).

The host answers four message types: `ready` (handshake → replies with the
workspace root and flushes queued logs), `scanSource`, `pickSourceFolder`,
and `readFile`.

## Try it locally

No build step — plain CommonJS, zero dependencies.

1. Open the `vscode-extension-apexdebug` folder itself in VS Code.
2. Press `F5` (Run → Start Debugging) to launch an Extension Development
   Host window.
3. In that window, right-click any `.log` file and choose
   **Open in Apex Debug Log Parser**.

To install it permanently without publishing, package a VSIX and install it:

```bash
npx @vscode/vsce package --no-dependencies
code --install-extension apexdebug-log-parser-<version>.vsix --force
```

**Updating an installed build — do all three, in order** (same ritual as the
CodeGraph extension, same reasons):

1. Bump `version` in `package.json` before packaging — same-version VSIX
   reinstalls can silently reuse the cached old code.
2. Run "Developer: Reload Window" after installing.
3. Close and reopen any open Apex Debug Log Parser tab — a restored webview
   panel still runs the HTML it was created with.

## What's verified vs. what to check when you try it

The host-side pieces (Apex source scan with force-app preference and
fallback, the `text/uri-list` drop parsing incl. Windows paths) were tested
directly outside VS Code, and every script passes a syntax check. What that
*can't* verify is the UI running inside an actual webview — please open a
real debug log and report anything that misbehaves. Unlike the CodeGraph
extension there are no CDN dependencies here (the page is fully
self-contained), so it should work offline.
