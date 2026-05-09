// Extract one TextBlock value from a yuho CSV (UTF-16 LE)
const fs = require('fs');
const path = require('path');

const FY = process.argv[2];
const ELEM = process.argv[3];
const ROOT = path.join(__dirname, 'edinet', `csv_FY${FY}`, 'XBRL_TO_CSV');

function readUTF16(p) {
  const buf = fs.readFileSync(p);
  let s = 0; if (buf[0] === 0xFF && buf[1] === 0xFE) s = 2;
  return buf.slice(s).toString('utf16le');
}
function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

const files = fs.readdirSync(ROOT).filter(f => f.startsWith('jpcrp030000-asr'));
const text = readUTF16(path.join(ROOT, files[0]));
const rows = text.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));

for (const r of rows) {
  if (r[0] === ELEM) {
    let v = r[8] || '';
    v = v.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(v);
    break;
  }
}
