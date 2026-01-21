# Agent Instructions

This repository contains the Jekyll-based static website for **DotNetDevs.at**, a non-profit Austrian .NET developer community that hosts monthly meetup events.

## Tech Stack

- **Static Site Generator**: Jekyll >= 3.7 with Minimal Mistakes theme
- **Ruby**: Managed via Gemfile (github-pages gem)
- **Node.js**: For testing only
- **Testing**: Playwright (approval/visual snapshot testing)
- **Hosting**: GitHub Pages

## Prerequisites

```bash
bundle install   # Install Ruby gems
npm install      # Install Node.js dependencies
```

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run serve` | Start local dev server at http://127.0.0.1:4000 |
| `npm run build` | Build the Jekyll site |
| `npm test` | Run Playwright tests |
| `npm run test:update-snapshots` | Update visual/approval snapshots |
| `npm run test:ui` | Run tests with Playwright UI |

## Content Structure

### Events (`_events/`)

Filename pattern: `YYYY-MM-DD.md` or `YYYY-MM-DD-talkN.md` for multiple talks on the same day.

Required front matter:

```yaml
---
date: 2025-01-14
title: "Event Title"
speakers:
  - Speaker Name
Location: "Rubicon"
InPersonLink: "https://meetup.com/..."
RemoteLink: "https://meetup.com/..."
RecordingLink: ""  # YouTube URL after event, empty string before
Registrations: 0
Participants: 0
Viewers: 0
public: true  # Set to false to hide from listing
abstract: |
    Talk description...
---
```

### Speakers (`_speakers/`)

Filename: `firstname-lastname.md` (kebab-case)

```yaml
---
name: Full Name
---
```

### Sponsors (`_sponsors/`)

```yaml
---
title: Sponsor Name
permalink: /sponsors/sponsor-slug/
logo: /assets/images/sponsor.svg
---
```

## Important Rules

1. **Always run tests** with `npm test` before committing changes
2. **Update snapshots** with `npm run test:update-snapshots` after intentional visual changes
3. **Event visibility**: Set `public: true` for events to appear on the website
4. **Speaker name matching**: Speaker names in event files must exactly match the `name` field in speaker files for auto-linking
5. **Date format**: Use ISO format `YYYY-MM-DD` in filenames and front matter
6. **Future events**: Are displayed because `future: true` is set in `_config.yml`

## Testing

The project uses approval testing with Playwright:

- **Visual snapshots**: Screenshots compared against baselines
- **Structure snapshots**: JSON snapshots of page structure
- **Test files**: Located in `tests/` directory

Run the full test suite before any PR:

```bash
npm run test:ci  # Builds site and runs tests
```

## Project Structure

```
_config.yml      # Jekyll configuration
_data/           # Navigation and UI text
_events/         # Event markdown files
_speakers/       # Speaker profiles
_sponsors/       # Sponsor information
_includes/       # Reusable HTML partials
_layouts/        # Page templates
_sass/           # SCSS stylesheets
assets/          # Images, CSS, JS
tests/           # Playwright test specs
```
