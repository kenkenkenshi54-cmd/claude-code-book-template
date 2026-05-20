// List distinct element IDs from EDINET CSV (filtered)
const fs = require('fs');
const path = require('path');

const FILED = process.argv[2] || '2025';
const FILTER = process.argv[3] || '';
const ROOT = path.join(__dirname, 'edinet', `csv_filed${FILED}`, 'XBRL_TO_CSV');

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

const re = new RegExp(FILTER, 'i');
const seen = new Set();
for (const r of rows) {
  const id = r[0]; const lbl = r[1];
  const key = `${id}\t${lbl}`;
  if (seen.has(key)) continue;
  if (FILTER && !(re.test(id) || re.test(lbl))) continue;
  seen.add(key);
  console.log(`${id} | ${lbl}`);
}
