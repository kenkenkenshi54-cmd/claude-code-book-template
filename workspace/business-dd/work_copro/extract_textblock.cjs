// Dump a particular text-block by element ID
const fs = require('fs');
const path = require('path');

const LABEL = process.argv[2] || 'yuho_FY2025_Mar';
const ELEMID = process.argv[3] || 'DescriptionOfBusinessTextBlock';
const ROOT = path.join(__dirname, 'edinet', `csv_${LABEL}`, 'XBRL_TO_CSV');

function readUTF16(filePath) {
  const buf = fs.readFileSync(filePath);
  let start = 0;
  if (buf[0] === 0xFF && buf[1] === 0xFE) start = 2;
  return buf.slice(start).toString('utf16le');
}
function unq(s) { return (s || '').replace(/^"|"$/g, ''); }
function stripHtml(s) { return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' '); }

const files = fs.readdirSync(ROOT).filter(f => f.startsWith('jpcrp030000-asr'));
const csv = readUTF16(path.join(ROOT, files[0]));
const rows = csv.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));

for (const r of rows) {
  if ((r[0] || '').endsWith(':' + ELEMID) || (r[0] || '').endsWith(ELEMID)) {
    console.log(`# ${r[0]} | ${r[1]} | ${r[2]}`);
    const v = r[8] || '';
    if (v.includes('<')) {
      console.log(stripHtml(v));
    } else {
      console.log(v);
    }
    console.log('---');
  }
}
