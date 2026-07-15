# Apex Debug Log Parser

Read Salesforce Apex debug logs the easy way — a collapsible call tree with
SOQL & DML breakdown, exceptions, method timings, multi-log tabs, search and
highlighting, right inside VS Code.

## Getting started

**Right-click any `.log` file** — in the Explorer, on an editor tab, or inside
the open editor — and choose **Open in Apex Debug Log Parser**. The log opens
already parsed into a call tree. Select several `.log` files in the Explorer
to open each one as its own tab.

Or run **Apex Debug Log Parser: Open Viewer** from the Command Palette and:

- paste a raw log and click **Parse Log**,
- drag `.log` files onto the viewer (from VS Code's Explorer or from your OS),
- or click **▶ Load sample** to see an example instantly.

## Load debug logs straight from your org

Click **⚡ Load Debug** in the viewer's toolbar (or run **Apex Debug Log
Parser: Load Debug Logs from Org (sf CLI)** from the Command Palette). The
extension lists your org's recent debug logs through the Salesforce CLI —
time, operation, status, size, duration and user — and every log you pick is
downloaded and opened as its own parsed tab. No more hunting through the
Developer Console.

Requirements: the [`sf` CLI](https://developer.salesforce.com/tools/salesforcecli)
and an authenticated org (`sf org login web`). The CLI is auto-detected — a
project-local `node_modules/.bin/sf` in your workspace is preferred, then
PATH, your login shell's PATH, and common install locations; set
**`apexDebug.sfCliPath`** in Settings to point at a specific executable if
needed. The CLI's default org is used unless you set
**`apexDebug.targetOrg`** to an org alias/username.

## Reading a parsed log

- **Left pane** shows the raw log; **right pane** shows the call tree —
  clicking a line on either side highlights the matching entry on the other.
- **Stats bar** summarizes SOQL queries, DML operations, exceptions, and
  timings at a glance; click the filter chips to show only what you care
  about (SOQL, DML, exceptions, debug lines…).
- **Expand/collapse** tree nodes to walk the Apex call stack; method timings
  show where the time went.
- **Right-click a tree row** to see the code behind it: with your Salesforce
  project open as the workspace, the class opens in a real VS Code editor tab
  beside the viewer, cursor on the log's line. Use the **📂 Source** button to
  point at a different project.

## Search & highlighting

- The **header search box** searches across *all* open log tabs; results drop
  down with tab context.
- **Filter tree…** narrows the call tree; the **highlight slots** let you mark
  up to four keywords in distinct colors throughout the log.
- **Hide keywords** and the **namespace filter** cut noise (managed-package
  chatter, heap/statement events) out of the view.

## Multiple logs & history

- Each log lives in its own **tab** — compare several transactions
  side by side.
- Parsed logs are saved to a local **History** (📚 button), so you can reopen
  a previous session with one click.

## Good to know

- Logs are parsed entirely on your machine; nothing is uploaded anywhere, and
  no internet connection is needed.
- If the log file is open in an editor with unsaved changes, what you see in
  the editor is what gets parsed.
- Curious how it works under the hood, or want to build it from source? See
  [DEVELOPMENT.md](https://github.com/rexcclui/XTools/blob/main/vscode-extension-apexdebug/DEVELOPMENT.md).
