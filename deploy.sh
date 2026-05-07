#!/usr/bin/env bash
set -e

echo "Deploying jsongrid.trendx.uk..."
npx wrangler deploy
echo ""

echo "Deploying apexflow.trendx.uk..."
npx wrangler deploy --config wrangler.apexflow.jsonc
echo ""

echo "Deploying apexdebug.trendx.uk (Pages project: apex-debug)..."
npx wrangler pages deploy . --project-name apex-debug
echo ""

echo "All three sites deployed."
