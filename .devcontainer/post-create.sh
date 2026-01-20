#!/bin/bash
set -e

echo "📦 Installing Ruby dependencies..."
bundle install

echo "📦 Installing Node.js dependencies..."
npm install

echo "🎭 Installing Playwright browsers..."
npx playwright install --with-deps chromium

echo "✅ Dev container setup complete!"
echo ""
echo "Available commands:"
echo "  bundle exec jekyll serve --incremental --livereload  # Start Jekyll server"
echo "  npm test                                             # Run Playwright tests"
echo "  npm run test:ui                                      # Run tests with UI"
echo "  npm run test:headed                                  # Run tests in headed mode"
