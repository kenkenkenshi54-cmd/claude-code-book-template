// Probe Omron yuho XBRL CSVs
const fs = require('fs');
const path = require('path');

const FY = process.argv[2] || '2025';
const ROOT = path.join(__dirname, 'edinet', `csv_FY${FY}`, 'XBRL_TO_CSV');
const filterRe = process.argv[3] ? new RegExp(process.argv[3], 'i') : null;
const showVals = process.argv[4] === 'val';

function readUTF16(p) {
  const buf = fs.readFileSync(p);
  let s = 0; if (buf[0] === 0xFF && buf[1] === 0xFE) s = 2;
  return buf.slice(s).toString('utf16le');
}
function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

const files = fs.readdirSync(ROOT).filter(f => f.startsWith('jpcrp030000-asr'));
const text = readUTF16(path.join(ROOT, files[0]));
const rows = text.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));

const seen = new Set();
for (const r of rows) {
  const id = r[0], lbl = r[1];
  if (!id) continue;
  if (filterRe && !filterRe.test(id) && !filterRe.test(lbl)) continue;
  if (showVals) {
    console.log(`${id} | ${lbl} | ctx=${r[2]} | unit=${r[7]} | val=${r[8]}`);
  } else {
    if (seen.has(id)) continue;
    seen.add(id);
    console.log(`${id} | ${lbl}`);
  }
}
