#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const voices = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'voices.json'), 'utf8')
);

let errors = 0;
const titlesSeen = new Set();
const descsSeen = new Set();

for (const v of voices) {
  // seoTitleEn present
  if (!v.seoTitleEn) {
    console.error(`MISSING seoTitleEn: ${v.id}`);
    errors++;
  } else {
    // length ≤ 60
    if (v.seoTitleEn.length > 60) {
      console.error(`seoTitleEn TOO LONG (${v.seoTitleEn.length}): ${v.id} → "${v.seoTitleEn}"`);
      errors++;
    }
    // no duplicates
    if (titlesSeen.has(v.seoTitleEn)) {
      console.error(`DUPLICATE seoTitleEn: ${v.id} → "${v.seoTitleEn}"`);
      errors++;
    }
    titlesSeen.add(v.seoTitleEn);
  }

  // seoDescriptionEn present
  if (!v.seoDescriptionEn) {
    console.error(`MISSING seoDescriptionEn: ${v.id}`);
    errors++;
  } else {
    // length 120-160
    if (v.seoDescriptionEn.length < 120) {
      console.error(`seoDescriptionEn TOO SHORT (${v.seoDescriptionEn.length}): ${v.id}`);
      errors++;
    }
    if (v.seoDescriptionEn.length > 160) {
      console.error(`seoDescriptionEn TOO LONG (${v.seoDescriptionEn.length}): ${v.id}`);
      errors++;
    }
    // no duplicates
    if (descsSeen.has(v.seoDescriptionEn)) {
      console.error(`DUPLICATE seoDescriptionEn: ${v.id}`);
      errors++;
    }
    descsSeen.add(v.seoDescriptionEn);
  }
}

if (errors === 0) {
  console.log(`✓ validate-seo-en: all ${voices.length} records OK`);
} else {
  console.error(`✗ validate-seo-en: ${errors} error(s) found`);
  process.exit(1);
}
