// Fetch Trite (TRYT) (9164, secCode "91640") yuho / I-bu / hanki via EDINET API v2
// FY end is December
//   第6期 yuho: filed 2024-03-28 (FY2023/01-12)
//   第7期 yuho: filed 2025-03-28 (FY2024/01-12)
//   I部 (有価証券届出書): filed around 2023-06-19 (IPO)
//   半期報告書: filed 2025-08-08 (第8期上半期)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const API_KEY = process.env.EDINET_API_KEY || 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';
const SEC_CODE = '91640';
const EDINET_CODE = 'E37764';
const OUT = path.join(__dirname, 'edinet');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function listDocs(dateStr) {
  const url = `${BASE}/documents.json?date=${dateStr}&type=2&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dateStr}: HTTP ${res.status}`);
  const j = await res.json();
  return j.results || [];
}

async function scanForDoc(scanRanges, docTypeCodes) {
  // scanRanges: array of [year, month, dayStart, dayEnd]
  // docTypeCodes: array of acceptable docTypeCode strings
  const hits = [];
  for (const [yy, m, ds, de] of scanRanges) {
    for (let d = ds; d <= de; d++) {
      const dateStr = `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      try {
        const docs = await listDocs(dateStr);
        for (const doc of docs) {
          const matchCode = (doc.secCode === SEC_CODE) || (doc.edinetCode === EDINET_CODE);
          const matchName = (doc.filerName || '').includes('トライト') || (doc.filerName || '').includes('TRYT');
          if ((matchCode || matchName) && docTypeCodes.includes(doc.docTypeCode)) {
            hits.push({ dateStr, doc });
          }
        }
      } catch (e) {
        console.error(`  err ${dateStr}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 120));
    }
  }
  return hits;
}

// Pure-Node ZIP extractor (supports stored=0 and deflate=8)
function unzipTo(zipPath, destDir) {
  const buf = fs.readFileSync(zipPath);
  let eocdOff = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOff = i; break; }
  }
  if (eocdOff < 0) throw new Error('EOCD not found');
  const totalEntries = buf.readUInt16LE(eocdOff + 10);
  const cdOff = buf.readUInt32LE(eocdOff + 16);
  let p = cdOff;
  const entries = [];
  for (let i = 0; i < totalEntries; i++) {
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
    const nameLen = buf.readUInt16LE(e.localOff + 26);
    const extraLen = buf.readUInt16LE(e.localOff + 28);
    const dataOff = e.localOff + 30 + nameLen + extraLen;
    const data = buf.slice(dataOff, dataOff + e.compSize);
    let out;
    if (e.method === 0) out = data;
    else if (e.method === 8) out = zlib.inflateRawSync(data);
    else throw new Error('Unsupported method ' + e.method);
    const fp = path.join(destDir, e.name);
    if (e.name.endsWith('/')) {
      fs.mkdirSync(fp, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, out);
    }
  }
  return entries.length;
}

async function fetchDoc(docId, type, savePath) {
  const url = `${BASE}/documents/${docId}?type=${type}&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${docId} type=${type}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(savePath, buf);
  return savePath;
}

(async () => {
  const targets = [
    {
      label: 'yuho_6th_FY2023',
      docTypeCodes: ['120'],
      ranges: [[2024, 3, 20, 31], [2024, 4, 1, 10]],
    },
    {
      label: 'yuho_7th_FY2024',
      docTypeCodes: ['120'],
      ranges: [[2025, 3, 20, 31], [2025, 4, 1, 10]],
    },
    {
      label: 'ibu_IPO_2023',
      docTypeCodes: ['010', '030'], // I部=有価証券届出書、030=訂正届出書も拾う
      ranges: [[2023, 5, 1, 31], [2023, 6, 1, 30], [2023, 7, 1, 15]],
    },
    {
      label: 'hanki_8th_H1',
      docTypeCodes: ['160'],
      ranges: [[2025, 8, 1, 31], [2025, 9, 1, 15]],
    },
  ];
  const summary = [];
  for (const t of targets) {
    console.log(`\n=== ${t.label} ===`);
    const hits = await scanForDoc(t.ranges, t.docTypeCodes);
    if (!hits.length) {
      console.log(`  NOT FOUND for ${t.label}`);
      summary.push({ label: t.label, found: false });
      continue;
    }
    for (const { dateStr, doc } of hits) {
      console.log(`  Found: docID=${doc.docID}, date=${dateStr}, type=${doc.docTypeCode}, desc=${doc.docDescription}, filer=${doc.filerName}`);
      const tag = `${t.label}_${dateStr}_${doc.docID}`;
      try {
        await fetchDoc(doc.docID, 2, path.join(OUT, `${tag}.pdf`));
        console.log(`    Saved PDF`);
      } catch (e) {
        console.error(`    PDF err: ${e.message}`);
      }
      try {
        await fetchDoc(doc.docID, 1, path.join(OUT, `${tag}_xbrl.zip`));
        console.log(`    Saved XBRL ZIP (type=1)`);
      } catch (e) {
        console.error(`    XBRL err: ${e.message}`);
      }
      try {
        await fetchDoc(doc.docID, 5, path.join(OUT, `${tag}_csv.zip`));
        console.log(`    Saved CSV ZIP (type=5)`);
      } catch (e) {
        console.error(`    CSV err: ${e.message}`);
      }
      summary.push({
        label: t.label,
        found: true,
        docID: doc.docID,
        date: dateStr,
        docTypeCode: doc.docTypeCode,
        desc: doc.docDescription,
        filer: doc.filerName,
      });
      await new Promise(r => setTimeout(r, 500));
    }
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(summary, null, 2));

  // Unzip every *_csv.zip in OUT
  console.log('\n=== Unzipping CSV ZIPs ===');
  const zips = fs.readdirSync(OUT).filter(f => f.endsWith('_csv.zip'));
  for (const z of zips) {
    const src = path.join(OUT, z);
    const dst = path.join(OUT, z.replace(/\.zip$/, ''));
    if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
    fs.mkdirSync(dst, { recursive: true });
    try {
      const n = unzipTo(src, dst);
      console.log(`  OK ${z} -> ${n} entries`);
      const xtocsv = path.join(dst, 'XBRL_TO_CSV');
      if (fs.existsSync(xtocsv)) {
        for (const f of fs.readdirSync(xtocsv)) console.log(`    ${f}`);
      }
    } catch (e) {
      console.error(`  ERR ${z}: ${e.message}`);
    }
  }
})();
