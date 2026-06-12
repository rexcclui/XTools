#!/usr/bin/env bash
set -e

echo "Building obfuscated assets into dist/..."
if [ ! -d node_modules ]; then
  npm ci
fi
npm run build
echo ""

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
