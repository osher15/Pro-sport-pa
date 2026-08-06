#!/usr/bin/env node
/**
 * Regenerates data/characters.fallback.js from data/characters.json.
 *
 * The JSON is the source of truth. The fallback exists only so the prototype
 * still boots when opened straight from disk (file:// blocks fetch).
 *
 *   node tools/sync-fallback.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'data', 'characters.json');
const out = path.join(root, 'data', 'characters.fallback.js');

const data = JSON.parse(fs.readFileSync(src, 'utf8'));

const banner = [
  '/**',
  ' * Offline fallback copy of data/characters.json.',
  ' *',
  ' * GENERATED FILE — do not edit by hand.',
  ' * Run `node tools/sync-fallback.js` after changing characters.json.',
  ' */'
].join('\n');

fs.writeFileSync(
  out,
  banner + '\nwindow.BRAWLZ_CHARACTERS_FALLBACK = ' + JSON.stringify(data, null, 2) + ';\n',
  'utf8'
);

console.log('wrote ' + path.relative(root, out) + ' (' + data.characters.length + ' characters)');
