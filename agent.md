# 🤖 Agent Instructions

Jekyll website for DotNetDevs.at (Minimal Mistakes theme), hosted on GitHub Pages.

## Quick Start

```bash
bundle install
npm install
npm run serve
```

Local URL: http://127.0.0.1:4000

## Core Commands

```bash
bundle exec jekyll build
bundle exec jekyll serve --incremental
npm test
npm run test:update-snapshots
npm run test:ci
```

## Content Rules

- Events live in `_events/` using `YYYY-MM-DD.md` (or `YYYY-MM-DD-talkN.md`).
- Speakers live in `_speakers/` using `firstname-lastname.md`.
- Sponsors live in `_sponsors/`.
- Event files must include `date`, `title`, `speakers`, and `public: true` to be listed.
- Speaker names in `speakers:` must exactly match each speaker file `name`.
- Use ISO date format (`YYYY-MM-DD`) in filenames and front matter.

## Event Template Fields

Recommended event front matter:

```yaml
---
date: 2026-01-20
title: "Talk Title"
speakers:
  - Speaker Name
InPersonLink: https://meetup.com/...
RemoteLink: https://meetup.com/...
RecordingLink: ""
Registrations: 0
Participants: 0
Viewers: 0
public: true
abstract: |
  Talk description...
---
```

## Testing & CI

- Always run `npm test` before committing.
- Update snapshots only for intentional visual changes.
- CI workflow is `.github/workflows/jekyll.yml` (build → test → deploy).

## Useful Scripts

```bash
npm run generate:onsite _events/2026-01-20.md
npm run generate:remote _events/2026-01-20.md
ruby scripts/generate_meetup_image.rb
```
