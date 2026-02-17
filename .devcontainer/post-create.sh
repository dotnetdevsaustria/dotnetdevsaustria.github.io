#!/bin/bash
set -e

echo "📦 Installing ImageMagick development libraries..."
echo "🔑 Configuring Yarn APT signing key..."
sudo mkdir -p /usr/share/keyrings
curl -fsSL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/yarn-archive-keyring.gpg
sudo chmod 644 /usr/share/keyrings/yarn-archive-keyring.gpg


if ! sudo apt-get update; then
	echo "⚠️ apt-get update failed (likely due to an external repo). Continuing with existing package indexes..."
fi
sudo apt-get install -y imagemagick libmagickwand-dev pkg-config

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
