#!/usr/bin/env node

// Generates the meetup slide deck for an event as a self-contained HTML file (plus PDF export).
// The layout mirrors the DotNetDevs.at PowerPoint deck: every slide is 1920 x 1080 px,
// positions are taken from the PPTX (1 px = 6350 EMU, 1 pt = 2 px).

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const QRCode = require('qrcode');
const { chromium } = require('@playwright/test');

const ROOT_DIR = path.join(__dirname, '..');
const SPONSORS_DIR = path.join(ROOT_DIR, '_sponsors');
const EVENTS_DIR = path.join(ROOT_DIR, '_events');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'event_slides.html');
const ASSETS_DIR = path.join(ROOT_DIR, 'templates', 'slides');
const SPONSOR_ASSETS_DIR = path.join(ASSETS_DIR, 'sponsors');
const OUTPUT_HTML_FILENAME = 'slides.html';
const OUTPUT_PDF_FILENAME = 'Slides.pdf';
const COMMUNITY_NAME = 'DotNetDevs.at';
const COMMUNITY_EMAIL = 'team@dotnetdevs.at';
const SOCIAL_LINKS = {
  youtube: 'https://go.dotnetdevs.at/youtube',
  twitch: 'https://go.dotnetdevs.at/twitch',
  bluesky: 'https://go.dotnetdevs.at/bluesky',
  linkedin: 'https://go.dotnetdevs.at/linkedin'
};
const HELP_US_URL = 'https://go.dotnetdevs.at/helpus';
const FEEDBACK_URL_PREFIX = 'https://go.dotnetdevs.at/feedback-';
// Sponsor order on the sponsor slide (by sponsor file name); unknown sponsors follow alphabetically.
const SPONSOR_ORDER = ['rubicon', 'jetbrains'];
// Logo boxes on the sponsor slide for two sponsors (from the PPTX).
const SPONSOR_BOXES_TWO = [
  { left: 285, top: 440.34, width: 589.03, height: 143.64 },
  { left: 1228.2, top: 339.6, width: 318.37, height: 345.12 }
];
const MAX_TIMELINE_ITEMS = 3;
const MIN_TIMELINE_ITEMS = 2;

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

