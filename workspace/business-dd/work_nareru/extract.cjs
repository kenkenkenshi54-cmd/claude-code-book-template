// Extract data from Nareru EDINET CSVs
const fs = require('fs');
const path = require('path');

const ROOTS = {
  FY2023: 'edinet/120_2024-01-30_S100SOLW/XBRL_TO_CSV',
  FY2024: 'edinet/120_2025-01-30_S100V4E1/XBRL_TO_CSV',
  FY2025: 'edinet/120_2026-01-28_S100XGYG/XBRL_TO_CSV',
};

function readUTF16(filePath) {
  const buf = fs.readFileSync(filePath);
  let start = 0;
  if (buf[0] === 0xFF && buf[1] === 0xFE) start = 2;
  return buf.slice(start).toString('utf16le');
}

function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

function loadAsr(fy) {
  const dir = path.join(__dirname, ROOTS[fy]);
  const files = fs.readdirSync(dir).filter(f => f.startsWith('jpcrp030000-asr'));
  const csv = readUTF16(path.join(dir, files[0]));
  const rows = csv.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));
  return rows;
}

const cmd = process.argv[2];
const fy = process.argv[3] || 'FY2025';
const rows = loadAsr(fy);
const header = rows[0];
console.error('Header:', header.join(' | '));

if (cmd === 'list') {
  // print unique element IDs matching keywords
  const kws = process.argv.slice(4);
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r[0])) continue;
    seen.add(r[0]);
    const txt = r[0] + ' ' + r[1];
    if (kws.length === 0 || kws.some(kw => txt.includes(kw))) {
      console.log(`${r[0]} | ${r[1]}`);
    }
  }
} else if (cmd === 'dump') {
  const kws = process.argv.slice(4);
  for (const r of rows) {
    const txt = r[0] + ' ' + r[1];
    if (kws.some(kw => txt.includes(kw))) {
      console.log(r.slice(0, 9).join(' | '));
    }
  }
} else if (cmd === 'text') {
  // dump narrative TextBlock content
  const id = process.argv[4];
  for (const r of rows) {
    if (r[0] === id) {
      console.log('--- ' + r[0] + ' ---');
      console.log(r[8]);
      console.log('--- end ---');
    }
  }
} else {
  console.log('Usage: node extract.cjs list|dump|text FY... keywords');
}
