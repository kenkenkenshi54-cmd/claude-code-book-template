// edinet_grep.cjs — canonical EDINET CSV grep (promoted from extract_segment.cjs)
//
// Usage:
//   node edinet_grep.cjs <csvDir> [keyword ...]
//
//   <csvDir>  : a folder containing jpcrp030000-asr*.csv  (or its parent;
//               an XBRL_TO_CSV subfolder is auto-detected)
//   keyword.. : substrings matched against elementId OR label.
//               With keywords  -> prints  id | label | context | unit | value
//               No keywords    -> lists distinct segment/customer/shareholder/
//                                 capex-ish elements (discovery mode)
//
// EDINET CSV is UTF-16LE, TAB-separated. Columns: id=0 label=1 context=2 unit=7 value=8

const fs = require('fs');
const path = require('path');

function resolveCsvDir(d) {
  let dir = path.resolve(d);
  if (fs.existsSync(path.join(dir, 'XBRL_TO_CSV'))) dir = path.join(dir, 'XBRL_TO_CSV');
  if (!fs.existsSync(dir)) { console.error(`ERROR: csvDir not found: ${dir}`); process.exit(2); }
  return dir;
}
function readUTF16(p) {
  const buf = fs.readFileSync(p);
  const s = (buf[0] === 0xFF && buf[1] === 0xFE) ? 2 : 0;
  return buf.slice(s).toString('utf16le');
}
const unq = s => (s || '').replace(/^"|"$/g, '');

const dir = resolveCsvDir(process.argv[2] || '.');
const keywords = process.argv.slice(3);
const files = fs.readdirSync(dir).filter(f => f.startsWith('jpcrp030000-asr') && f.endsWith('.csv'));
if (!files.length) { console.error(`ERROR: no jpcrp030000-asr*.csv in ${dir}`); process.exit(2); }

const rows = [];
for (const f of files) {
  for (const line of readUTF16(path.join(dir, f)).split(/\r?\n/)) {
    if (line.length) rows.push(line.split('\t').map(unq));
  }
}

if (keywords.length === 0) {
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r[0])) continue;
    seen.add(r[0]);
    if (/segment|セグメント|販売先|大株主|MajorShareholders|設備|CapitalExpenditure|Depreciation|customer|Customer|Revenue|売上|営業利益|OperatingProfit/i.test(r[0] + r[1])) {
      console.log(`${r[0]} | ${r[1]}`);
    }
  }
} else {
  for (const r of rows) {
    if (keywords.some(kw => (r[0] || '').includes(kw) || (r[1] || '').includes(kw))) {
      console.log(`${r[0]} | ${r[1]} | ${r[2]} | ${r[7]} | ${r[8]}`);
    }
  }
}
