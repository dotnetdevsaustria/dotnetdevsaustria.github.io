#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT_DIR = path.join(__dirname, '..');
const EVENTS_DIR = path.join(ROOT_DIR, '_events');
const DEFAULT_OUTPUT_PATH = path.join(ROOT_DIR, 'event_statistics.csv');
const FIELDS = ['date', 'title', 'Registrations', 'Participants', 'Viewers'];

function printUsageAndExit() {
  console.error('Usage: node scripts/extract_statistics.js [output-file]');
  console.error('Example: node scripts/extract_statistics.js event_statistics.csv');
  process.exit(1);
}

function assertDirectoryExists(directoryPath, label) {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    console.error(`Error: ${label} not found: ${directoryPath}`);
    process.exit(1);
  }
}

function csvEscape(value) {
  const normalizedValue = value == null ? '' : String(value);
  if (!/[",\n]/.test(normalizedValue)) {
    return normalizedValue;
  }

  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

function collectEventFiles(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(directoryPath, entry.name, 'index.md'))
    .filter(filePath => fs.existsSync(filePath));
}

function formatDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return value == null ? '' : String(value);
}

function extractDate(frontMatter, filePath) {
  if (frontMatter.date) {
    return formatDateValue(frontMatter.date);
  }

  return path.basename(path.dirname(filePath));
}

function extractTitle(frontMatter) {
  return frontMatter.title || frontMatter.Title || '';
}

function normalizeEventData(frontMatter, filePath) {
  return {
    date: extractDate(frontMatter, filePath),
    title: extractTitle(frontMatter),
    Registrations: frontMatter.Registrations,
    Participants: frontMatter.Participants,
    Viewers: frontMatter.Viewers
  };
}

function toCsvRow(frontMatter) {
  return FIELDS.map(field => csvEscape(frontMatter[field])).join(',');
}

function main() {
  if (process.argv.length > 3) {
    printUsageAndExit();
  }

  assertDirectoryExists(EVENTS_DIR, '_events directory');

  const outputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : DEFAULT_OUTPUT_PATH;

  const rows = collectEventFiles(EVENTS_DIR)
    .map(filePath => ({
      filePath,
      data: normalizeEventData(matter(fs.readFileSync(filePath, 'utf8')).data, filePath)
    }))
    .sort((left, right) => {
      const leftDate = String(left.data.date || '');
      const rightDate = String(right.data.date || '');
      if (leftDate === rightDate) {
        return left.filePath.localeCompare(right.filePath);
      }

      return leftDate.localeCompare(rightDate);
    })
    .map(event => toCsvRow(event.data));

  const csv = [FIELDS.join(','), ...rows].join('\n');
  fs.writeFileSync(outputPath, `${csv}\n`);

  console.error(`Extracted statistics for ${rows.length} events to ${outputPath}`);
}

main();