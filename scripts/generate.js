#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Speakers directory (relative to script location)
const SPEAKERS_DIR = path.join(__dirname, '..', '_speakers');

function printUsage() {
  console.error('Usage: node generate.js <template-file> <data-file.md> [output-file]');
  console.error('');
  console.error('Arguments:');
  console.error('  template-file  Template file with %placeholder% syntax');
  console.error('  data-file.md   Markdown file with front matter containing the data');
  console.error('  output-file    Optional: Output file path (defaults to stdout)');
  console.error('');
  console.error('Example:');
  console.error('  node generate.js templates/onsite_event.txt _events/2026-01-20.md');
  console.error('  node generate.js templates/onsite_event.txt _events/2026-01-20.md output.md');
  process.exit(1);
}

/**
 * Load all speakers from _speakers directory and index by name
 */
function loadAllSpeakers() {
  const speakers = {};
  const files = fs.readdirSync(SPEAKERS_DIR).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const filepath = path.join(SPEAKERS_DIR, file);
    const speakerFile = matter(fs.readFileSync(filepath, 'utf8'));
    const name = speakerFile.data.name;
    if (name) {
      speakers[name] = speakerFile.data;
    }
  }
  
  return speakers;
}

/**
 * Load speaker bio by name
 */
function loadSpeakerBio(speakerName, speakersIndex) {
  const speaker = speakersIndex[speakerName];
  
  if (!speaker) {
    console.error(`Warning: Speaker not found: ${speakerName}`);
    return null;
  }
  
  return speaker.bio ? speaker.bio.trim() : null;
}

/**
 * Build combined speakers bio section
 */
function buildSpeakersBio(speakers, speakersIndex) {
  if (!speakers || !Array.isArray(speakers) || speakers.length === 0) {
    return '';
  }
  
  const bios = speakers
    .map(speakerName => {
      const bio = loadSpeakerBio(speakerName, speakersIndex);
      if (bio) {
        return `About ${speakerName}:\n${bio}`;
      }
      return null;
    })
    .filter(Boolean);
  
  return bios.join('\n\n');
}

// Check arguments
if (process.argv.length < 4) {
  printUsage();
}

const templateFilePath = process.argv[2];
const dataFilePath = process.argv[3];
const outputFilePath = process.argv[4]; // Optional

// Check if files exist
if (!fs.existsSync(dataFilePath)) {
  console.error(`Error: Data file not found: ${dataFilePath}`);
  process.exit(1);
}

if (!fs.existsSync(templateFilePath)) {
  console.error(`Error: Template file not found: ${templateFilePath}`);
  process.exit(1);
}

// Read and parse the data file with front matter
const dataFile = matter(fs.readFileSync(dataFilePath, 'utf8'));
const data = dataFile.data;

// Also make the content available as %content%
data.content = dataFile.content.trim();

// Load speakers index and build speakers_bio from speakers array
if (data.speakers) {
  const speakersIndex = loadAllSpeakers();
  data.speakers_bio = buildSpeakersBio(data.speakers, speakersIndex);
}

// Read the template
let output = fs.readFileSync(templateFilePath, 'utf8');

// Replace all %placeholder% with values from front matter
for (const [key, value] of Object.entries(data)) {
  const placeholder = new RegExp(`%${key}%`, 'gi');
  output = output.replace(placeholder, value);
}

// Check for any remaining placeholders and warn
const remainingPlaceholders = output.match(/%\w+%/g);
if (remainingPlaceholders) {
  const unique = [...new Set(remainingPlaceholders)];
  console.error(`Warning: Unresolved placeholders: ${unique.join(', ')}`);
}

// Output the result
if (outputFilePath) {
  fs.writeFileSync(outputFilePath, output);
  console.error(`Generated: ${outputFilePath}`);
} else {
  console.log(output);
}
