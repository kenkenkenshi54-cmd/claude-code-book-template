// Extract from Ebara EDINET CSVs
const fs = require('fs');
const path = require('path');

const cmd = process.argv[2]; // text | dump | list | search
const fy = process.argv[3];  // FY2025_Dec etc.
const args = process.argv.slice(4);

const ROOT = path.join('c:/Users/Kamei.Kenshi/Documents/dev/claude-code-book-template/workspace/business-dd/work_ebara/edinet', `csv_${fy}`, 'XBRL_TO_CSV');

function readUTF16(filePath) {
  const buf = fs.readFileSync(filePath);
  let start = 0;
  if (buf[0] === 0xFF && buf[1] === 0xFE) start = 2;
  return buf.slice(start).toString('utf16le');
}

function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

function loadRows() {
  const files = fs.readdirSync(ROOT).filter(f => f.startsWith('jpcrp030000-asr'));
  const csv = readUTF16(path.join(ROOT, files[0]));
  const rows = csv.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));
  return rows;
}

const rows = loadRows();
const idIdx = 0, labelIdx = 1, ctxIdx = 2, periodIdx = 5, unitIdx = 7, valIdx = 8;

if (cmd === 'list') {
  // list distinct ids matching keywords
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r[idIdx])) continue;
    seen.add(r[idIdx]);
    if (args.length === 0 || args.some(kw => (r[idIdx]||'').toLowerCase().includes(kw.toLowerCase()) || (r[labelIdx]||'').includes(kw))) {
      console.log(`${r[idIdx]} | ${r[labelIdx]}`);
    }
  }
} else if (cmd === 'search') {
  // print rows where id or label matches any kw
  for (const r of rows) {
    if (args.some(kw => (r[idIdx]||'').toLowerCase().includes(kw.toLowerCase()) || (r[labelIdx]||'').includes(kw))) {
      console.log(`${r[idIdx]} | ${r[labelIdx]} | ${r[ctxIdx]} | ${r[unitIdx]} | ${r[valIdx]}`);
    }
  }
} else if (cmd === 'dump') {
  // dump exact element id rows
  for (const r of rows) {
    if (args.includes(r[idIdx])) {
      console.log(`${r[idIdx]} | ${r[labelIdx]} | ${r[ctxIdx]} | ${r[unitIdx]} | ${r[valIdx]}`);
    }
  }
} else if (cmd === 'text') {
  const id = args[0];
  for (const r of rows) {
    if (r[idIdx] === id) {
      const txt = r[valIdx] || '';
      console.log(txt.replace(/<[^>]+>/g, ''));
    }
  }
}
