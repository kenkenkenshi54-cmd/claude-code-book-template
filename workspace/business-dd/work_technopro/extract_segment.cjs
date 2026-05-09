// Extract segment, sales, customer, capex, etc. from EDINET CSVs
const fs = require('fs');
const path = require('path');

const FY = process.argv[2] || '2025';
const ROOT = path.join(__dirname, 'edinet', `csv_FY${FY}`, 'XBRL_TO_CSV');

function readUTF16(filePath) {
  const buf = fs.readFileSync(filePath);
  let start = 0;
  if (buf[0] === 0xFF && buf[1] === 0xFE) start = 2;
  return buf.slice(start).toString('utf16le');
}

function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

const files = fs.readdirSync(ROOT).filter(f => f.startsWith('jpcrp030000-asr'));
const csv = readUTF16(path.join(ROOT, files[0]));
const rows = csv.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));

const idIdx = 0, labelIdx = 1, ctxIdx = 2, periodIdx = 5, unitIdx = 7, valIdx = 8;

// what do we want? print all rows where label includes any of:
const keywords = process.argv.slice(3);
if (keywords.length === 0) {
  // print all element IDs and labels distinct
  const seen = new Set();
  for (const r of rows) {
    const k = r[idIdx];
    if (seen.has(k)) continue;
    seen.add(k);
    if (/segment|Segment|セグメント|販売先|大株主|設備|主要な経営|major|Major|customer|Customer/i.test(r[idIdx] + r[labelIdx])) {
      console.log(`${r[idIdx]} | ${r[labelIdx]}`);
    }
  }
} else {
  for (const r of rows) {
    if (keywords.some(kw => r[idIdx].includes(kw) || r[labelIdx].includes(kw))) {
      console.log(`${r[idIdx]} | ${r[labelIdx]} | ${r[ctxIdx]} | ${r[unitIdx]} | ${r[valIdx]}`);
    }
  }
}
