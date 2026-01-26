#!/usr/bin/env node

const fs = require('fs');
const matter = require('gray-matter');

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