function printUsageAndExit() {
  console.error('Missing parameter: event markdown file path is required.');
  console.error('Usage: node scripts/generate_event_slides.js <event-file.md>');
  console.error('Example: node scripts/generate_event_slides.js _events/2026-01-20/index.md');
  process.exit(1);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} not found: ${filePath}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toDataUri(filePath) {
  const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()];
  if (!mimeType) {
    fail(`Unsupported image type: ${filePath}`);
  }

  return `data:${mimeType};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function asset(fileName) {
  const filePath = path.join(ASSETS_DIR, fileName);
  assertFileExists(filePath, 'Slide asset');
  return toDataUri(filePath);
}

function parseDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    fail(`Invalid frontmatter date: ${dateValue}`);
  }
  return date;
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function ordinalSuffix(day) {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return 'th';
  }
  return { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th';
}

// "November 5<sup>th</sup> 2026"
function formatTimelineDateHtml(date) {
  const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = date.getUTCDate();
  return `${escapeHtml(month)} ${day}<sup>${ordinalSuffix(day)}</sup> ${date.getUTCFullYear()}`;
}

function formatYearMonth(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function normalizeSpeakers(speakersValue) {
  if (!Array.isArray(speakersValue) || speakersValue.length === 0) {
    fail('Frontmatter field "speakers" must be a non-empty array.');
  }

  return speakersValue
    .map(name => String(name).trim())
    .filter(Boolean);
}

function loadSponsors() {
  const rank = slug => {
    const index = SPONSOR_ORDER.indexOf(slug);
    return index === -1 ? SPONSOR_ORDER.length : index;
  };

  return fs.readdirSync(SPONSORS_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const slug = path.basename(file, '.md');
      const sponsorFile = matter(fs.readFileSync(path.join(SPONSORS_DIR, file), 'utf8'));
      const title = String(sponsorFile.data.title || '').trim();

      // Prefer the logo used in the PowerPoint deck, fall back to the website logo.
      const deckLogo = ['.svg', '.png', '.jpg', '.jpeg', '.webp']
        .map(ext => path.join(SPONSOR_ASSETS_DIR, `${slug}${ext}`))
        .find(candidate => fs.existsSync(candidate));
      const siteLogo = typeof sponsorFile.data.logo === 'string'
        ? path.join(ROOT_DIR, sponsorFile.data.logo.replace(/^\//, ''))
        : '';
      const logoPath = deckLogo || (siteLogo && fs.existsSync(siteLogo) ? siteLogo : '');

      return { slug, title, logo: logoPath ? toDataUri(logoPath) : '' };
    })
    .filter(sponsor => sponsor.title)
    .sort((left, right) => rank(left.slug) - rank(right.slug) || left.slug.localeCompare(right.slug));
}

function loadUpcomingEvents(currentDate, currentEventPath) {
  return fs.readdirSync(EVENTS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(EVENTS_DIR, entry.name, 'index.md'))
    .filter(filePath => fs.existsSync(filePath) && path.resolve(filePath) !== path.resolve(currentEventPath))
    .map(filePath => matter(fs.readFileSync(filePath, 'utf8')).data)
    .filter(event => event.public && event.title && event.date)
    .map(event => ({
      date: new Date(event.date),
      title: String(event.title).trim(),
      speakers: Array.isArray(event.speakers) ? event.speakers.map(name => String(name).trim()).filter(Boolean) : [],
      location: event.Location ? String(event.Location).trim() : ''
    }))
    .filter(event => !Number.isNaN(event.date.getTime()) && event.date > currentDate)
    .sort((left, right) => left.date - right.date)
    .slice(0, MAX_TIMELINE_ITEMS);
}

// Timeline entries: published upcoming events, padded with "TBD" months.
function buildTimelineItems(currentDate, upcomingEvents) {
  const items = upcomingEvents.map(event => ({
    titleHtml: formatTimelineDateHtml(event.date),
    lines: [
      event.title,
      event.speakers.join(', '),
      event.location ? `@${event.location}` : ''
    ].filter(Boolean)
  }));

  let lastDate = upcomingEvents.length > 0 ? upcomingEvents[upcomingEvents.length - 1].date : currentDate;
  while (items.length < MIN_TIMELINE_ITEMS) {
    lastDate = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + 1, 1));
    items.push({ titleHtml: escapeHtml(formatMonthYear(lastDate)), lines: ['TBD', 'TBD', 'TBD'] });
  }

  return items;
}

/* ---------- Slide building blocks ---------- */

function slide({ title, background = 'bg-default', hidden = false, content }) {
  const classes = ['slide', background].filter(Boolean).join(' ');
  return `
  <section class="${classes}" data-title="${escapeHtml(title)}"${hidden ? ' data-hidden' : ''}>
${content}
  </section>
