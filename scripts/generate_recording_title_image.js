#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { chromium } = require('@playwright/test');

const ROOT_DIR = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'Title for Recording.png');
const OUTPUT_FILENAME = 'Title for Recording.png';

function printUsageAndExit() {
  console.error('Missing parameter: event markdown file path is required.');
  console.error('Usage: node scripts/generate_recording_title_image.js <event-file.md>');
  console.error('Example: node scripts/generate_recording_title_image.js _events/2026-01-20/index.md');
  process.exit(1);
}

function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${label} not found: ${filePath}`);
    process.exit(1);
  }
}

function formatMeetupLine(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    console.error(`Error: Invalid frontmatter date: ${dateValue}`);
    process.exit(1);
  }

  const monthYear = date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return `.NET Meetup ${monthYear}`;
}

function normalizeSpeakers(speakersValue) {
  if (!Array.isArray(speakersValue) || speakersValue.length === 0) {
    console.error('Error: Frontmatter field "speakers" must be a non-empty array.');
    process.exit(1);
  }

  return speakersValue
    .map(name => String(name).trim())
    .filter(Boolean)
    .join(', ');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHtml({ meetupLine, title, speakerLine, templateBase64 }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    html, body {
      margin: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      font-family: Consolas, "Liberation Mono", Menlo, Monaco, monospace;
      color: #6E2B7E;
    }

    .canvas {
      position: relative;
      width: 1920px;
      height: 1080px;
      background-image: url('data:image/png;base64,${templateBase64}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .content {
      position: absolute;
      left: 140px;
      right: 140px;
      top: 215px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 44px;
      align-items: center;
    }

    .meetup {
      font-size: 54px;
      line-height: 1.14;
      font-weight: 700;
      max-width: 1560px;
      word-break: break-word;
    }

    .title {
      font-size: 96px;
      line-height: 1.1;
      font-weight: 700;
      max-width: 1560px;
      word-break: break-word;
    }

    .by {
      font-size: 44px;
      line-height: 1.16;
      font-weight: 700;
      max-width: 1560px;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="canvas">
    <div class="content">
      <div class="meetup">${escapeHtml(meetupLine)}</div>
      <div class="title">${escapeHtml(title)}</div>
      <div class="by">by ${escapeHtml(speakerLine)}</div>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  const eventFileArg = process.argv[2];
  if (!eventFileArg) {
    printUsageAndExit();
  }

  const eventFilePath = path.resolve(ROOT_DIR, eventFileArg);
  assertFileExists(eventFilePath, 'Event file');
  assertFileExists(TEMPLATE_PATH, 'Background template');

  const raw = fs.readFileSync(eventFilePath, 'utf8');
  const parsed = matter(raw);

  const { title, date, speakers } = parsed.data;

  if (!title || String(title).trim() === '') {
    console.error('Error: Frontmatter field "title" is required.');
    process.exit(1);
  }

  if (!date) {
    console.error('Error: Frontmatter field "date" is required.');
    process.exit(1);
  }

  const meetupLine = formatMeetupLine(date);
  const speakerLine = normalizeSpeakers(speakers);
  const templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString('base64');

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });

    const html = buildHtml({
      meetupLine,
      title: String(title).trim(),
      speakerLine,
      templateBase64
    });

    await page.setContent(html, { waitUntil: 'networkidle' });

    const outputPath = path.join(path.dirname(eventFilePath), OUTPUT_FILENAME);
    await page.screenshot({ path: outputPath, type: 'png' });

    console.log(`Generated: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error('Error while generating recording image:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});