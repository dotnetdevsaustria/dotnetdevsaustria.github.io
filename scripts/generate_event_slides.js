#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const QRCode = require('qrcode');
const { chromium } = require('@playwright/test');

const ROOT_DIR = path.join(__dirname, '..');
const SPEAKERS_DIR = path.join(ROOT_DIR, '_speakers');
const SPONSORS_DIR = path.join(ROOT_DIR, '_sponsors');
const EVENTS_DIR = path.join(ROOT_DIR, '_events');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'event_slides.html');
const OUTPUT_HTML_FILENAME = 'slides.html';
const OUTPUT_PDF_FILENAME = 'Slides.pdf';
const COMMUNITY_NAME = 'DotNetDevs.at';
const COMMUNITY_URL = 'https://dotnetdevs.at';
const COMMUNITY_EMAIL = 'info@dotnetdevs.at';
const COMMUNITY_CHANNELS = [
  { label: 'Meetup', url: 'https://www.meetup.com/dotnet-austria' },
  { label: 'YouTube', url: 'https://www.youtube.com/channel/UCuf0V0imn7bI_wST2fEHgXQ' },
  { label: 'GitHub', url: 'https://github.com/dotnetdevsaustria' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/company/dotnetdevs-austria/' }
];
const COMMUNITY_NEWS = [
  'Monthly onsite and remote .NET meetups for the Austrian community.',
  'Event pages collect speaker bios, links, recordings, and follow-up material.',
  'Slides and recordings stay archived per event so talks remain reusable.',
  'Community touchpoints live across Meetup, YouTube, GitHub, and LinkedIn.'
];
const LINK_FIELDS = [
  { key: 'InPersonLink', label: 'In person' },
  { key: 'RemoteLink', label: 'Remote' },
  { key: 'RecordingLink', label: 'Recording' }
];

function printUsageAndExit() {
  console.error('Missing parameter: event markdown file path is required.');
  console.error('Usage: node scripts/generate_event_slides.js <event-file.md>');
  console.error('Example: node scripts/generate_event_slides.js _events/2026-01-20/index.md');
  process.exit(1);
}

function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${label} not found: ${filePath}`);
    process.exit(1);
  }
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

function formatCommunityDeckTitle(dateValue) {
  const meetupLine = formatMeetupLine(dateValue);
  return meetupLine.replace('.NET Meetup', '.NET Community Austria');
}

function formatMonthYear(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    console.error(`Error: Invalid frontmatter date: ${dateValue}`);
    process.exit(1);
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

function formatEventDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    console.error(`Error: Invalid frontmatter date: ${dateValue}`);
    process.exit(1);
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatCompactDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function normalizeSpeakers(speakersValue) {
  if (!Array.isArray(speakersValue) || speakersValue.length === 0) {
    console.error('Error: Frontmatter field "speakers" must be a non-empty array.');
    process.exit(1);
  }

  return speakersValue
    .map(name => String(name).trim())
    .filter(Boolean);
}

function normalizeRichText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveAssetHref(eventDir, webPath) {
  if (!webPath || typeof webPath !== 'string') {
    return '';
  }

  const absoluteAssetPath = path.join(ROOT_DIR, webPath.replace(/^\//, ''));
  return toPosixPath(path.relative(eventDir, absoluteAssetPath));
}

function loadAllSpeakers() {
  const speakers = {};
  const files = fs.readdirSync(SPEAKERS_DIR).filter(file => file.endsWith('.md'));

  for (const file of files) {
    const speakerFilePath = path.join(SPEAKERS_DIR, file);
    const speakerFile = matter(fs.readFileSync(speakerFilePath, 'utf8'));
    const name = speakerFile.data.name;
    if (name) {
      speakers[name] = speakerFile.data;
    }
  }

  return speakers;
}

function loadSponsors(eventDir) {
  const files = fs.readdirSync(SPONSORS_DIR).filter(file => file.endsWith('.md'));

  return files
    .map(file => {
      const sponsorFilePath = path.join(SPONSORS_DIR, file);
      const sponsorFile = matter(fs.readFileSync(sponsorFilePath, 'utf8'));
      return {
        title: String(sponsorFile.data.title || '').trim(),
        description: normalizeRichText(sponsorFile.content),
        logoHref: resolveAssetHref(eventDir, sponsorFile.data.logo)
      };
    })
    .filter(sponsor => sponsor.title);
}

function loadUpcomingEvents(currentDate, currentEventPath) {
  return fs.readdirSync(EVENTS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(EVENTS_DIR, entry.name, 'index.md'))
    .filter(filePath => fs.existsSync(filePath) && filePath !== currentEventPath)
    .map(filePath => {
      const eventFile = matter(fs.readFileSync(filePath, 'utf8'));
      return {
        filePath,
        date: eventFile.data.date,
        title: eventFile.data.title,
        public: eventFile.data.public,
        speakers: Array.isArray(eventFile.data.speakers) ? eventFile.data.speakers : [],
        permalink: eventFile.data.permalink || ''
      };
    })
    .filter(event => event.public && event.title && event.date)
    .filter(event => new Date(event.date) > currentDate)
    .sort((left, right) => new Date(left.date) - new Date(right.date))
    .slice(0, 3)
    .map(event => ({
      date: formatCompactDate(event.date),
      title: String(event.title).trim(),
      speakers: event.speakers.map(name => String(name).trim()).filter(Boolean),
      permalink: event.permalink
    }));
}

function resolveSpeakerProfiles(speakerNames, speakersIndex) {
  return speakerNames.map(speakerName => {
    const speaker = speakersIndex[speakerName] || {};
    const bio = typeof speaker.bio === 'string' ? speaker.bio.trim() : '';

    return {
      name: speakerName,
      bio,
      hasBio: bio.length > 0
    };
  });
}

function formatSpeakerLine(speakerNames) {
  return speakerNames.join(', ');
}

function splitParagraphs(value) {
  return String(value || '')
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.replace(/\n/g, ' ').trim())
    .filter(Boolean);
}

function formatLinkDisplay(url) {
  try {
    const parsedUrl = new URL(url);
    const shortenedPath = parsedUrl.pathname.length > 32
      ? `${parsedUrl.pathname.slice(0, 29)}...`
      : parsedUrl.pathname;
    return `${parsedUrl.hostname}${shortenedPath}`;
  } catch {
    return url;
  }
}

function buildStatItems(eventData) {
  const labels = [
    { key: 'Registrations', label: 'Registrations' },
    { key: 'Participants', label: 'Onsite' },
    { key: 'Viewers', label: 'Viewers' }
  ];

  return labels
    .map(item => {
      const rawValue = eventData[item.key];
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
        return null;
      }

      return {
        label: item.label,
        value: String(rawValue).trim()
      };
    })
    .filter(Boolean);
}

function buildParagraphsHtml(paragraphs) {
  return paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');
}

function buildListItemsHtml(items) {
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function buildChannelCardsHtml(channels) {
  return channels.map(channel => `
    <article class="mini-card mini-card--channel">
      <div class="mini-card__label">${escapeHtml(channel.label)}</div>
      <a href="${escapeHtml(channel.url)}">${escapeHtml(formatLinkDisplay(channel.url))}</a>
    </article>`).join('');
}

function buildStatCardsHtml(stats) {
  if (stats.length === 0) {
    return '<article class="mini-card"><div class="mini-card__label">Attendance</div><p>Stats can be added in event front matter.</p></article>';
  }

  return stats.map(stat => `
    <article class="stat-card">
      <div class="stat-card__value">${escapeHtml(stat.value)}</div>
      <div class="stat-card__label">${escapeHtml(stat.label)}</div>
    </article>`).join('');
}

function buildSponsorCardsHtml(sponsors) {
  return sponsors.map(sponsor => {
    const logo = sponsor.logoHref
      ? `<img class="sponsor-card__logo" src="${escapeHtml(sponsor.logoHref)}" alt="${escapeHtml(sponsor.title)} logo" />`
      : `<div class="sponsor-card__placeholder">${escapeHtml(sponsor.title)}</div>`;

    return `
      <article class="sponsor-card">
        <div class="sponsor-card__media">${logo}</div>
        <div class="sponsor-card__body">
          <h3>${escapeHtml(sponsor.title)}</h3>
          <p>${escapeHtml(sponsor.description || 'Community sponsor')}</p>
        </div>
      </article>`;
  }).join('');
}

function buildUpcomingEventsHtml(events) {
  if (events.length === 0) {
    return '<article class="mini-card"><div class="mini-card__label">Planning</div><p>Upcoming events can be added once they are published.</p></article>';
  }

  return events.map(event => `
    <article class="mini-card mini-card--event">
      <div class="mini-card__label">${escapeHtml(event.date)}</div>
      <h3>${escapeHtml(event.title)}</h3>
      <p>${escapeHtml(formatSpeakerLine(event.speakers) || 'Speaker details coming soon')}</p>
      ${event.permalink ? `<a href="${escapeHtml(`${COMMUNITY_URL.replace(/\/$/, '')}${event.permalink}`)}">${escapeHtml(event.permalink)}</a>` : ''}
    </article>`).join('');
}

function buildSpeakerCardsHtml(speakerProfiles) {
  return speakerProfiles.map(profile => {
    const bioParagraphs = profile.hasBio
      ? buildParagraphsHtml(splitParagraphs(profile.bio))
      : '<p>Bio coming soon.</p>';
    const densityClass = profile.bio.length > 700 ? ' speaker-card--dense' : '';

    return `
      <article class="speaker-card${densityClass}">
        <div class="speaker-card__label">Speaker</div>
        <h3>${escapeHtml(profile.name)}</h3>
        <div class="speaker-card__bio">${bioParagraphs}</div>
      </article>`;
  }).join('');
}

async function buildLinkCardsHtml(eventData) {
  const links = LINK_FIELDS
    .map(field => {
      const rawValue = eventData[field.key];
      if (!rawValue || String(rawValue).trim() === '') {
        return null;
      }

      return {
        label: field.label,
        url: String(rawValue).trim()
      };
    })
    .filter(Boolean);

  if (links.length === 0) {
    return '<div class="link-card link-card--empty"><h3>Links coming soon</h3><p>Add event links in the front matter to render QR codes here.</p></div>';
  }

  const cards = await Promise.all(links.map(async link => {
    const qrCodeDataUrl = await QRCode.toDataURL(link.url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
      color: {
        dark: '#6E2B7E',
        light: '#0000'
      }
    });

    return `
      <article class="link-card">
        <div class="link-card__qr-wrap">
          <img class="link-card__qr" src="${qrCodeDataUrl}" alt="QR code for ${escapeHtml(link.label)}" />
        </div>
        <div class="link-card__body">
          <div class="link-card__label">${escapeHtml(link.label)}</div>
          <a href="${escapeHtml(link.url)}">${escapeHtml(formatLinkDisplay(link.url))}</a>
        </div>
      </article>`;
  }));

  return cards.join('');
}

function renderSlide({ title, eyebrow, kicker = '', lead = '', content, modifier = '', dataTitle = '' }) {
  return `
    <section class="slide${modifier ? ` ${modifier}` : ''}" data-slide-title="${escapeHtml(dataTitle || title)}">
      <div class="slide__frame">
        <div class="slide__brandbar">
          <div class="slide__brandtext">${escapeHtml(COMMUNITY_NAME)}</div>
          <div class="slide__brandmark" aria-hidden="true"></div>
        </div>
        <div class="slide__content">
          <div class="slide__eyebrow">${escapeHtml(eyebrow)}</div>
          ${kicker ? `<div class="slide__kicker">${escapeHtml(kicker)}</div>` : ''}
          <h2>${escapeHtml(title)}</h2>
          ${lead ? `<p class="slide__lead">${escapeHtml(lead)}</p>` : ''}
          ${content}
        </div>
        <div class="slide__footer">
          <span>${escapeHtml(COMMUNITY_URL)}</span>
          <span class="slide__footer-index"></span>
        </div>
      </div>
    </section>`;
}

function buildSlidesHtml(context) {
  const abstractParagraphs = splitParagraphs(context.abstract);
  const hostSponsor = context.sponsors.find(sponsor => sponsor.title.toLowerCase().includes('rubicon'));
  const raffleSponsor = context.sponsors.find(sponsor => sponsor.title.toLowerCase().includes('jetbrains'));

  const slides = [
    renderSlide({
      title: context.communityDeckTitle,
      eyebrow: 'Slide 1',
      kicker: context.formattedDate,
      lead: 'Monthly .NET meetup for developers, architects, and community members across Austria.',
      dataTitle: 'Welcome',
      modifier: 'slide--hero',
      content: `
        <div class="hero-layout">
          <div class="hero-copy">
            <h1>.NET Community Austria</h1>
            <div class="hero-copy__month">${escapeHtml(context.monthYear)}</div>
            <p class="hero-copy__meta">Feature session: ${escapeHtml(context.title)} by ${escapeHtml(context.speakerLine)}</p>
          </div>
          <div class="hero-sidebar">
            <div class="flag-bar" aria-hidden="true"></div>
            <div class="stats-grid">${buildStatCardsHtml(context.stats)}</div>
          </div>
        </div>`
    }),
    renderSlide({
      title: 'Thank you for joining!',
      eyebrow: 'Slide 2',
      lead: 'A quick welcome before we move into community updates and the feature talk.',
      content: `
        <div class="two-column-grid">
          <div class="feature-card">
            <div class="feature-card__label">Tonight</div>
            <ul class="bullet-list">${buildListItemsHtml([
              'Say hello, ask questions, and keep the chat active.',
              'Slides, links, and recordings stay archived with the event.',
              'Stick around until the end for announcements and raffle details.'
            ])}</ul>
          </div>
          <div class="mini-grid">${buildChannelCardsHtml(context.channels)}</div>
        </div>`
    }),
    renderSlide({
      title: 'Thanks for hosting!',
      eyebrow: 'Slide 3',
      lead: hostSponsor
        ? `${hostSponsor.title} helps make the meetup possible with venue and event support.`
        : 'Thanks to everyone supporting venue, streaming, moderation, and organization.',
      content: `
        <div class="two-column-grid">
          <article class="feature-card">
            <div class="feature-card__label">Host support</div>
            <h3>${escapeHtml(hostSponsor ? hostSponsor.title : 'Community hosts')}</h3>
            <p>${escapeHtml(hostSponsor ? hostSponsor.description : 'Local hosts, organizers, and volunteers help us run the meetup every month.')}</p>
          </article>
          <article class="feature-card">
            <div class="feature-card__label">Community operations</div>
            <ul class="bullet-list">${buildListItemsHtml([
              'Event planning and speaker coordination',
              'Onsite setup, streaming, and moderation',
              'Slides, recordings, and community follow-up'
            ])}</ul>
          </article>
        </div>`
    }),
    renderSlide({
      title: 'Our Sponsors',
      eyebrow: 'Slide 6',
      lead: 'Sponsors support the meetup with venue, logistics, and prizes.',
      content: `<div class="sponsor-grid">${buildSponsorCardsHtml(context.sponsors)}</div>`
    }),
    renderSlide({
      title: 'How to take part in the raffle?',
      eyebrow: 'Slide 7',
      lead: raffleSponsor
        ? `${raffleSponsor.title} sponsors the raffle for the meetup.`
        : 'Stay until the end to take part in the raffle.',
      content: `
        <div class="two-column-grid">
          <article class="feature-card">
            <div class="feature-card__label">How it works</div>
            <ul class="bullet-list">${buildListItemsHtml([
              'Join the session and stay until the wrap-up.',
              'Be present when the winner is drawn.',
              'One prize per attendee so the raffle stays fair.'
            ])}</ul>
          </article>
          <article class="feature-card">
            <div class="feature-card__label">Prize</div>
            <p>${escapeHtml(raffleSponsor ? raffleSponsor.description : 'A sponsor-supported giveaway closes the meetup.')}</p>
          </article>
        </div>`
    }),
    renderSlide({
      title: 'Community News',
      eyebrow: 'Slide 8',
      lead: 'A few useful reminders and community touchpoints before the talk starts.',
      content: `
        <div class="two-column-grid">
          <article class="feature-card">
            <div class="feature-card__label">Highlights</div>
            <ul class="bullet-list">${buildListItemsHtml(COMMUNITY_NEWS)}</ul>
          </article>
          <div class="mini-grid">${buildChannelCardsHtml(context.channels)}</div>
        </div>`
    }),
    renderSlide({
      title: 'Next meetups',
      eyebrow: 'Slide 9',
      lead: 'Here is what is already on the calendar after this session.',
      content: `<div class="mini-grid mini-grid--events">${buildUpcomingEventsHtml(context.upcomingEvents)}</div>`
    }),
    renderSlide({
      title: 'If you want host a meetup?',
      eyebrow: 'Slide 10',
      lead: 'We are always looking for speakers, topics, venues, and community partners.',
      content: `
        <div class="two-column-grid">
          <article class="feature-card">
            <div class="feature-card__label">Get involved</div>
            <ul class="bullet-list">${buildListItemsHtml([
              'Propose a talk or live coding session.',
              'Offer a venue, food, or logistics support.',
              'Help with moderation, streaming, or community outreach.'
            ])}</ul>
          </article>
          <article class="feature-card">
            <div class="feature-card__label">Contact</div>
            <p>Email us at <a href="mailto:${escapeHtml(context.communityEmail)}">${escapeHtml(context.communityEmail)}</a> and include your topic, availability, or sponsorship idea.</p>
            <p>Community hub: <a href="${escapeHtml(context.communityUrl)}">${escapeHtml(context.communityUrl)}</a></p>
          </article>
        </div>`
    }),
    renderSlide({
      title: context.title,
      eyebrow: 'Slide 11',
      kicker: context.meetupLine,
      lead: `by ${context.speakerLine}`,
      modifier: 'slide--talk',
      dataTitle: 'Talk Title',
      content: `
        <div class="hero-layout hero-layout--talk">
          <div class="hero-copy">
            <h1>${escapeHtml(context.title)}</h1>
            <p class="hero-copy__meta">${escapeHtml(context.formattedDate)}</p>
          </div>
          <article class="feature-card feature-card--accent">
            <div class="feature-card__label">Event file</div>
            <p>${escapeHtml(context.eventFileLabel)}</p>
          </article>
        </div>`
    }),
    renderSlide({
      title: context.speakerProfiles.length > 1 ? 'Speakers' : 'Speaker',
      eyebrow: 'Speaker',
      lead: 'Background and context for the featured speaker or speakers.',
      content: `<div class="speaker-grid">${buildSpeakerCardsHtml(context.speakerProfiles)}</div>`
    }),
    renderSlide({
      title: 'Abstract',
      eyebrow: 'Talk overview',
      lead: 'What this session is about and what attendees should expect.',
      modifier: context.abstract.length > 750 ? 'slide--dense' : '',
      content: `<div class="prose">${buildParagraphsHtml(abstractParagraphs)}</div>`
    }),
    renderSlide({
      title: 'Event Links',
      eyebrow: 'Join and share',
      lead: 'Scan the QR codes or open the event links directly.',
      content: `<div class="link-grid">${context.linkCardsHtml}</div>`
    }),
    renderSlide({
      title: 'See you next Month!',
      eyebrow: 'Closing',
      lead: 'Thank you for being part of the community.',
      modifier: 'slide--closing',
      content: `
        <div class="two-column-grid">
          <article class="feature-card feature-card--accent">
            <div class="feature-card__label">Keep in touch</div>
            <p>${escapeHtml(context.communityUrl)}</p>
            <p>${escapeHtml(context.communityEmail)}</p>
          </article>
          <article class="feature-card">
            <div class="feature-card__label">Next step</div>
            <ul class="bullet-list">${buildListItemsHtml([
              'Share feedback after the talk.',
              'Invite a colleague to the next meetup.',
              'Reach out if you want to speak or support the group.'
            ])}</ul>
          </article>
        </div>`
    })
  ];

  return slides.join('');
}

async function exportSlidesPdf(htmlPath, outputPath) {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
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
  assertFileExists(SPEAKERS_DIR, 'Speakers directory');
  assertFileExists(SPONSORS_DIR, 'Sponsors directory');
  assertFileExists(EVENTS_DIR, 'Events directory');

  const rawEventFile = fs.readFileSync(eventFilePath, 'utf8');
  const parsedEvent = matter(rawEventFile);
  const { title, date, speakers, abstract } = parsedEvent.data;

  if (!title || String(title).trim() === '') {
    console.error('Error: Frontmatter field "title" is required.');
    process.exit(1);
  }

  if (!date) {
    console.error('Error: Frontmatter field "date" is required.');
    process.exit(1);
  }

  if (!abstract || String(abstract).trim() === '') {
    console.error('Error: Frontmatter field "abstract" is required.');
    process.exit(1);
  }

  const speakerNames = normalizeSpeakers(speakers);
  const speakersIndex = loadAllSpeakers();
  const eventDir = path.dirname(eventFilePath);
  const eventDate = new Date(date);
  const speakerProfiles = resolveSpeakerProfiles(speakerNames, speakersIndex);
  const sponsors = loadSponsors(eventDir);
  const upcomingEvents = loadUpcomingEvents(eventDate, eventFilePath);
  const stats = buildStatItems(parsedEvent.data);
  const context = {
    title: String(title).trim(),
    abstract: String(abstract).trim(),
    meetupLine: formatMeetupLine(date),
    communityDeckTitle: formatCommunityDeckTitle(date),
    monthYear: formatMonthYear(date),
    formattedDate: formatEventDate(date),
    speakerLine: formatSpeakerLine(speakerNames),
    speakerProfiles,
    sponsors,
    upcomingEvents,
    stats,
    channels: COMMUNITY_CHANNELS,
    communityUrl: COMMUNITY_URL,
    communityEmail: COMMUNITY_EMAIL,
    eventFileLabel: path.relative(ROOT_DIR, eventFilePath),
    linkCardsHtml: await buildLinkCardsHtml(parsedEvent.data)
  };

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const slidesHtml = buildSlidesHtml(context);
  const renderedHtml = template
    .replace(/__PAGE_TITLE__/g, escapeHtml(`${context.title} - ${COMMUNITY_NAME} Slides`))
    .replace(/__SLIDES__/g, slidesHtml);

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