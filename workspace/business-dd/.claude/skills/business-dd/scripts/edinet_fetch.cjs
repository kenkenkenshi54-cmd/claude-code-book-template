// edinet_fetch.cjs — canonical, parameterized EDINET API v2 fetcher
// (promoted from per-deal forks; do NOT hardcode company constants here)
//
// Usage:
//   node edinet_fetch.cjs \
//     --sec 91640 [--edinet E37764] [--name "トライト"] \
//     --out ./edinet \
//     --doc "yuho_FY2023:120:2024-03-20:2024-04-10" \
//     --doc "yuho_FY2024:120:2025-03-20:2025-04-10" \
//     [--doc "hanki_FY2025H1:160:2025-08-01:2025-09-15"]
//
// Each --doc is  label:docTypeCodes:startDate:endDate
//   docTypeCodes : comma-separated (e.g. "120" or "010,030")
//   dates        : YYYY-MM-DD inclusive
// docTypeCode ref: 120=有報 130=訂正有報 140=四半期 160=半期 010/030=有価証券届出書(I部)
//
// For every matched filing it saves under <out>/<label>/ :
//   <label>.pdf            (type=2)
//   <label>_xbrl.zip       (type=1)
//   <label>_csv.zip        (type=5)  and unzips it -> <out>/<label>/XBRL_TO_CSV/
// and writes <out>/summary.json describing what was found / NOT FOUND.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const API_KEY = process.env.EDINET_API_KEY || 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';

function parseArgs() {
  const a = { docs: [] };
  for (let i = 2; i < process.argv.length; i++) {
    const k = process.argv[i];
    if (k === '--doc') a.docs.push(process.argv[++i]);
    else if (k.startsWith('--')) a[k.slice(2)] = process.argv[++i];
  }
  return a;
}

function eachDate(start, end) {
  const out = [];
  const d = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function listDocs(dateStr) {
  const url = `${BASE}/documents.json?date=${dateStr}&type=2&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dateStr}: HTTP ${res.status}`);
  return (await res.json()).results || [];
}

async function fetchDoc(docId, type, savePath) {
  const url = `${BASE}/documents/${docId}?type=${type}&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${docId} type=${type}: HTTP ${res.status}`);
  fs.writeFileSync(savePath, Buffer.from(await res.arrayBuffer()));
  return savePath;
}

// Pure-Node ZIP extractor (stored=0 / deflate=8) — no external dependency
function unzipTo(zipPath, destDir) {
  const buf = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('EOCD not found');
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('CDH bad');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    entries.push({ name, method, compSize, localOff });
    p += 46 + nameLen + extraLen + commentLen;
  }
  for (const e of entries) {
    if (buf.readUInt32LE(e.localOff) !== 0x04034b50) throw new Error('LFH bad');
    const nl = buf.readUInt16LE(e.localOff + 26);
    const xl = buf.readUInt16LE(e.localOff + 28);
    const dataOff = e.localOff + 30 + nl + xl;
    const data = buf.slice(dataOff, dataOff + e.compSize);
    let out;
    if (e.method === 0) out = data;
    else if (e.method === 8) out = zlib.inflateRawSync(data);
    else throw new Error('Unsupported zip method ' + e.method);
    const fp = path.join(destDir, e.name);
    if (e.name.endsWith('/')) { fs.mkdirSync(fp, { recursive: true }); }
    else { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, out); }
  }
  return entries.length;
}

(async () => {
  const args = parseArgs();
  if (!args.sec && !args.edinet && !args.name) {
    console.error('ERROR: at least one of --sec / --edinet / --name is required');
    process.exit(2);
  }
  if (!args.docs.length) { console.error('ERROR: at least one --doc is required'); process.exit(2); }
  const OUT = path.resolve(args.out || './edinet');
  fs.mkdirSync(OUT, { recursive: true });

  const summary = [];
  for (const spec of args.docs) {
    const [label, codesRaw, start, end] = spec.split(':');
    if (!label || !codesRaw || !start || !end) {
      console.error(`SKIP bad --doc spec: ${spec}`);
      summary.push({ label: spec, found: false, error: 'bad spec' });
      continue;
    }
    const codes = codesRaw.split(',');
    console.log(`\n=== ${label} (docType ${codesRaw}, ${start}..${end}) ===`);
    let hit = null;
    for (const dateStr of eachDate(start, end)) {
      let docs;
      try { docs = await listDocs(dateStr); }
      catch (e) { console.error(`  err ${dateStr}: ${e.message}`); continue; }
      for (const doc of docs) {
        const byCode = args.sec && doc.secCode === args.sec;
        const byEdinet = args.edinet && doc.edinetCode === args.edinet;
        const byName = args.name && (doc.filerName || '').includes(args.name);
        if ((byCode || byEdinet || byName) && codes.includes(doc.docTypeCode)) { hit = { dateStr, doc }; break; }
      }
      await new Promise(r => setTimeout(r, 120));
      if (hit) break;
    }
    if (!hit) {
      console.log(`  NOT FOUND — record as 不開示/未取得 (do NOT estimate)`);
      summary.push({ label, found: false });
      continue;
    }
    const { dateStr, doc } = hit;
    console.log(`  Found docID=${doc.docID} date=${dateStr} type=${doc.docTypeCode} filer=${doc.filerName}`);
    const dir = path.join(OUT, label);
    fs.mkdirSync(dir, { recursive: true });
    const rec = { label, found: true, docID: doc.docID, date: dateStr, docTypeCode: doc.docTypeCode, desc: doc.docDescription, filer: doc.filerName };
    for (const [type, ext] of [[2, '.pdf'], [1, '_xbrl.zip'], [5, '_csv.zip']]) {
      try { await fetchDoc(doc.docID, type, path.join(dir, label + ext)); console.log(`    saved ${label}${ext}`); }
      catch (e) { console.error(`    type=${type} err: ${e.message}`); rec['err_type' + type] = e.message; }
    }
    const csvZip = path.join(dir, label + '_csv.zip');
    if (fs.existsSync(csvZip)) {
      try { const n = unzipTo(csvZip, dir); console.log(`    unzipped CSV -> ${n} entries`); rec.csvDir = path.join(dir, 'XBRL_TO_CSV'); }
      catch (e) { console.error(`    unzip err: ${e.message}`); rec.unzipError = e.message; }
    }
    summary.push(rec);
    await new Promise(r => setTimeout(r, 400));
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== summary.json ===');
  console.log(JSON.stringify(summary, null, 2));
})();
