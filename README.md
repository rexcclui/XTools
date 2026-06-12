# jsonGrid

A collection of browser-based developer tools for working with JSON data, Salesforce Apex code, and debug logs.

Zero dependencies. Single HTML files. Work offline.

| Tool | URL |
|---|---|
| JSON Grid | [jsongrid.trendx.uk](https://jsongrid.trendx.uk/) |
| Apex Flow | [apexflow.trendx.uk](https://apexflow.trendx.uk/) |
| SF Debug Viewer | [apexdebug.trendx.uk](https://apexdebug.trendx.uk/) |

---

## Tools

### JSON Grid (`jsongrid.html`)

An interactive workspace for viewing, editing, and comparing JSON data using a flexible grid layout.

**Features**

- **Multi-cell grid** — Organize JSON across a configurable grid (up to 5 columns × 8 rows)
- **Tabs** — Manage multiple independent workspaces, each with its own grid
- **Rendered table view** — Arrays of objects are automatically rendered as navigable tables
- **Pretty-print with expand/collapse** — Toggle formatted JSON with nested object/array collapsing (collapsed by default beyond 3 levels)
- **Apex debug object parsing** — Paste Salesforce Apex object print-outs (e.g., `TypeName:[field=value, ...]`) or extract from noisy debug log lines; automatically converts to JSON tables
- **Row reorder (drag and drop)** — Drag a row using the handle on the left controls to move it above or below another row
- **Row delete icon** — Remove a row quickly using the red bin button in the row controls (minimum 1 row retained)
- **Side-by-side diff** — Select any two values and compare them with color-coded differences
- **Live highlighting** — Hover over a cell element to highlight the corresponding path in the raw editor, and vice versa
- **Copy buttons** — Copy full cell JSON from the header, or copy any nested object/array block
- **localStorage snippets** — Cell contents are auto-saved and can be reloaded from a dropdown history
- **Drag-and-drop** — Drop JSON files directly onto cells
- **Global search** — Search across all open cells at once
- **Per-cell search with dual-panel highlight** — Cell search highlights matches in both the rendered grid (right) and pretty source panel (left)
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

Each row also has left-side controls:

| Row control | Action |
|---|---|
| Drag handle (`⠿`) | Drag the row to reorder it |
| Toggle (`▼/▶`) | Collapse or expand the row |
| Maximize (`⤢/⤡`) | Maximize or restore the row |
| Delete (`🗑`) | Remove the row |

Paste or type JSON into any cell's editor. Drag a `.json` file onto a cell to load it. Drag the divider between the raw editor and rendered view to resize the source panel. Drag column borders to resize columns. Use the row drag handle to move rows to a new position.

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

**Parsing Apex debug objects**

Paste Salesforce Apex debug output or entire log lines directly into a cell:

1. **Direct paste** — Paste a structured Apex object like `OverAllocatedTaskDisplay:[hasHighestOverallocation=null, overAllocatedResources=(OverAllocatedResourceDisplay:[...], ...), ...]`. Click the **{}** button to toggle pretty mode; the parser automatically converts it to JSON.

2. **Extract from log lines** — Paste a full debug log line like:
   ```
   10:06:38.60 USER_DEBUG [68]|DEBUG|TEMP_LOG[63] SMAC_ImpactAnalysisBuilder> overAllocatedTasks:(OverAllocatedTaskDisplay:[...], ...)
   ```
   The parser scans for `(...)` blocks, extracts the Apex object(s), and presents them in a chooser if multiple candidates are found.

3. **Right-click parse** — Select a cell value that contains an Apex object string (or nested JSON string), right-click, and choose **Convert string to JSON table**. The parser handles both JSON and Apex formats.

**Multi-object selection**

If a parenthesized Apex block contains multiple objects, a modal chooser appears so you can confirm which one to load. Each candidate shows a preview of the extracted data.

---

### Apex / Java / LWC Class Diagram (`apexflow.html`)

A call-flow visualizer for Salesforce Apex (`.cls`), Java (`.java`), and Lightning Web Components (`.js` + `.html`). Open a whole project folder, or drop individual files, to generate interactive Mermaid.js class relationship diagrams and drill into per-method / per-import call trees.

**Features**

- **Whole-page drop zone** — Drag `.cls`, `.java`, `.js`, or `.html` files anywhere onto the page; a green overlay confirms the drop target
- **Folder open with File System Access API** — Pick a whole project folder once; the directory handle is persisted in IndexedDB so it reopens on the next visit without re-picking
- **LWC + Apex + Java in one map** — Mixed-language support; cross-language dependencies (e.g. an LWC's `@salesforce/apex/Foo` import) appear in the same diagram
- **Background indexing** — On folder open the tree is scanned once for LWC bundles (`<base>.js` + `<base>.html` inside `lwc/`) and Apex classes (`force-app` subtree); badges in the file explorer show the totals
- **Auto-load relative imports** — Opening an LWC also parses the JS files it imports via `./` / `../`. Children are namespaced as `<parentLwc>.<baseName>` so a local `ConfigProvider` never collides with a same-named Apex class
- **HTML `<c-…>` references** — LWC HTML templates are scanned for child component tags and rendered as edges
- **Architecture map** — System-level diagram showing dependencies between all loaded classes, components, interfaces, enums, and records. Node colors distinguish Apex / LWC / LWC-child / HTML-only nodes
- **Analyze Flow mode** — Select a class and choose individual methods to visualize their recursive call chains (up to 6 levels deep)
- **Subgraph grouping** — Methods of the same class are clustered in per-class Mermaid subgraphs, deduplicated across paths
- **Collapsible nodes** — Right-click any entry or depth node to collapse/expand its children; `⊕`/`⊖` indicators show state
- **Per-edge Hide / Show Children** — Right-click any node in overview mode to hide just its outgoing edges (and the destination nodes they reach) without a full re-render — pan/zoom is preserved. Separate "Hide JS / Apex / HTML Children" buckets let you peel off one layer at a time
- **Ghost nodes** — Classes referenced but not yet loaded show with a dashed border and a `?` prefix; right-click → **Load Class** to load them from the file tree or via the file picker
- **Color-coded edges** — Each method's call path uses a distinct color; dashed lines indicate nested calls; loop calls are labeled with a letter suffix (e.g. `1N`, `2N`)
- **Right-click context menu** — On nodes: Analyze Flow, Load Class, Hide / Show Children, View Code (method body), View Source (full file in a modal). On edges: shows the full method-call list
- **Draggable / centered source modal** — View the complete `.cls` / `.java` source, or concatenated `.js` + `.html` for an LWC, in a Prism-highlighted modal with the folder path in the title bar
- **Pan & zoom** — `svg-pan-zoom` with smooth mouse-wheel zoom and drag-pan
- **Copy Mermaid** — Copy the current diagram's Mermaid definition to clipboard
- **File history panel** — Recently opened files appear in a popover next to the history icon for quick re-load
- **Hide/show classes** — Toggle individual classes out of the architecture diagram without removing them
- **Collapsible sidebar** — Toggle the sidebar to maximize diagram space; the diagram auto-resizes after the CSS transition

**Usage**

1. Click the folder icon to open a project root (recommended) or drag individual `.cls` / `.java` / `.js` / `.html` files onto the page.
2. Use the file explorer to load components and classes; LWC bundles automatically pull in their direct relative imports.
3. The **System Architecture Map** renders automatically. Click a class card to highlight it; click **Analyze Flow** to drill into its methods.
4. In Analyze Flow mode, toggle methods on/off in the sidebar to compose the call-flow diagram.
5. Right-click nodes for per-node actions (Hide Children, View Source, Load Class, etc.). Right-click edges to see the full call list.

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

No installation required. Open any file in `public/` in a modern browser, or use the live URLs above.

```bash
# Serve locally
python -m http.server 8000 --directory public
# Then open http://localhost:8000/jsongrid.html
```

**Browser requirements:** Chrome, Firefox, Safari, or Edge with ES6+ and localStorage support.

## Project Structure

```
jsonGrid/
├── public/
│   ├── jsongrid.html          # JSON Grid — multi-cell JSON viewer/editor/diff
│   ├── apexflow.html          # Apex Flow — call-flow visualizer for .cls and .java files
│   └── sf-debug-viewer.html   # SF Debug Viewer — Salesforce debug log parser and tree viewer
├── src/
│   └── index.js               # Cloudflare Worker — routes each subdomain to the right HTML file
├── wrangler.jsonc             # Deploy config: jsongrid.trendx.uk
├── wrangler.apexflow.jsonc    # Deploy config: apexflow.trendx.uk
└── wrangler.apexdebug.jsonc   # Deploy config: apexdebug.trendx.uk
```

## Deployment

The three tools are hosted as separate Cloudflare Workers sharing the same codebase. A Worker script (`src/index.js`) routes each subdomain to the correct HTML file — no file renaming needed.

### First-time setup

```bash
npm install -g wrangler
wrangler login
```

### Deploy all three sites

```bash
./deploy.sh
```

Or deploy individually (run `npm run build` first — wrangler serves `dist/`, not `public/`):

```bash
npx wrangler deploy                                    # jsongrid.trendx.uk
npx wrangler deploy --config wrangler.apexflow.jsonc   # apexflow.trendx.uk
npx wrangler deploy --config wrangler.apexdebug.jsonc  # apexdebug.trendx.uk
```

### Build / obfuscation

The readable source lives in `public/*.html` — that is the only place to edit. `npm run build` generates `dist/` (gitignored), obfuscating the inline JavaScript of each tool with [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator); `deploy.sh` runs it automatically and wrangler deploys `dist/`.

To debug a production issue against readable code, deploy a non-obfuscated build:

```bash
npm run build:readable   # same dist/ output, scripts left readable
```

Notes baked into `build.js`: globals are never renamed (the HTML calls them from inline `onclick=` attributes), heavy transforms (control-flow flattening, dead code) are off to keep large-log/JSON parsing fast, and `sf-debug-viewer.html` skips the string-array transform because it serializes functions with `.toString()` to build its Web Worker.

### How routing works

`src/index.js` reads the subdomain from the incoming hostname and maps it to the matching HTML file:

| Subdomain | File served |
|---|---|
| `jsongrid.trendx.uk` | `jsongrid.html` |
| `apexflow.trendx.uk` | `apexflow.html` |
| `apexdebug.trendx.uk` | `sf-debug-viewer.html` |

To add a new tool: add the HTML file, add a row to `SUBDOMAIN_MAP` in `src/index.js`, create a `wrangler.<name>.jsonc`, and deploy.

## License

MIT
