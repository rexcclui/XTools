# CodeGraph Apex/LWC — development notes

How the extension is built and wired up, plus packaging/install instructions.
For what it does and how to use it, see [README.md](./README.md) (that's what
the VS Code extension page shows) — this file keeps the technical details that
used to live there.

The extension is the full [CodeGraph Apex/LWC](https://github.com/rexcclui/XTools/blob/main/public/apexflow.html)
browser-tool experience — architecture map, Analyze Flow call-graphs, Trace
Parents, and every context-menu action — running inside VS Code instead of a
browser tab, plus a lightweight Trace-Parents-only tree view for quick lookups
without opening the diagram.

## Why this exists

The browser version of CodeGraph Apex/LWC is limited by the File System Access API's
sandboxing, which adds real per-file overhead a native process doesn't pay.
Running inside VS Code means the file I/O happens in the extension host —
plain Node.js, direct `fs` access — which is the whole reason a native script
comparison was so much faster than the browser tool for large projects.

## Two ways in

### `CodeGraph Apex/LWC: Open Diagram` — the full experience

Run this from the Command Palette. It opens a webview panel with the *exact*
UI from `public/apexflow.html` — same Mermaid architecture map, Analyze Flow,
Trace Parents, Lookup Reference, Load Class, Hide/Show Children, View
Code/Source, the works — automatically pointed at your current workspace
folder (no folder picker needed unless you want to open a different one via
the **Open Folder** button).

### `CodeGraph Apex/LWC: Trace Parents…` / right-click → **Trace Parents (this component)**

A lighter-weight, VS Code-native alternative to the full diagram when you just
want an ancestor chain: results show as a lazy-expanding tree in the Explorer
sidebar (**CodeGraph Apex/LWC: Trace Parents (quick view)**), modeled on VS Code's
built-in "Call Hierarchy: Show Incoming Calls" — expand a node to climb one
generation further up. Click any node to open its source file.

## How the full diagram is wired up

`webview/apexflow.html` is the same file as `public/apexflow.html`, with only
its File System Access API / IndexedDB layer replaced by a message-passing
bridge to the extension host (`src/fullWebview.js`). Everything else —
parsing, Mermaid rendering, context menus, modals, the sidebar — is
unchanged, since none of it talks to the filesystem directly.

What actually changed, function by function:

- **`openFolder()`** — instead of `window.showDirectoryPicker()`, asks the
  host to show VS Code's native folder picker (`vscode.window.showOpenDialog`).
- **`buildHandleTree()`** — instead of recursively walking a live
  `FileSystemDirectoryHandle` one directory at a time, asks the host to walk
  the whole tree in one shot (`src/vfsWalk.js`: parallel `fs.readdir`, same
  skip-dirs/`isSourceFile` rules as the browser version) and hydrates the
  result into the exact `{kind, name, path, children}` shape the rest of the
  app already expects.
- **`collectHtmlFilesFromDirHandle()` / `collectSourceFilesFromDirHandle()`**
  (used by Lookup Reference and Trace Parents' fallback scan) — simplified to
  read straight from the already-built `feState.tree`, since the host walk is
  always fast and current; no more "live handle vs. cached tree" tradeoff.
- **File reads** (`handle.getFile()`) — a `makeFileHandle(path, name)` shim
  provides just the slice of `FileSystemFileHandle` the rest of the code
  calls: `getFile()` returns `{size, lastModified, arrayBuffer()}`, backed by
  a `readFile` message round-trip to the host. `readHandleTextDetailed`,
  `readHandleTextFast`, and everything built on them needed **zero changes** —
  they just call `.getFile()`/`.arrayBuffer()` like they always did.
- **`requestPermission()`** — a no-op returning `'granted'` on every handle;
  VS Code's workspace-trust model already covers this, there's no per-file
  permission prompt concept here.
- **IndexedDB (`idb*` functions), `localStorage`** — left completely
  unchanged. Every one of those functions was already defensively wrapped in
  try/catch (a pre-existing browser-robustness measure), so if the storage
  API behaves differently in a webview than a browser tab, they degrade
  gracefully to "no cache" rather than breaking anything. Given the host walk
  is already fast, that persistence was mostly a nice-to-have anyway — the one
  place it's user-visible is the file-history panel, which may not persist
  across restarts here.
- **OS drag-and-drop** — left completely unchanged; untested in a webview
  context, may or may not work depending on VS Code version.

`src/fullWebview.js` hosts the webview panel and answers four message types:
`ready` (handshake → replies with the workspace root), `walkTree`, `readFile`,
and `pickFolder`.

## Try it locally

No build step — plain CommonJS, zero dependencies.

1. Open the `vscode-extension` folder itself in VS Code.
2. Press `F5` (or Run → Start Debugging) to launch an Extension Development
   Host window.
3. In that new window, open your actual Salesforce project folder (or a
  workspace) and run **CodeGraph Apex/LWC: Open Diagram**, or use the Trace Parents
   commands directly.

To install it permanently without publishing, package a VSIX and install it:

```bash
npx @vscode/vsce package --no-dependencies
code --install-extension codegraph-apex-lwc-<version>.vsix --force
```

**Updating an installed build — do all three, in order:**

1. **Bump `version` in `package.json` before packaging.** VS Code identifies
   extensions as `publisher.name-version`; reinstalling a VSIX with the same
   version as what's already installed can silently reuse the cached old code.
   This is the #1 cause of "I reinstalled but nothing changed."
2. **Run "Developer: Reload Window"** after installing — the old code keeps
   running in the existing extension-host process until the window reloads.
3. **Close and reopen any open CodeGraph Apex/LWC tab** — a webview panel runs the
   HTML/JS it was created with; a tab restored from before the update still
   runs the old code even after a reload.

Avoid also copying this folder into `~/.vscode/extensions/` manually — a
folder copy and a VSIX install of the same extension ID coexist as two
installs, and which one VS Code loads is effectively arbitrary. If you ever
used the folder-copy method, delete that folder
(`~/.vscode/extensions/codegraph-apex-lwc`) and keep only the VSIX-managed one.

## What's verified vs. what to check when you try it

The webview↔host bridge itself (directory walk, skip-dirs, file reads through
the exact `getFile()`/`arrayBuffer()` chain the app uses, permission shim) was
tested end-to-end against a synthetic fixture outside VS Code, since a real
VS Code UI wasn't available in the environment this was built in. What that
*can't* verify is the UI layer running inside an actual webview — Mermaid
rendering, context menus, modals, CDN script loading (Mermaid/Prism/Font
Awesome/svg-pan-zoom load from `cdn.jsdelivr.net`/`cdnjs.cloudflare.com`, so
this needs network access and no restrictive CSP — none is set, matching the
browser version). Please open a real project with `CodeGraph Apex/LWC: Open Diagram`
and report back anything that doesn't render or misbehaves — that's the part
most likely to need a follow-up fix.
