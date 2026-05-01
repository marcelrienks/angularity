#!/usr/bin/env node

/**
 * generate-dummy-data.mjs — Command-line tool to generate synthetic alignment data
 * 
 * Uses dummy-data-generator.js core algorithm to produce CSV output.
 * Usage: node js/generate-dummy-data.mjs > sample.csv
 */

import { BOLT_POSITIONS, generateCSVRows } from './dummy-data-generator.js';

// Generate CSV header
console.log('front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20');

// Generate all rows for Front Left wheel
const rows = generateCSVRows('FL');
for (const row of rows) {
  console.log(
    `${row.frontBolt},${row.rearBolt},${row.camberNeg20.toFixed(2)},${row.camber0.toFixed(2)},${row.camberPos20.toFixed(2)}`
  );
}
