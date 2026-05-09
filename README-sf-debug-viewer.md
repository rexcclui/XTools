# SF Debug Viewer

A browser-based parser and visualiser for Salesforce Apex debug logs. Paste or drop a raw log and instantly explore its call tree, SOQL queries, DML operations, and debug output.

## Features

### Log Parsing
- Parses the Salesforce structured log format: timestamp, namespace, event type, and payload on each line
- Recognises all standard event types: `METHOD_ENTRY/EXIT`, `CONSTRUCTOR_ENTRY/EXIT`, `SOQL_EXECUTE_BEGIN/END`, `DML_BEGIN/END`, `USER_DEBUG`, `CALLOUT_REQUEST/RESPONSE`, `CODE_UNIT_STARTED/FINISHED`, `EXCEPTION_THROWN`, `FATAL_ERROR`, `FLOW_*`, `VARIABLE_ASSIGNMENT`, and more
- Extracts class names, method signatures, line numbers, and execution durations

### Call Tree Visualisation
- Displays parsed events as an indented, collapsible tree that mirrors actual execution depth
- Each node shows: event type badge, class name, method/signature, line number, and self-duration
- Color-coded badges per event category (methods = blue, constructors = green, SOQL = bright green, DML = amber, exceptions = red, etc.)
- Click any tree node to expand/collapse its children; click a log line to jump to and highlight the corresponding tree node

### Log Line Panel
- Scrollable raw-log view with line numbers and timestamps
- Click any line to sync the tree view to that event
- Active line highlighted in blue
- Hover any log line with class/method info to reveal a `⌗` source button — click to jump directly to that class and line in the source viewer
- Right-click any log line for a context menu: jump to block entry/exit, highlight selection, show block highlight, and **View source** for events with a class reference
- Events without an explicit class (`VARIABLE_SCOPE_BEGIN`, `USER_DEBUG`, `STATEMENT_EXECUTE`, etc.) resolve the enclosing class from the call tree so the source button still appears

### Log Block Folding
- Entry events (`METHOD_ENTRY`, `CODE_UNIT_STARTED`, `SOQL_EXECUTE_BEGIN`, etc.) show a `▼`/`▶` toggle to collapse or expand their entire execution block in the raw log view
- Folded blocks are hidden from the virtual scroll; collapsed state persists while the tab is open

### Source Code Viewer
- Click **📂 Source** in the toolbar to open a local Salesforce project folder (uses File System Access API; falls back to a file-picker for unsupported browsers)
- Only indexes `.cls` and `.trigger` files under a `force-app` subtree — works whether you open the project root or the `force-app` folder itself
- When a class is found, it opens in a centered modal (92 % screen width, 75 vh tall) with Apex syntax highlighting and the targeted line scrolled into view and highlighted in blue
- Multi-segment class names (`fferpcore.ffasync_ProcessService.ProcessExecutionContext`) are resolved right-to-left so inner-class references correctly open the outer `.cls` file
- Source is also accessible from tree node `⌗` buttons (visible on hover) and the right-click context menu on log lines
- Rendered HTML is cached per class so reopening the same file is instant

### SID Stripping
- Salesforce record IDs (`01p…`) embedded in log lines are automatically removed from both the raw log view and tree node labels for cleaner display

### Multi-Tab Support
- Open multiple logs simultaneously as tabs; add, close, and switch between them freely
- Drop one or more log files onto the page to open each as a new tab

### Global Search
- Full-text search across all open log tabs; results drop down with tab and content context

### Custom Highlighting
- Up to 4 configurable highlight slots — each with a color picker and keyword input
- Matching lines in the log panel are marked with the chosen color for easy scanning

### Namespace Filter
- Detect all namespaces present in the log and toggle their visibility individually
- Useful for hiding noisy system or managed-package events

### Event-Type Filters
- Filter chip buttons toggle entire event categories (Methods, Constructors, SOQL, DML, Debug, Callouts, System, Flow, Variable Assignments)
- "Hide vars" toggle suppresses all `VARIABLE_ASSIGNMENT` events globally

### Stats Bar
- Footer shows aggregate counts: total events, SOQL count, DML count, callouts, exceptions, and user debug lines

### History
- Previously parsed logs are saved to `localStorage` and accessible via the history sidebar panel
- Restore any past session with one click; delete old entries individually

### Drag & Drop
- Drop a `.log` or `.txt` file anywhere on the page to open it as a new tab

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Vanilla JavaScript (ES6+), no build step |
| Markup | Single-file HTML — CSS and JS inlined as template strings, injected into a root `<div>` |
| Persistence | `localStorage` (tab history, highlight slots) |
| Log parsing | Custom regex-based line parser (`parseLine` / `parseLog`) |
| Layout | CSS Flexbox with a JS-driven draggable horizontal divider between log and tree panes |
| Color coding | CSS class-per-event-type pattern (`.ev-METHOD_ENTRY`, `.t-soql`, etc.) |
| Drag & Drop | `dragover` / `drop` events on `document` with `FileReader` |
