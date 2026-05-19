// edinet_textblock.cjs — canonical EDINET TextBlock extractor
// (promoted from extract_textblock.cjs)
//
// Usage:
//   node edinet_textblock.cjs <csvDir> <elementId>
//
//   <csvDir>    : folder with jpcrp030000-asr*.csv (XBRL_TO_CSV auto-detected)
//   <elementId> : e.g. jpcrp_cor:DescriptionOfBusinessTextBlock
//
// Prints the element's HTML-stripped, whitespace-collapsed text.

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
const elem = process.argv[3];
if (!elem) { console.error('ERROR: <elementId> required'); process.exit(2); }

const files = fs.readdirSync(dir).filter(f => f.startsWith('jpcrp030000-asr') && f.endsWith('.csv'));
if (!files.length) { console.error(`ERROR: no jpcrp030000-asr*.csv in ${dir}`); process.exit(2); }

for (const f of files) {
  for (const line of readUTF16(path.join(dir, f)).split(/\r?\n/)) {
    if (!line.length) continue;
    const r = line.split('\t').map(unq);
    if (r[0] === elem) {
      const v = (r[8] || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(v);
      process.exit(0);
    }
  }
}
console.error(`NOT FOUND: ${elem} — record as 不開示 (do NOT estimate)`);
process.exit(1);
