# Apex Flow — Class Diagram & Call Flow Analyser

A browser-based tool for visualising Salesforce Apex (and Java) source code as interactive architecture maps and recursive call-flow diagrams, without any server or build step.

## Features

### File Explorer
- Open a whole directory with the **File System Access API** (`showDirectoryPicker`) and browse it as a collapsible tree in the sidebar
- Editable folder-path label (persisted in `localStorage`) works around the browser's restriction of only providing the folder name
- Search loaded files by class name with keyboard arrow-key navigation and Enter to select
- File open history panel (accessible via the history icon) shows recently loaded files; panel positions dynamically next to the button
- IndexedDB persists directory handles across page reloads so the folder can be reopened without re-picking

### Architecture Map (System View)
- Renders all loaded classes as a left-to-right **Mermaid.js** flowchart (`graph LR`)
- Edges represent detected dependencies:
  - Variable types resolved from field/parameter declarations
  - Method call chains on typed variables
  - Constructor instantiation (`new ClassName(...)`) including builder-pattern chaining
  - Dependency-injection pattern (`new Wrapper(ActualClass.class)`)
- Edge labels show called methods; truncated labels (` … `) reveal a full bulleted-list tooltip on hover
- **Ghost nodes**: classes referenced but not yet loaded are shown with a dashed border and a `?` prefix; right-click → **Load Class** to load them from the file tree or file picker
- Inner classes declared inside a loaded file are correctly excluded from ghost-node treatment
- Classes can be hidden from the map via the sidebar toggle

### Analyze Flow (Focused View)
- Select any class + entry method to generate a **recursive call-flow diagram** up to 6 levels deep
- Nodes are grouped into per-class **Mermaid subgraphs** so methods of the same class are always co-located
- Node deduplication: if the same class+method appears via multiple call paths, all edges converge on a single node; additional methods of an already-rendered class are added to its existing subgraph
- Ghost subgraph headers (unloaded class) support right-click → **Load Class** for in-place expansion — the diagram re-renders recursively with the newly loaded class's call tree
- Collapse/expand child nodes via right-click context menu; `⊕`/`⊖` indicators show state

### Diagram Interaction
- **svg-pan-zoom** provides smooth pan and zoom with mouse wheel and drag
- Right-click context menu on any node: Load Class, Analyze Flow, Hide Class, Copy Name
- Right-click on edges: shows full relationship list in a context menu
- Widened transparent hit-area overlay (20 px) on all edge paths for easier right-click targeting
- Edge tooltips display complete method lists as a bulleted list

### Code Viewer
- Click any class card in the sidebar to open its source in a **Prism.js** syntax-highlighted panel
- Collapsible sidebar with smooth CSS transition; diagram auto-resizes after transition

### Class Sidebar
- Each loaded class shows a card with its method list
- Hide/unhide individual classes from the architecture map
- Entry-point picker (`openMethodPicker`) for launching Analyze Flow on a specific method

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Vanilla JavaScript (ES6+), no build step |
| Diagram rendering | [Mermaid.js](https://mermaid.js.org/) (CDN) — `graph LR` flowcharts with subgraphs |
| Pan & Zoom | [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) v3.6.1 (CDN) |
| Syntax highlighting | [Prism.js](https://prismjs.com/) 1.29 with `prism-java` component (CDN) |
| Icons | Font Awesome 6.5 (CDN) |
| File access | File System Access API (`showDirectoryPicker`, `FileSystemDirectoryHandle`) |
| Persistence | IndexedDB (directory handles, file history) + `localStorage` (folder path label, hidden classes) |
| Apex parsing | Custom regex-based parser — class/method/variable/call extraction without an AST |
| Layout | CSS Flexbox (sidebar + diagram canvas split) |
