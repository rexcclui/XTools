# JSON Grid Workspace

A browser-based, multi-tab online JSON viewer, formatter, and editor that renders JSON as an interactive grid table alongside a raw/formatted source panel — format, beautify, validate, and diff JSON in your browser.

**Live:** [jsongrid.trendx.uk](https://jsongrid.trendx.uk/) · runs entirely in your browser — no signup, nothing uploaded.

> New here? Click **? Help → ▶ Load sample JSON** to see the grid in action instantly. The Help dialog also shows an example screenshot.

## Features

### Multi-Tab Workspace
- Create, rename, and close multiple independent tabs, each with its own grid layout
- Tab state (content, titles, layout) is persisted across page reloads via `localStorage`

### Split-Pane Grid Editor
- Each tab contains a configurable grid of cells arranged in rows and columns
- Every cell has a **raw textarea** (JSON input) and a **formatted grid table** side by side, separated by a draggable column divider
- Toggle pretty-print (`{}` button) to switch between raw editing and rendered table view
- **Resizable rows** via drag handles; rows can be maximised, collapsed, or individually sized

### Interactive JSON Grid Table
- Nested objects and arrays render as expandable/collapsible tree nodes
- **Column-level expand/collapse**: toggle all values under a key across every row at once
- **Row-level expand/collapse**: fold an entire array row independently
- Copy any node or the whole cell JSON to clipboard with one click

### JSON Diff / Compare
- Select any two value cells (they turn orange) to open a **side-by-side diff modal**
- Diff highlights added, removed, and changed values recursively through nested structures
- Summary line reports total counts of changes

### Search
- Global search bar filters across all cells in the active tab simultaneously
- Matching values are highlighted in both the source panel and the grid table

### Hide / Show Source Panel
- Toggle the source textarea for all cells at once to maximise grid view space

### Drag & Drop
- Drop a `.json` file onto any cell to load its content directly

### Persistence
- Full workspace state (tab list, cell content, cell titles, layout, collapsed state) saved to `localStorage` automatically on every change
- Per-cell history snapshots stored as named entries for quick restore

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Vanilla JavaScript (ES6+), no build step |
| Markup | Single-file HTML with inlined CSS and JS |
| Persistence | `localStorage` |
| Diff engine | Custom recursive diff (`diffRows`) |
| Layout | CSS Grid + Flexbox with JS-driven `gridTemplateRows` |
| Drag resize | Pointer events on `.divider-v` and `.row-resizer` elements |
| Clipboard | `navigator.clipboard` with `execCommand` fallback |
