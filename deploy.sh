#!/usr/bin/env bash
set -e

# wrangler runs `npm run build` itself before each deploy (build.command
# in the wrangler configs); we only need to make sure deps are installed.
if [ ! -d node_modules ]; then
  npm ci
fi

echo "Deploying jsongrid.trendx.uk..."
npx wrangler deploy
echo ""

echo "Deploying apexflow.trendx.uk..."
npx wrangler deploy --config wrangler.apexflow.jsonc
echo ""

echo "Deploying apexdebug.trendx.uk..."
npx wrangler deploy --config wrangler.apexdebug.jsonc
echo ""

echo "All three sites deployed."
