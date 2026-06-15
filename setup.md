# Setup Guide

Complete steps to set up and deploy this project from scratch.

---

## TL;DR

This is a **static-HTML toolset deployed as Cloudflare Workers**. The tools themselves run 100% in the browser (no backend, no API keys). The only thing you need an account for is hosting.

- **You can run it locally with zero accounts** — just a Python (or any) static file server.
- **You only need accounts if you want to deploy it to the web** under your own domain.

---

## 1. Tech Stack

| Layer | What it uses |
|---|---|
| Frontend | Plain HTML / CSS / vanilla JavaScript (ES6+), all in a single file per tool. No framework, no build step, no npm dependencies in the HTML. |
| Frontend libs (CDN) | Mermaid.js, svg-pan-zoom, Prism.js — loaded from CDNs at runtime by `apexflow.html`. No install needed. |
| Browser APIs | `localStorage`, `IndexedDB`, File System Access API (Chromium-only for folder open), Drag-and-Drop. |
| Hosting / routing | [Cloudflare Workers](https://workers.cloudflare.com/) with the **Static Assets** binding. A tiny Worker script (`src/index.js`) maps each subdomain to its HTML file. |
| Deploy CLI | [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare's official CLI), run via `npx`. |
| Runtime on Cloudflare | Cloudflare Workers runtime (V8 isolates). Compatibility date pinned to `2026-04-30` in the `wrangler.*.jsonc` files. |
| Local dev | Any static file server (e.g. `python -m http.server`) or `npx wrangler dev` to emulate the Worker. |

---

## 2. Prerequisites

### Local development only (no deploy)

- A modern browser: Chrome, Edge, Firefox, or Safari (Chromium recommended for the File System Access API features in Apex Flow).
- Optional: Python 3, Node.js, or any static file server to serve `public/` over HTTP (some browser features require `http://` rather than `file://`).

### To deploy to Cloudflare

- **Node.js 18+** (Wrangler is distributed as an npm package).
- **npm** or **npx** (ships with Node).
- **Git** (to clone the repo).
- A **Cloudflare account** (free tier is enough — see "Cost" below).
- *(Optional)* A **domain name** added to Cloudflare if you want custom subdomains like `jsongrid.example.com`. Without it, you get a free `*.workers.dev` URL.

---

## 3. Accounts Required

| Account | Required? | Purpose | Cost |
|---|---|---|---|
| **Cloudflare** | Only for deploy | Hosts the Workers + static assets, handles DNS for custom domain | Free tier sufficient |
| **Domain registrar** (e.g. Namecheap, Cloudflare Registrar, etc.) | Optional | Owning your own domain (`trendx.uk` in the original setup). Skip if you're happy with `*.workers.dev`. | ~$10–15/year typical |
| **GitHub** | Optional | Source hosting / CI. Not required to deploy. | Free |

**No** OpenAI, Anthropic, Salesforce, or any other API account is required. The tools do **not** call any backend.

---

## 4. API Keys / Secrets

**None required.**

- The three tools (`jsongrid.html`, `apexflow.html`, `sf-debug-viewer.html`) are fully client-side. They read pasted text, dropped files, or files picked via the File System Access API. Nothing is uploaded.
- The Cloudflare Worker (`src/index.js`) does a subdomain → filename redirect, serves static assets, and exposes a `/api/visits` endpoint for the visit counter. The counter stores data in a **Workers KV** namespace (see §8.5) — no third-party service.
- *(Optional)* `IP_SALT` — a secret used when hashing visitor IPs for the counter. If unset, a built-in default salt is used. To set your own per Worker: `npx wrangler secret put IP_SALT` (repeat with `--config wrangler.apexflow.jsonc` and `--config wrangler.apexdebug.jsonc`). Visitor IPs are never stored; only a salted SHA-256 hash is used to dedupe within a day.
- `wrangler login` uses an interactive OAuth flow in your browser — you do **not** need to manage an API token manually (though you can create one if you prefer non-interactive CI deploys; see Cloudflare's docs on `CLOUDFLARE_API_TOKEN`).

---

## 5. Cost

| Item | Cost |
|---|---|
| Cloudflare Workers (Free plan) | **$0** — 100,000 requests/day per account, included Static Assets, included `*.workers.dev` subdomain |
| Cloudflare Workers KV (Free plan) | **$0** — for the visit counter: 100k reads/day, 1,000 writes/day, 1 GB storage. Each *new* unique daily visitor costs ~2 writes (~500 new visitors/day on free tier); repeat visitors are read-only. |
| Cloudflare custom domain | **$0** to point an existing zone at a Worker |
| Domain name (optional) | ~$10–15/year if you don't already own one |
| Wrangler CLI | Free, open source |
| Bandwidth | Free on Workers Free plan |

If you stay under 100k requests/day across all three subdomains combined, the entire setup is **free indefinitely**. Cloudflare's paid Workers plan ($5/mo) raises limits but is not needed for personal use.

---

## 6. Project Layout

```
XTools/
├── public/
│   ├── jsongrid.html         # JSON Grid X tool
│   ├── apexflow.html         # Apex / Java / LWC class-diagram tool
│   └── sf-debug-viewer.html  # Salesforce debug log viewer
├── src/
│   └── index.js              # Cloudflare Worker — subdomain → file router
├── wrangler.jsonc            # Worker config for jsongrid
├── wrangler.apexflow.jsonc   # Worker config for apexflow
├── wrangler.apexdebug.jsonc  # Worker config for apexdebug
├── deploy.sh                 # Deploys all three Workers
└── README.md
```

---

## 7. Local Setup (no deploy)

```bash
git clone <your-fork-url> XTools
cd XTools

# Serve the public/ directory on http://localhost:8000
python -m http.server 8000 --directory public
```

Open in a browser:

- http://localhost:8000/jsongrid.html
- http://localhost:8000/apexflow.html
- http://localhost:8000/sf-debug-viewer.html

That's it — the tools work offline once loaded. You can also open the HTML files directly via `file://`, but some browser features (clipboard, File System Access API) work better over `http://`.

---

## 8. Deploy to Cloudflare

### 8.1 Install Wrangler

```bash
# Option A: install once, globally
npm install -g wrangler

# Option B: run on demand via npx (no global install)
npx wrangler --version
```

### 8.2 Authenticate

```bash
wrangler login
```

This opens your browser, prompts you to log in to Cloudflare, and stores an OAuth token locally. One-time step.

### 8.3 Pick names / domains

Open each `wrangler.*.jsonc` and edit:

- `name` — must be unique within your Cloudflare account. This becomes the `*.workers.dev` URL (e.g. `jsongrid.<your-subdomain>.workers.dev`).
- `compatibility_date` — leave as-is or bump to today.

The current configs (`name: "jsongrid"`, `"apexflow"`, `"apexdebug"`) deploy to `https://<name>.<your-account>.workers.dev` by default.

### 8.4 (Optional) Custom domain

To serve from your own domain (like the original `*.trendx.uk`):

1. Add your domain to Cloudflare (DNS managed by Cloudflare).
2. In the Cloudflare dashboard → Workers & Pages → your Worker → **Settings → Domains & Routes → Add Custom Domain** → enter `jsongrid.example.com`.
3. Repeat for each Worker / subdomain.

Cloudflare provisions the TLS certificate automatically. No DNS records to add manually when using "Add Custom Domain".

### 8.5 Set up the visit counter (Workers KV)

The `/api/visits` endpoint counts unique visitors per day and needs a KV namespace. **Deploy will fail until the placeholder id is replaced.**

1. Create one namespace (shared by all three sites — counts are kept separate by site key):

   ```bash
   npx wrangler kv namespace create VISITS
   ```

2. Copy the printed `id` and paste it in place of `REPLACE_WITH_KV_NAMESPACE_ID` in **all three** config files — `wrangler.jsonc`, `wrangler.apexflow.jsonc`, `wrangler.apexdebug.jsonc`:

   ```jsonc
   "kv_namespaces": [
     { "binding": "VISITS", "id": "<your-namespace-id>" }
   ]
   ```

3. *(Optional)* Set a custom hashing salt as described in §4.

The count is displayed inside each tool's **Help** panel ("👁 Visitors"). If KV is missing the endpoint simply returns `0` and the rest of the site works normally.

### 8.6 Deploy

Deploy all three at once:

```bash
./deploy.sh
```

Or deploy them individually:

```bash
npx wrangler deploy                                    # jsongrid
npx wrangler deploy --config wrangler.apexflow.jsonc   # apexflow
npx wrangler deploy --config wrangler.apexdebug.jsonc  # apexdebug
```

Each command uploads `src/index.js` plus the contents of `public/` as static assets.

### 8.7 Local Worker preview (optional)

To emulate the Worker locally (subdomain routing + asset serving):

```bash
npx wrangler dev
```

Defaults to http://localhost:8787. The subdomain routing in `src/index.js` will fall through to direct file paths under `localhost`, so just visit `http://localhost:8787/jsongrid.html`.

---

## 9. Adding a New Tool

1. Drop a new `myTool.html` into `public/`.
2. Add a row to `SUBDOMAIN_MAP` in `src/index.js`:
   ```js
   const SUBDOMAIN_MAP = {
     jsongrid:  'jsongrid.html',
     apexflow:  'apexflow.html',
     apexdebug: 'sf-debug-viewer.html',
     mytool:    'myTool.html',         // new
   };
   ```
3. Create `wrangler.mytool.jsonc` (copy from one of the existing ones, change `name`).
4. Add a `wrangler deploy --config wrangler.mytool.jsonc` line to `deploy.sh`.
5. *(Optional)* Add a custom-domain entry for `mytool.example.com` in the Cloudflare dashboard.

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `wrangler: command not found` | Use `npx wrangler ...` or `npm install -g wrangler`. |
| `Authentication error` on deploy | Re-run `wrangler login`. For CI, set `CLOUDFLARE_API_TOKEN`. |
| Worker name conflict | Change `name` in `wrangler.jsonc` — it must be unique within your account. |
| Custom domain returns 522 / not found | Make sure the apex domain is on Cloudflare DNS, and the subdomain is added via the Worker's **Custom Domains** tab (not a manual CNAME). |
| `*.workers.dev` URL shows nothing | Your account may have disabled the workers.dev subdomain — re-enable in the Cloudflare dashboard, or use a custom domain. |
| File System Access API not working in Apex Flow | Use a Chromium-based browser (Chrome/Edge). Firefox/Safari do not implement it; the page falls back to a regular file picker. |

---

## 11. Quick Reference

```bash
# Clone
git clone <repo-url> XTools && cd XTools

# Run locally
python -m http.server 8000 --directory public

# Deploy (one-time)
npm install -g wrangler
wrangler login

# Deploy (every time)
./deploy.sh
```
