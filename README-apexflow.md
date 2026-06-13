# Apex Flow — Apex / Java / LWC Class Diagram & Call Flow Analyser

A browser-based tool for visualising Salesforce Apex, Java, and Lightning Web Component source as interactive architecture maps and recursive call-flow diagrams, without any server or build step.

**Live:** [apexflow.trendx.uk](https://apexflow.trendx.uk/) · files are read locally in your browser — nothing is uploaded.

> New here? Click **? Help → ▶ Load sample Apex class, LWC/js** to render an example architecture map instantly. The Help dialog also shows an example screenshot.

## Features

### File Explorer
- Open a whole project folder with the **File System Access API** (`showDirectoryPicker`) and browse it as a collapsible tree in the sidebar
- Editable folder-path label (persisted in `localStorage`) works around the browser's restriction of only providing the folder name
- Search loaded files by class / component name with keyboard arrow-key navigation and Enter to select
- File-open **History panel** (accessible via the clock icon) shows recently loaded files; the panel positions dynamically next to its trigger
- **IndexedDB** persists directory handles across page reloads so the folder can be reopened without re-picking
- Skips noise directories (`__tests__`, `node_modules`, `.git`, `dist`, `build`, `.sfdx`, etc.)

### Indexing
- On folder open the tree is scanned once for **LWC bundles** — any folder whose name matches a `<dirname>.js` file inside it (a sibling `<dirname>.html` becomes the template). No `force-app/` or `lwc/` requirement; the same-name convention is enough
- LWC indexing skips: `.git`, `.sf`, `.sfdx`, `node_modules`, `translation_source`, `__tests__`, `__examples__`, `docs`
- A parallel scan builds the **Apex / Java class index** by file name; `*Test.cls` test classes are excluded, and anything under `docs`, `temp`, `node_modules`, `.sfdx`, `unit`, `.history`, `test` is skipped
- Counts are cached in IndexedDB per directory handle so reopening a folder is instant
- Badges in the file explorer header show `N LWC` / `N Apex` totals

### Architecture Map (System View)
- Renders all loaded classes and components as a left-to-right **Mermaid.js** flowchart (`graph LR`)
- Node styling distinguishes **Apex** (orange), **LWC** (blue), **LWC child** (purple), and **HTML-only** (green) entries
- Edges represent detected dependencies:
  - Apex: variable types resolved from field/parameter declarations, method call chains, constructor instantiation (`new ClassName(...)`) including builder-pattern chaining, dependency-injection pattern (`new Wrapper(ActualClass.class)`)
  - LWC: ES `import` / `export … from` statements (including `c/`, `@salesforce/apex/`, and relative `./` / `../` paths) and HTML `<c-foo-bar>` template references
- **Auto-loaded relative imports** — Opening an LWC also parses its direct `./` / `../` JS imports. Children are registered under `<parentLwc>.<baseName>` so a local `ConfigProvider` cannot collide with a same-named Apex class
- Edge labels show called methods / imported members; truncated labels (` … `) reveal a full bulleted-list tooltip on hover
- Edge link colors are derived from the target's namespace prefix (e.g. `pselib_`, `ffui_`) for visual grouping
- **Ghost nodes**: classes referenced but not yet loaded are shown with a dashed border and a `?` prefix; right-click → **Load Class** to load them from the file tree or a file picker
- Inner Apex classes declared inside a loaded file are correctly excluded from ghost-node treatment
- Classes can be hidden from the map via the sidebar toggle or a card's eye icon

### Analyze Flow (Focused View)
- Select any class + entry method to generate a **recursive call-flow diagram** up to 6 levels deep
- Nodes are grouped into per-class **Mermaid subgraphs** so methods of the same class are always co-located
- Node deduplication: if the same class+method appears via multiple call paths, all edges converge on a single node; additional methods of an already-rendered class are added to its existing subgraph
- Ghost subgraph headers (unloaded class) support right-click → **Load Class** for in-place expansion — the diagram re-renders recursively with the newly loaded class's call tree
- Collapse/expand child nodes via right-click context menu; `⊕`/`⊖` indicators show state

### Diagram Interaction
- **svg-pan-zoom** provides smooth pan and zoom with mouse wheel and drag
- Right-click context menu on any node:
  - **Analyze Flow** — switch to focused per-method view
  - **Load Class** — load an unloaded ghost node (uses the file index, falls back to a file picker)
  - **Hide / Show Children** (overview mode) — peel away just this parent's outgoing edges (and the nodes they reach) without a full Mermaid re-render, so pan/zoom is preserved
  - **Hide JS / Apex / HTML Children** — separate buckets, so an LWC can hide its Apex callouts while keeping JS imports visible
  - **Hide / Show Child Nodes** (analyze-flow mode) — collapse / expand a method's call subtree
  - **View Code** — open the method body in a draggable code panel
  - **View Source** — open the full file (concatenated `.js` + `.html` for LWC) in a centered modal with the folder path
- Right-click on edges: shows the full relationship list as a contextual menu
- Widened transparent hit-area overlay (20 px) on all edge paths for easier right-click targeting
- Edge tooltips display complete method lists as a bulleted list

### Code Viewer
- Click any class card in the sidebar to focus its node and highlight it in the diagram
- **Centered source modal** (1100 × 75vh) with **Prism.js** syntax highlighting; LWC components show concatenated `.js` and `.html`; the source folder path is shown in the title bar
- Collapsible sidebar with smooth CSS transition; diagram auto-resizes after the transition

### Class Sidebar
- Each loaded class shows a card with **Analyze Flow**, **Hide/Show**, and **Remove** controls
- Entry-point picker (`openMethodPicker`) for launching Analyze Flow on a specific method, with pill toggles to enable/disable each method

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Vanilla JavaScript (ES6+), no build step |
| Diagram rendering | [Mermaid.js](https://mermaid.js.org/) (CDN) — `graph LR` flowcharts with subgraphs |
| Pan & Zoom | [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) v3.6.1 (CDN) |
| Syntax highlighting | [Prism.js](https://prismjs.com/) 1.29 with `prism-java` + `prism-javascript` + `prism-markup` components (CDN) |
| Icons | Font Awesome 6.5 (CDN) |
| File access | File System Access API (`showDirectoryPicker`, `FileSystemDirectoryHandle`) with a `webkitdirectory` fallback |
| Persistence | IndexedDB (directory handles, file history, index cache) + `localStorage` (folder path label, hidden classes) |
| Apex parsing | Custom regex-based parser — class/method/variable/call extraction without an AST |
| LWC parsing | Custom regex-based parser — ES `import` / `export … from`, `<c-…>` template references, `@salesforce/apex/` controllers |
| Layout | CSS Flexbox (sidebar + diagram canvas split) |
