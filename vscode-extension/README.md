# CodeGraph Apex/LWC Dependency

Visualize the dependencies between your components — an interactive map of
how your Salesforce Apex classes, LWC components, and Java code depend on
each other, right inside VS Code.

Open your project, and the extension scans it and draws the dependency map:
which LWC components call which Apex classes, which classes call each other,
and what each dependency actually carries (method calls, imports, `<c-…>`
tags). Every relationship is an arrow you can inspect. From there you can
drill into a single class's call flow, follow a component's dependency chain
up to its roots, and read the underlying code without leaving the diagram.

## Getting started

1. Open your project folder (e.g. an SFDX project root) in VS Code.
2. Run **CodeGraph Apex/LWC Dependency: Open Diagram** from the Command Palette
   (`Ctrl/Cmd+Shift+P`) — or right-click a `.cls` / `.js` / `.html` / `.java`
   file and choose it from the menu to open the diagram with that file loaded.
3. The workspace is scanned automatically and the architecture map renders.
   New to the tool? Click **▶ Load sample** in the toolbar to see an example
   map instantly, or the **?** help button for the built-in guide.

## Reading the architecture map

- **Node colors**: orange = Apex · blue = LWC · purple = LWC child ·
  green = HTML-only.
- **Ghost nodes** (dashed border, `?` prefix) are referenced but not loaded
  yet — right-click one and choose **Load Class** to pull it in.
- **Edges** are labeled with the method calls / imports they represent; hover
  a truncated label (or right-click the edge) to see the full list.
- **Mouse wheel** zooms, **click-and-drag** pans, and the **☰** button
  collapses the sidebar to give the diagram the full width.

## Right-click a node

| Action | What it does |
| --- | --- |
| **Analyze Flow** | Switch to a focused call-flow diagram for that class, tracing calls up to 6 levels deep |
| **Load Class** | Load a ghost node's source into the diagram |
| **Lookup Reference** | Find the HTML templates that embed this component via a `<c-…>` tag |
| **Trace Parents** | Climb every import/reference up to the root, generation by generation, and optionally load the whole ancestor chain |
| **Hide Children / Hide JS/Apex/HTML** | Peel away this node's outgoing edges — all of them, or just one type |
| **View Code / Source** | Open the method body or the full file in a real VS Code editor tab |

In **Analyze Flow** mode, use the pill toggles to pick which entry methods to
trace, right-click nodes to collapse/expand subtrees, and click **Back to
Overview** to return to the full map.

## Adding files to the diagram

- Right-click a file in VS Code's Explorer (or in an editor) → **CodeGraph
  Apex/LWC: Add to Diagram**.
- Or drag a `.cls` / `.java` / `.js` / `.html` file from the Explorer straight
  onto the diagram.
- LWC bundles are understood: loading a component's `.js` also brings in its
  paired `.html` template, `@salesforce/apex/…` imports connect components to
  their Apex controllers, and `<c-…>` tags become edges.
- Files changed on disk? Click **Reindex** in the sidebar. **Clear All**
  empties the diagram without losing the file index.

## Quick Trace Parents (no diagram needed)

Just want to know "who uses this component?" without opening the full diagram:

- Right-click inside an open `.js`/`.html` file → **Trace Parents (this
  component)**, or highlight a component name → **Trace Parents (selected
  name)**, or run **CodeGraph Apex/LWC Dependency: Trace Parents…** and type a name.
- Results appear as a tree in the Explorer sidebar — expand a node to climb
  one generation further up, click a node to open its source file.

## Good to know

- All scanning and parsing happens locally on your machine; no code is
  uploaded anywhere.
- The diagram renderer loads its libraries (Mermaid, etc.) from public CDNs,
  so the first open needs internet access.
- Curious how it works under the hood, or want to build it from source? See
  [DEVELOPMENT.md](https://github.com/rexcclui/XTools/blob/main/vscode-extension/DEVELOPMENT.md).
