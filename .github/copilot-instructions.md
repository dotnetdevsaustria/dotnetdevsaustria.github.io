# DotNetDevs.at - Copilot Instructions

This is the website for DotNetDevs.at, a monthly .NET meetup community in Austria. The site is built with Jekyll using the Minimal Mistakes theme and deployed to GitHub Pages.

## Build & Test Commands

### Jekyll Site
```bash
# Install dependencies
bundle install

# Build the site
bundle exec jekyll build

# Serve locally with incremental builds
bundle exec jekyll serve --incremental

# Full CI build (via npm)
npm run build
```

### Playwright Tests
```bash
# Install test dependencies
npm ci
npx playwright install --with-deps chromium

# Run all tests (starts Jekyll server automatically)
npm test

# Run tests in UI mode
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Update snapshots (approval testing)
npm run test:update-snapshots

# View test report
npm run test:report

# Full CI pipeline (build + test)
npm run test:ci
```

### Event Management Scripts
```bash
# Generate meetup description from event file (onsite)
npm run generate:onsite _events/2026-01-20.md

# Generate meetup description from event file (remote)
npm run generate:remote _events/2026-01-20.md

# Generate meetup image (requires RMagick)
ruby scripts/generate_meetup_image.rb
```

## Architecture Overview

### Jekyll Collections System
The site uses three main collections defined in `_config.yml`:

1. **Events** (`_events/`) - Individual meetup events
   - Filename format: `YYYY-MM-DD.md`
   - Rendered with `event.html` layout
   - Permalink: `/events/{filename}/`

2. **Speakers** (`_speakers/`) - Speaker profiles
   - Filename: `firstname-lastname.md`
   - Rendered with `speaker.html` layout
   - Permalink: `/speakers/{filename}/`

3. **Sponsors** (`_sponsors/`) - Sponsor information
   - Rendered with `single.html` layout
   - Permalink: `/sponsors/{filename}/`

### Event Workflow
Events follow a structured lifecycle with front matter tracking:

```yaml
date: 2026-01-20
title: "Talk Title"
speakers:
  - Speaker Name
InPersonLink: https://meetup.com/...
RemoteLink: https://meetup.com/...
RecordingLink: https://youtube.com/...
Registrations: 85
Participants: 20
Viewers: 20
abstract: |
  Multi-line abstract text
public: true
```

The event file also includes a task checklist in the markdown body for tracking preparation steps (location, social media, streaming setup).

### Template System
The `templates/` directory contains text templates used with the `scripts/generate.js` script:
- `onsite_event.txt` - Template for in-person meetup descriptions
- `remote_event.txt` - Template for remote/online meetup descriptions

Templates use `%placeholder%` syntax that gets replaced with front matter values from event files. The generator also:
- Auto-loads speaker bios from `_speakers/` by matching names in the `speakers:` array
- Combines multiple speaker bios into `%speakers_bio%`
- Makes event content available as `%content%`

### Test Strategy
Uses **approval testing** with Playwright:
- Visual snapshots for layout regression detection
- HTML structure snapshots for content verification
- Cross-platform normalization in `tests/test-utils.ts`
- Snapshot tolerance configured for font rendering differences (2% pixel diff, 0.3 threshold)
- Tests organized by page type: `home.spec.ts`, `events.spec.ts`, `speakers.spec.ts`, etc.

## Key Conventions

### Front Matter Requirements
- **Events**: Must include `date`, `title`, `speakers` (array), and `public: true` to be published
- **Speakers**: Must include `name`, `bio`, and `image` path
- All front matter uses YAML format with `---` delimiters

### File Naming Patterns
- Event files: `YYYY-MM-DD.md` (ISO date format)
- Speaker files: `firstname-lastname.md` (lowercase with hyphens)
- Multi-talk events: `YYYY-MM-DD-talk1.md`, `YYYY-MM-DD-talk2.md`

### Speaker Bio Integration
When working with events, speaker names in the `speakers:` array must exactly match the `name:` field in the corresponding speaker's markdown file in `_speakers/`. The generate script uses this for automatic bio lookup.

### Jekyll Configuration
- Uses `future: true` to show events with future dates
- Collections have `output: true` to generate individual pages
- Default layouts assigned via `defaults` section in `_config.yml`

## CI/CD Pipeline

The `.github/workflows/jekyll.yml` workflow:
1. **Build** - Uses devcontainer for consistent environment
2. **Test** - Runs Playwright approval tests
3. **Deploy** - Deploys to GitHub Pages only if tests pass
4. **Manual Deploy** - Requires approval if tests fail

### Devcontainer
The project uses a devcontainer for consistent environments between local development and CI. The devcontainer includes:
- Ruby with Jekyll and Bundler
- Node.js with npm
- Playwright with Chromium
- RMagick for image generation

### Snapshot Updates
To update Playwright snapshots after intentional changes:
1. Run workflow manually from Actions tab
2. Enable "Update Playwright snapshots" input
3. Download `updated-snapshots` artifact
4. Commit the updated snapshot files

## Local Development

The site runs on `http://127.0.0.1:4000` when using `jekyll serve`. Playwright tests are configured to use this URL and will automatically start the Jekyll server if not running.

For quick iteration:
- Use `--incremental` flag with Jekyll for faster rebuilds
- Use `npm run test:ui` for interactive test debugging
- Check `_site/` directory for built output (not committed to git)
