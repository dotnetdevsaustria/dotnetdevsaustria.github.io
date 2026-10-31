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

- Events live in `_events/<slug>/index.md` where `<slug>` is `YYYY-MM-DD` (or `YYYY-MM-DD-talkN`).
- Speakers live in `_speakers/` using `firstname-lastname.md`.
- Sponsors live in `_sponsors/`.
- Event files must include `date`, `title`, `speakers`, and `public: true` to be listed.
- Event files should include `permalink: /events/<slug>/` to keep stable URLs.
- Event-related archival files (details, images, slides) are stored in the same event folder and are not exposed as download links on pages.
- Speaker names in `speakers:` must exactly match each speaker file `name`.
- Use ISO date format (`YYYY-MM-DD`) in filenames and front matter.

## Event Template Fields

Recommended event front matter:

```yaml
---
date: 2026-01-20
permalink: /events/2026-01-20/
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
npm run generate:onsite _events/2026-01-20/index.md
npm run generate:remote _events/2026-01-20/index.md
ruby scripts/generate_meetup_image.rb
npm run generate:recording-title -- _events/2026-01-20/index.md
npm run generate:slides -- _events/2026-01-20/index.md
```

Recording title image notes:

- The generator reads `title`, `date`, and `speakers` from event front matter.
- It writes `_events/<slug>/Title for Recording.png`, `_events/<slug>/Start Streaming.png`, and `_events/<slug>/Stop Streaming.png` and overwrites existing outputs.
- Background templates are `templates/Title for Recording.png`, `templates/Start Streaming.png`, and `templates/Stop Streaming.png`.
- Text rendering uses Consolas.
- `Title for Recording.png` renders `.NET Meetup <Month Year>`, then title, then `by <speaker(s)>`.
- `Start Streaming.png` and `Stop Streaming.png` render title and `by <speaker(s)>`.
- Validate correctness by comparing generated outputs for `_events/2026-01-20/Title for Recording.png` and `_events/2025-12-16/Title for Recording.png` with their existing examples; only minor anti-aliasing/font-rendering differences are acceptable.

Event slide generator notes:

- The generated deck replicates the DotNetDevs.at PowerPoint deck (`_events/2026-10-06/Slides.pptx`): 18 slides at 1920 x 1080 px with positions taken from the PPTX (1 px = 6350 EMU, 1 pt = 2 px).
- The slide generator reads `title`, `date`, and `speakers` from the event front matter.
- It writes `_events/<slug>/slides.html` and `_events/<slug>/Slides.pdf` and overwrites the existing files.
- `slides.html` is self-contained: images from `templates/slides/` are embedded as data URIs. Layout CSS and navigation JS live in `templates/event_slides.html`.
- Sponsors are loaded from `_sponsors/` (order: Rubicon, JetBrains, then alphabetical). The logo from `templates/slides/sponsors/<sponsor-file-name>.*` is preferred, otherwise the website `logo`.
- The "Next meetups" timeline shows up to 3 upcoming published events (date, title, speakers, `@Location`) and is padded with "TBD" months to at least 2 entries.
- Slides that are hidden in the PowerPoint deck ("We need your help!", help-us QR, sticker slide, feedback QR) are generated with `data-hidden`: skipped during the presentation (toggle with `H`) and omitted from the PDF. The feedback slide uses `https://go.dotnetdevs.at/feedback-<YYYYMM>`.
- Title text frames shrink automatically when the text does not fit, similar to PowerPoint autofit.
- Fonts are Consolas and Calibri (not embedded), so the output matches the PowerPoint deck on Windows.
- Navigation: Right / Space / click = next, Left = previous, Home / End, `F` = fullscreen, `#<n>` in the URL opens slide n, `?export` hides the slide counter.