`;
}

function paragraphs(lines, className = '') {
  const classAttr = className ? ` class="${className}"` : '';
  return lines.map(line => `<p${classAttr}>${escapeHtml(line)}</p>`).join('\n      ');
}

function sectionSlide({ title, body = [], titleAlign = '', bodyAlign = '', titleSize = '', background, hidden, autofit = false }) {
  const titleStyle = titleSize ? ` style="font-size:${titleSize}px;"` : '';
  const autofitAttr = autofit ? ' data-autofit' : '';
  const bodyHtml = body.length > 0
    ? `\n    <div class="tb section-body">\n      ${paragraphs(body, bodyAlign)}\n    </div>`
    : '';

  return slide({
    title,
    background,
    hidden,
    content: `    <div class="tb anchor-b section-title"${titleStyle}${autofitAttr}>${paragraphs([title], titleAlign)}</div>${bodyHtml}`
  });
}

function img(src, alt, box, extraStyle = '') {
  return `    <img class="img" src="${src}" alt="${escapeHtml(alt)}" style="left:${box.left}px; top:${box.top}px; width:${box.width}px; height:${box.height}px;${extraStyle}">`;
}

function textBox(className, box, html, extraStyle = '') {
  const size = [
    `left:${box.left}px`,
    `top:${box.top}px`,
    `width:${box.width}px`,
    box.height !== undefined ? `height:${box.height}px` : '',
    box.fontSize !== undefined ? `font-size:${box.fontSize}px` : ''
  ].filter(Boolean).join('; ');
  return `    <div class="${className}" style="${extraStyle}${size};">${html}</div>`;
}

/* ---------- Slides ---------- */

function titleSlide(context) {
  const linkBox = (left, top) => ({ left, top, width: 623.62, fontSize: 32 });
  return slide({
    title: '.NET Community Austria',
    background: '',
    content: [
      textBox('tb big anchor-b', { left: 240, top: 176.75, width: 1440, height: 376, fontSize: 108 },
        `<p class="ctr">.NET Community Austria<br>${escapeHtml(context.monthYear)}</p>`),
      textBox('tb', { left: 240, top: 567.25, width: 1440, height: 156.87, fontSize: 48 },
        `<p class="ctr">&nbsp;</p><p class="ctr">Presented by ${escapeHtml(COMMUNITY_NAME)}</p>`),
      img(asset('youtube.png'), 'YouTube', { left: 176.31, top: 798.42, width: 252.89, height: 56.69 }),
      textBox('tb link', linkBox(431.27, 798.42), `<p>${escapeHtml(SOCIAL_LINKS.youtube)}</p>`),
      img(asset('twitch.png'), 'Twitch', { left: 181.85, top: 883.77, width: 249.42, height: 56.69 }),
      textBox('tb link', linkBox(431.27, 884.38), `<p>${escapeHtml(SOCIAL_LINKS.twitch)}</p>`),
      img(asset('bluesky.png'), 'Bluesky', { left: 1051.06, top: 798.42, width: 60.52, height: 53.32 }),
      textBox('tb link', linkBox(1111.59, 798.42), `<p>${escapeHtml(SOCIAL_LINKS.bluesky)}</p>`),
      img(asset('linkedin.png'), 'LinkedIn', { left: 1054.89, top: 883.77, width: 66.67, height: 56.69 }),
      textBox('tb link', linkBox(1111.59, 883.77), `<p>${escapeHtml(SOCIAL_LINKS.linkedin)}</p>`)
    ].join('\n')
  });
}

function helpUsSlide() {
  return slide({
    title: 'Help us',
    hidden: true,
    content: [
      img(asset('qr-helpus.svg'), `QR code ${HELP_US_URL}`, { left: 523.73, top: 59.73, width: 831.2, height: 831.2 }),
      textBox('tb calibri', { left: 0, top: 890.93, width: 1920, fontSize: 64 },
        `<p class="ctr">${escapeHtml(HELP_US_URL)}</p>`, '--dy:0.05em; ')
    ].join('\n')
  });
}

function sponsorBoxes(count) {
  if (count === 2) {
    return SPONSOR_BOXES_TWO;
  }

  // Other counts: distribute evenly in one row within the content area.
  const areaLeft = 132;
  const areaWidth = 1656;
  const cell = areaWidth / Math.max(count, 1);
  const width = Math.min(cell - 60, 589.03);
  const height = 345.12;
  return Array.from({ length: count }, (_, index) => ({
    left: Math.round((areaLeft + cell * index + (cell - width) / 2) * 100) / 100,
    top: 339.6,
    width: Math.round(width * 100) / 100,
    height
  }));
}

function sponsorsSlide(context) {
  const boxes = sponsorBoxes(context.sponsors.length);
  const logos = context.sponsors.map((sponsor, index) => {
    const box = boxes[index];
    if (!sponsor.logo) {
      return textBox('tb anchor-ctr', { ...box, fontSize: 48 }, `<p class="ctr">${escapeHtml(sponsor.title)}</p>`);
    }
    return img(sponsor.logo, sponsor.title, box, ' object-fit:contain;');
  });

  return slide({
    title: 'Our Sponsors',
    content: [
      '    <div class="tb anchor-ctr title-master"><p>Our Sponsors</p></div>',
      ...logos
    ].join('\n')
  });
}

function raffleSlide() {
  return slide({
    title: 'How to take part in the raffle?',
    content: [
      '    <div class="tb anchor-ctr title-master"><p>How to take part in the raffle?</p></div>',
      textBox('tb', { left: 132, top: 497.17, width: 1656, height: 114.57, fontSize: 72 },
        '<p class="ctr">Type #jetbrains in the chat</p>', '--dy:-2px; ')
    ].join('\n')
  });
}

function timelineSlide(context) {
  const items = context.timelineItems;
  // Horizontal distance between pins; 929.73 px matches the two-entry SmartArt in the PPTX.
  // With more entries the last text block (71.54 px offset, 602.36 px wide) must end at the arrow.
  const step = items.length <= 2 ? 929.73 : (1656 - 71.54 - 602.36) / (items.length - 1);
  const round = value => Math.round(value * 100) / 100;

  const shapes = [];
  const texts = [];

  items.forEach((item, index) => {
    const x = round(index * step);
    const above = index % 2 === 0;
    const pinX = round(x + 35.9);
    const textLeft = round(x + 71.54);
    const linesHtml = item.lines.map(line => `<p>${escapeHtml(line)}</p>`).join('\n        ');

    if (above) {
      shapes.push(`        <line x1="${pinX}" y1="139.79" x2="${pinX}" y2="342.62" stroke="#4472C4" stroke-width="2" stroke-dasharray="8 6"/>
        <g transform="translate(${round(x + 10.71)} 78.96) rotate(135 25.195 25.195) scale(50.39)">
          <use href="#teardrop" fill="#4472C4" stroke="#4472C4" stroke-width="0.0397"/>
        </g>
        <circle cx="${round(x + 35.91)}" cy="104.16" r="19.6" fill="#fff" fill-opacity="0.9"/>
        <circle cx="${round(x + 35.76)}" cy="342.62" r="6.41" fill="#4472C4" stroke="#fff" stroke-width="2"/>`);
      texts.push(`      <div class="tl-text big" style="left:${textLeft}px; top:68.53px; width:602.36px; height:71.27px;">
        <p>${item.titleHtml}</p>
      </div>
      <div class="tl-text small" data-autofit style="left:${textLeft}px; top:139.79px; width:602.36px; height:202.83px; padding:15px 0 22.5px 0;">
        ${linesHtml}
      </div>`);
    } else {
      shapes.push(`        <line x1="${pinX}" y1="342.62" x2="${pinX}" y2="545.45" stroke="#4472C4" stroke-width="2" stroke-dasharray="8 6"/>
        <g transform="translate(${round(x + 10.71)} 555.9) rotate(315 25.195 25.195) scale(50.39)">
          <use href="#teardrop" fill="#4472C4" stroke="#4472C4" stroke-width="0.0397"/>
        </g>
        <circle cx="${round(x + 35.91)}" cy="581.09" r="19.6" fill="#fff" fill-opacity="0.9"/>
        <circle cx="${round(x + 35.76)}" cy="342.62" r="6.41" fill="#4472C4" stroke="#fff" stroke-width="2"/>`);
      texts.push(`      <div class="tl-text small" data-autofit style="left:${textLeft}px; top:342.62px; width:602.36px; height:202.83px; padding:22.5px 15px 9px 0; justify-content:flex-end;">
        ${linesHtml}
      </div>
      <div class="tl-text big" style="left:${textLeft}px; top:545.46px; width:602.36px; height:71.27px;">
        <p>${item.titleHtml}</p>
      </div>`);
    }
  });

  return slide({
    title: 'Next meetups',
    content: `    <div class="tb anchor-ctr title-master"><p>Next meetups</p></div>
    <div style="position:absolute; left:132px; top:287.5px; width:1656px; height:685.25px;">
      <svg width="1656" height="685.25" viewBox="0 0 1656 685.25" style="position:absolute; left:0; top:0; overflow:visible;">
        <defs>
          <path id="teardrop" d="M0,0.5 A0.5,0.5 0 0 1 0.5,0 Q0.7875,0 1.075,-0.075 Q1,0.2125 1,0.5 A0.5,0.5 0 0 1 0.5,1 A0.5,0.5 0 0 1 0,0.5 Z"/>
        </defs>
        <line x1="0" y1="342.62" x2="1642" y2="342.62" stroke="#4472C4" stroke-width="3"/>
        <polygon points="1641,335.12 1656,342.62 1641,350.12" fill="#4472C4"/>
