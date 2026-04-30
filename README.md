# jsonGrid

An interactive, browser-based workspace for viewing, editing, and comparing JSON data using a flexible grid layout.

Zero dependencies. Single HTML file. Works offline.

**Live demo: [jsongrid.rex-cclui.workers.dev](https://jsongrid.rex-cclui.workers.dev/)**

---

## Features

- **Multi-cell grid** — Organize JSON across a configurable grid (up to 5 columns × 8 rows)
- **Tabs** — Manage multiple independent workspaces, each with its own grid
- **Rendered table view** — Arrays of objects are automatically rendered as navigable tables
- **Pretty-print with expand/collapse** — Toggle formatted JSON with nested object/array collapsing
- **Side-by-side diff** — Select any two values and compare them with color-coded differences
- **Live highlighting** — Hover over a cell element to highlight the corresponding path in the raw editor, and vice versa
- **localStorage snippets** — Cell contents are auto-saved and can be reloaded from a dropdown history
- **Drag-and-drop** — Drop JSON files directly onto cells
- **Global search** — Search across all open cells at once
- **Dark mode** — Follows system preference automatically

## Getting Started

No installation required. Open `index.html` in any modern browser.

```bash
# Optionally serve via a local server
python -m http.server 8000
# Then open http://localhost:8000
```

**Browser requirements:** Chrome, Firefox, Safari, or Edge with ES6+ and localStorage support.

## Usage

### Grid Layout

Use the toolbar to set the number of **columns** (1–5) and **rows** (1–8). Each cell has:

| Control | Action |
|---|---|
| Title input | Label the cell |
| Pretty button | Toggle between raw editor and formatted view |
| Clear button | Wipe the cell's content |
| Maximize button | Expand a row to fill the viewport |

Drag the divider between the raw editor and the rendered view to resize the source panel. Drag column borders to resize columns.

### Entering JSON

Paste or type JSON directly into any cell's editor. The grid view updates automatically (with a short debounce). You can also drag a `.json` file onto a cell to load it.

### Comparing Values

1. Click up to two values in the rendered grid (they get an orange outline and are counted in the toolbar badge).
2. Click **Compare** in the toolbar to open the diff view.

Color coding in the diff:

| Color | Meaning |
|---|---|
| Purple | Value changed |
| Green | Added |
| Red | Removed |
| None | Unchanged |

### Saved Snippets

Cell content is automatically saved to `localStorage` with a timestamp. Focus a cell's editor and click the dropdown arrow to browse up to 200 saved entries and reload any of them.

## Project Structure

The entire application is a single self-contained file:

```
jsonGrid/
└── index.html   # All HTML, CSS, and JavaScript
```

Internal JavaScript sections (in order):

- **STATE** — App-wide state, tab registry, cell data
- **TABS** — Create, rename, switch, and remove tabs
- **SYNC** — Textarea-to-state synchronization
- **GRID RENDER** — Build and patch the DOM grid
- **JSON RENDERING** — Parse JSON and render tables / pretty trees
- **HIGHLIGHTING** — Path-based hover sync between source and grid
- **COMPARISON** — Deep diff algorithm and modal UI
- **LOCALSTORAGE** — Auto-save and snippet history
- **DRAG-DROP** — File upload handling
- **SEARCH** — Global search across cells

## License

MIT
