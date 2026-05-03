# jsonGrid

A collection of browser-based developer tools for working with JSON data, Salesforce Apex code, and debug logs.

Zero dependencies. Single HTML files. Work offline.

**Live demo: [jsongrid.rex-cclui.workers.dev](https://jsongrid.rex-cclui.workers.dev/)**

---

## Tools

### JSON Grid (`index.html`)

An interactive workspace for viewing, editing, and comparing JSON data using a flexible grid layout.

**Features**

- **Multi-cell grid** — Organize JSON across a configurable grid (up to 5 columns × 8 rows)
- **Tabs** — Manage multiple independent workspaces, each with its own grid
- **Rendered table view** — Arrays of objects are automatically rendered as navigable tables
- **Pretty-print with expand/collapse** — Toggle formatted JSON with nested object/array collapsing (collapsed by default beyond 3 levels)
- **Side-by-side diff** — Select any two values and compare them with color-coded differences
- **Live highlighting** — Hover over a cell element to highlight the corresponding path in the raw editor, and vice versa
- **Copy buttons** — Copy full cell JSON from the header, or copy any nested object/array block
- **localStorage snippets** — Cell contents are auto-saved and can be reloaded from a dropdown history
- **Drag-and-drop** — Drop JSON files directly onto cells
- **Global search** — Search across all open cells at once
- **Dark mode** — Follows system preference automatically

**Usage**

Use the toolbar to set the number of **columns** (1–5) and **rows** (1–8). Each cell has:

| Control | Action |
|---|---|
| Title input | Label the cell |
| Pretty button | Toggle between raw editor and formatted view |
| Clear button | Wipe the cell's content |
| Maximize button | Expand a row to fill the viewport |
| Copy button | Copy the full cell JSON to clipboard |

Paste or type JSON into any cell's editor. Drag a `.json` file onto a cell to load it. Drag the divider between the raw editor and rendered view to resize the source panel. Drag column borders to resize columns.

**Comparing values**

1. Click up to two values in the rendered grid (they get an orange outline).
2. Click **Compare** in the toolbar to open the diff view.

| Color | Meaning |
|---|---|
| Purple | Value changed |
| Green | Added |
| Red | Removed |
| None | Unchanged |

**Saved snippets**

Cell content is automatically saved to `localStorage` with a timestamp. Focus a cell's editor and click the dropdown arrow to browse up to 200 saved entries.

---

### Apex / Java Class Diagram (`apexflow.html`)

A call-flow visualizer for Salesforce Apex (`.cls`) and Java (`.java`) files. Drop source files anywhere on the page to generate interactive Mermaid.js class relationship diagrams and drill into per-method call trees.

**Features**

- **Whole-page drop zone** — Drag one or more `.cls` or `.java` files anywhere onto the page; a green overlay confirms the drop target
- **Mixed-language support** — Apex and Java files can be loaded together; cross-language dependencies appear in the same diagram
- **Architecture map** — Automatically generates a system-level diagram showing dependencies between all loaded classes, interfaces, enums, and records
- **Analyze Flow mode** — Select a class and choose individual methods to visualize their call chains (up to 3 levels deep)
- **Collapsible nodes** — Click any entry or depth-1 node to collapse/expand its children; toggle icons (⊕/⊖) indicate state
- **Color-coded edges** — Each method's call path uses a distinct color; dashed lines indicate nested (depth-2) calls
- **Loop detection** — Calls inside loops are labeled with a letter suffix (e.g. `1N`, `2N`)
- **Right-click context menu** — On any diagram node: hide/show child nodes, open an Analyze Flow, or view the method's source code
- **Draggable code panel** — Right-click a node to open a resizable, draggable syntax-highlighted code snippet panel
- **Pan & zoom** — SVG diagram supports pan and zoom via `svg-pan-zoom`
- **Copy Mermaid** — Copy the current diagram's Mermaid definition to clipboard
- **Hide/show classes** — Toggle individual classes out of the architecture diagram without removing them
- **Collapsible sidebar** — Toggle the sidebar to maximize diagram space

**Usage**

1. Drag one or more `.cls` or `.java` files anywhere onto the page.
2. The **System Architecture Map** renders automatically, showing inter-class dependencies.
3. Click a class card to highlight it in the diagram. Click **Analyze Flow** to drill into its methods.
4. In Analyze Flow mode, toggle methods on/off in the sidebar to compose the call-flow diagram.
5. Click nodes to collapse/expand their children. Right-click for more options.

---

### SF Debug Viewer (`sf-debug-viewer.html`)

A Salesforce debug log parser and visualizer. Paste a raw debug log to get a color-coded call tree with filtering, search, and history.

**Features**

- **Log parser** — Parses standard Salesforce debug log format into a structured call tree
- **Call tree view** — Hierarchical tree of methods, constructors, SOQL, DML, callouts, flows, exceptions, and variable assignments — each with a distinct icon and color
- **Raw log view** — Color-coded line-by-line view synchronized with the tree (click a log line to jump to the corresponding tree node, and vice versa)
- **Resizable split pane** — Drag the divider between the raw log and tree panels
- **Tabs** — Open and switch between multiple logs simultaneously
- **Type filters** — Filter the tree to show only Methods, SOQL, DML, Debug statements, or Exceptions
- **Toggle controls** — Show/hide User Debug, System Methods, Variable Assignments, and timing gaps
- **Namespace filter** — Isolate nodes by Apex namespace prefix
- **Log tag filter** — Show/hide specific event types (e.g. `HEAP_ALLOCATE`, `STATEMENT_EXECUTE`) from the raw log
- **Keyword hide** — Suppress log lines matching one or more keywords
- **Text highlights** — Four configurable highlight slots for marking keywords across both views
- **Global search** — Search across all open log tabs at once
- **Expand / Collapse all** — Flatten or fully expand the call tree
- **Tree search** — Filter tree nodes by method name, class, or signature
- **Stats bar** — Summary counts for methods, SOQL, DML, exceptions, total lines, and execution duration
- **Log history** — Auto-saves parsed logs to `localStorage` (up to 4 MB); reload any previous log from the History panel
- **Drag-and-drop** — Drop `.log` or `.txt` debug log files directly onto the page
- **Sample log** — Load a built-in sample to explore the UI without a real log

**Usage**

1. Open `sf-debug-viewer.html` in a browser.
2. Paste a Salesforce debug log into the text area (or drag a log file onto the page), then click **Parse Log**.
3. Use the **type filter chips** and **toggle buttons** in the tree toolbar to focus on relevant events.
4. Click any tree node to highlight the corresponding raw log line. Click a raw log line to jump to the tree node.
5. Use **Highlight** slots to mark keywords across both views simultaneously.
6. Previously parsed logs are automatically saved; click **📚 History** to reload them.

---

## Getting Started

No installation required. Open any `.html` file in a modern browser.

```bash
# Optionally serve via a local server
python -m http.server 8000
# Then open http://localhost:8000
```

**Browser requirements:** Chrome, Firefox, Safari, or Edge with ES6+ and localStorage support.

## Project Structure

```
jsonGrid/
├── index.html          # JSON Grid — multi-cell JSON viewer/editor/diff
├── apexflow.html       # Apex / Java Class Diagram — call-flow visualizer for .cls and .java files
└── sf-debug-viewer.html # SF Debug Viewer — Salesforce debug log parser and tree viewer
```

## License

MIT