${shapes.join('\n')}
      </svg>
${texts.join('\n')}
    </div>`
  });
}

function talkSlide(context) {
  return slide({
    title: context.title,
    content: `    <div class="tb section-title" data-autofit>${paragraphs([context.title])}</div>
    <div class="tb section-body">
      ${paragraphs(context.speakers, 'ctr')}
    </div>`
  });
}

function stickerSlide() {
  return slide({
    title: 'Thank you for joining! (Sticker)',
    hidden: true,
    content: [
      textBox('tb big', { left: 78, top: 239.88, width: 673.5, height: 600.25, fontSize: 144 }, '<p>Thank you for joining!</p>'),
      `    <div style="position:absolute; left:816.27px; top:213.73px; width:725.75px; height:607.51px; overflow:hidden;">
      <img src="${asset('stickers.png')}" alt="${escapeHtml(COMMUNITY_NAME)} stickers" style="display:block; width:725.75px; height:737.1px;">
    </div>`
    ].join('\n')
  });
}

function thankYouForJoiningSlide() {
  return slide({
    title: 'Thank you for joining!',
    content: textBox('tb big', { left: 306, top: 373, width: 1174, height: 466.37, fontSize: 144 },
      '<p class="ctr">Thank you for joining!</p>')
  });
}

async function feedbackSlide(context) {
  const qrCode = await QRCode.toDataURL(context.feedbackUrl, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 780,
    color: { dark: '#000000', light: '#FFFFFF' }
  });

  return slide({
    title: 'We want to hear your feedback',
    hidden: true,
    content: [
      '    <div class="tb anchor-ctr title-master"><p>We want to hear your feedback</p></div>',
      img(qrCode, `QR code ${context.feedbackUrl}`, { left: 144.8, top: 232.6, width: 778.93, height: 778.93 }),
      textBox('tb link', { left: 984, top: 540, width: 847, fontSize: 36 }, `<p>${escapeHtml(context.feedbackUrl)}</p>`)
    ].join('\n')
  });
}

async function buildSlidesHtml(context) {
  const slides = [
    titleSlide(context),
    sectionSlide({ title: 'Thank you for joining!', titleAlign: 'ctr', titleSize: 144, background: 'bg-dotnetdevs' }),
    sectionSlide({ title: 'Thanks for hosting!', titleAlign: 'ctr', titleSize: 144, background: 'bg-dotnetdevs' }),
    sectionSlide({ title: 'We need your help!', hidden: true }),
    helpUsSlide(),
    sponsorsSlide(context),
    raffleSlide(),
    sectionSlide({ title: 'Community News' }),
    timelineSlide(context),
    sectionSlide({ title: 'If you want host a meetup?', body: [COMMUNITY_EMAIL] }),
    talkSlide(context),
    sectionSlide({ title: 'Thank you!', titleAlign: 'ctr', titleSize: 144 }),
    stickerSlide(),
    thankYouForJoiningSlide(),
    sponsorsSlide(context),
    sectionSlide({ title: 'JetBrains Raffle', titleAlign: 'ctr', body: [`Contact us at ${COMMUNITY_EMAIL}`], bodyAlign: 'ctr' }),
    await feedbackSlide(context),
    sectionSlide({ title: 'See you next Month!' })
  ];

  return slides.join('');
}

async function exportSlidesPdf(htmlPath, outputPath) {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });

    await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.pdf({
      path: outputPath,
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  const eventFileArg = process.argv[2];
  if (!eventFileArg) {
    printUsageAndExit();
  }

  const eventFilePath = path.resolve(ROOT_DIR, eventFileArg);
  assertFileExists(eventFilePath, 'Event file');
  assertFileExists(TEMPLATE_PATH, 'Slides template');
  assertFileExists(ASSETS_DIR, 'Slide assets directory');
  assertFileExists(SPONSORS_DIR, 'Sponsors directory');
  assertFileExists(EVENTS_DIR, 'Events directory');

  const parsedEvent = matter(fs.readFileSync(eventFilePath, 'utf8'));
  const { title, date, speakers } = parsedEvent.data;

  if (!title || String(title).trim() === '') {
    fail('Frontmatter field "title" is required.');
  }

  if (!date) {
    fail('Frontmatter field "date" is required.');
  }

  const eventDate = parseDate(date);
  const eventDir = path.dirname(eventFilePath);
  const context = {
    title: String(title).trim(),
    speakers: normalizeSpeakers(speakers),
    monthYear: formatMonthYear(eventDate),
    sponsors: loadSponsors(),
    timelineItems: buildTimelineItems(eventDate, loadUpcomingEvents(eventDate, eventFilePath)),
    feedbackUrl: `${FEEDBACK_URL_PREFIX}${formatYearMonth(eventDate)}`
  };

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const slidesHtml = await buildSlidesHtml(context);
  const pageTitle = `.NET Community Austria – ${context.monthYear} – ${COMMUNITY_NAME}`;
  // Function replacers so "$" sequences in content are not interpreted as replacement patterns.
  const renderedHtml = template
    .replace(/__PAGE_TITLE__/g, () => escapeHtml(pageTitle))
    .replace(/__BG_DEFAULT__/g, () => asset('bg-default.png'))
    .replace(/__BG_DOTNETDEVS__/g, () => asset('bg-dotnetdevs.png'))
    .replace(/__SLIDES__/g, () => slidesHtml);

  const htmlOutputPath = path.join(eventDir, OUTPUT_HTML_FILENAME);
  const pdfOutputPath = path.join(eventDir, OUTPUT_PDF_FILENAME);
  fs.writeFileSync(htmlOutputPath, renderedHtml);
  await exportSlidesPdf(htmlOutputPath, pdfOutputPath);
  console.log(`Generated: ${htmlOutputPath}`);
  console.log(`Generated: ${pdfOutputPath}`);
}

main().catch(error => {
  console.error('Error while generating event slides:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
