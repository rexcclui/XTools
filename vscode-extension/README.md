# ApexFlow: Trace Parents (VS Code extension)

Reverse-dependency tracer for Salesforce LWC components. Given a component,
finds every other component that references it — as an HTML `<c-name>` (or
`<ns-name>`) template tag, a static `import … from 'c/Name'`, or a dynamic
`import('c/Name')` — then lets you keep expanding up the ancestor chain,
generation by generation, until you reach root components nothing else
references.

This is the same tracer built into [ApexFlow](../public/apexflow.html), the
browser-based tool in this repo, ported to run as a VS Code extension instead.
The browser version is limited by the File System Access API's sandboxing,
which adds real per-file overhead a native Node.js process doesn't pay —
running as a VS Code extension (Node.js extension host, direct `fs` access)
avoids that entirely, which is the whole reason this exists.

## Using it

1. Open a Salesforce DX project folder (or any folder containing LWC
   `.js`/`.html` bundles) in VS Code.
2. Right-click a `.js` or `.html` file in the Explorer (or its editor tab) and
   choose **ApexFlow: Trace Parents (this component)** — or run
   **ApexFlow: Trace Parents…** from the Command Palette to type a component
   name directly.
3. Results appear in the **ApexFlow: Trace Parents** view in the Explorer
   sidebar. The traced component is the root node; expand it to see its direct
   parents, expand those to climb another generation, and so on — same
   interaction model as VS Code's built-in "Call Hierarchy: Show Incoming
   Calls" view.
4. Click any node to open its source file. A branch that would cycle back to
   a component already seen higher up shows as a "↩ already seen on this
   branch" leaf instead of recursing forever.
5. Use the refresh icon in the view's title bar to force a full rescan if
   you've made changes the file watcher might have missed (e.g. files changed
   outside VS Code while it wasn't running).

## How it works

- `src/traceParents.js` — walks the workspace, builds an in-memory index of
  every `.js`/`.html` file's text keyed by bare component name, and does the
  regex-based reverse-reference lookup for a single hop (`findDirectParents`).
  The index is built once per workspace root and cached; a file-system
  watcher keeps it correct by re-reading just the one file that changed
  instead of invalidating the whole thing.
- `src/parentsTreeProvider.js` — a `vscode.TreeDataProvider` that expands
  lazily: each node's parents are computed on demand when you expand it,
  rather than pre-computing the whole ancestor tree up front.
- `src/extension.js` — wires up the commands, the tree view, the output
  channel (scan timing), and the file watcher.

## Try it locally

No build step — it's plain CommonJS with zero dependencies. To try it out:

1. Open the `vscode-extension` folder itself in VS Code.
2. Press `F5` (or Run → Start Debugging) to launch an Extension Development
   Host window.
3. In that new window, open your actual Salesforce project folder and use the
   commands described above.

To install it permanently without publishing, copy this folder into your VS
Code extensions directory (`~/.vscode/extensions/apexflow-trace-parents` on
macOS/Linux, `%USERPROFILE%\.vscode\extensions\apexflow-trace-parents` on
Windows) and restart VS Code.
