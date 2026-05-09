// Pre-2020 (FY2016-FY2020) yuho/I-bu fetcher for 4 companies + Nareru I-bu
// Mirrors patterns from work_trite/fetch_edinet.cjs and work_technopro/fetch_edinet.cjs.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const API_KEY = process.env.EDINET_API_KEY || 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';

const ROOT = path.resolve(__dirname, '..');

async function listDocs(dateStr) {
  const url = `${BASE}/documents.json?date=${dateStr}&type=2&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dateStr}: HTTP ${res.status}`);
  const j = await res.json();
  return j.results || [];
}

async function fetchDoc(docId, type, savePath) {
  const url = `${BASE}/documents/${docId}?type=${type}&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${docId} type=${type}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(savePath, buf);
  return savePath;
}

// Pure-Node ZIP extractor
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
    if (e.name.endsWith('/')) fs.mkdirSync(fp, { recursive: true });
    else { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, out); }
  }
  return entries.length;
}

async function findDocByEdinetCode(scanRanges, edinetCode, secCode, docTypeCodes) {
  for (const [yy, m, ds, de] of scanRanges) {
    for (let d = ds; d <= de; d++) {
      const dateStr = `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      try {
        const docs = await listDocs(dateStr);
        for (const doc of docs) {
          const matchEdinet = edinetCode && doc.edinetCode === edinetCode;
          const matchSec = secCode && doc.secCode === secCode;
          if ((matchEdinet || matchSec) && docTypeCodes.includes(doc.docTypeCode)) {
            return { dateStr, doc };
          }
        }
      } catch (e) {
        console.error(`  err ${dateStr}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 120));
    }
  }
  return null;
}

const COMPANIES = [
  {
    name: 'technopro',
    outDir: path.join(ROOT, 'work_technopro', 'edinet'),
    edinetCode: 'E31030',
    secCode: '60280',
    fyConfigs: [
      { fy: 2016, label: 'FY2016', ranges: [[2016, 9, 1, 30], [2016, 10, 1, 15]] },
      { fy: 2017, label: 'FY2017', ranges: [[2017, 9, 1, 30], [2017, 10, 1, 15]] },
      { fy: 2018, label: 'FY2018', ranges: [[2018, 9, 1, 30], [2018, 10, 1, 15]] },
      { fy: 2019, label: 'FY2019', ranges: [[2019, 9, 1, 30], [2019, 10, 1, 15]] },
      { fy: 2020, label: 'FY2020', ranges: [[2020, 9, 1, 30], [2020, 10, 1, 15]] },
    ],
    docTypeCodes: ['120'],
  },
  {
    name: 'openup',
    outDir: path.join(ROOT, 'work_open_up_group', 'edinet'),
    edinetCode: 'E05695',
    // FY end Jun (legacy Yume-shin HD); old secCode might differ. Search by edinetCode only.
    secCode: null,
    fyConfigs: [
      { fy: 2016, label: 'FY2016', ranges: [[2016, 9, 1, 30], [2016, 10, 1, 15]] },
      { fy: 2017, label: 'FY2017', ranges: [[2017, 9, 1, 30], [2017, 10, 1, 15]] },
      { fy: 2018, label: 'FY2018', ranges: [[2018, 9, 1, 30], [2018, 10, 1, 15]] },
      { fy: 2019, label: 'FY2019', ranges: [[2019, 9, 1, 30], [2019, 10, 1, 15]] },
      { fy: 2020, label: 'FY2020', ranges: [[2020, 9, 1, 30], [2020, 10, 1, 15]] },
    ],
    docTypeCodes: ['120'],
  },
  {
    name: 'copro',
    outDir: path.join(ROOT, 'work_copro', 'edinet'),
    edinetCode: 'E34699',
    secCode: '70590',
    fyConfigs: [
      { fy: 2018, label: 'FY2018_Mar', ranges: [[2018, 5, 15, 31], [2018, 6, 1, 30], [2018, 7, 1, 15]] },
      { fy: 2019, label: 'FY2019_Mar', ranges: [[2019, 5, 15, 31], [2019, 6, 1, 30], [2019, 7, 1, 15]] },
      { fy: 2020, label: 'FY2020_Mar', ranges: [[2020, 5, 15, 31], [2020, 6, 1, 30], [2020, 7, 1, 15]] },
    ],
    docTypeCodes: ['120'],
  },
  {
    name: 'nareru',
    outDir: path.join(ROOT, 'work_nareru', 'edinet'),
    edinetCode: 'E38728',
    secCode: '91630',
    // I-bu (yu-ken) docID known: S100QZAG (2023-06-19)
    explicitDocs: [
      { label: 'ibu_IPO_2023', docID: 'S100QZAG', date: '2023-06-19', docTypeCode: '010' },
    ],
    fyConfigs: [],
  },
];

(async () => {
  const allSummary = {};
  for (const co of COMPANIES) {
    if (!fs.existsSync(co.outDir)) fs.mkdirSync(co.outDir, { recursive: true });
    console.log(`\n############ ${co.name} ############`);
    const summary = [];

    // explicit docs (Nareru)
    if (co.explicitDocs) {
      for (const ed of co.explicitDocs) {
        console.log(`\n=== ${co.name} ${ed.label} (docID=${ed.docID}) ===`);
        const tag = `${ed.label}_${ed.date}_${ed.docID}`;
        const pdfPath = path.join(co.outDir, `${tag}.pdf`);
        const xbrlPath = path.join(co.outDir, `${tag}_xbrl.zip`);
        const csvPath = path.join(co.outDir, `${tag}_csv.zip`);
        try { await fetchDoc(ed.docID, 2, pdfPath); console.log('  Saved PDF'); }
        catch (e) { console.error(`  PDF err: ${e.message}`); }
        try { await fetchDoc(ed.docID, 1, xbrlPath); console.log('  Saved XBRL ZIP'); }
        catch (e) { console.error(`  XBRL err: ${e.message}`); }
        try { await fetchDoc(ed.docID, 5, csvPath); console.log('  Saved CSV ZIP'); }
        catch (e) { console.error(`  CSV err: ${e.message}`); }
        summary.push({ label: ed.label, found: true, docID: ed.docID, date: ed.date, docTypeCode: ed.docTypeCode });
        await new Promise(r => setTimeout(r, 600));
      }
    }

    // fyConfigs
    for (const fc of co.fyConfigs) {
      console.log(`\n=== ${co.name} ${fc.label} ===`);
      const found = await findDocByEdinetCode(fc.ranges, co.edinetCode, co.secCode, co.docTypeCodes);
      if (!found) {
        console.log(`  NOT FOUND for ${fc.label}`);
        summary.push({ label: fc.label, found: false });
        continue;
      }
      const { dateStr, doc } = found;
      console.log(`  Found: docID=${doc.docID}, date=${dateStr}, type=${doc.docTypeCode}, desc=${doc.docDescription}, filer=${doc.filerName}`);
      const pdfPath = path.join(co.outDir, `yuho_${fc.label}.pdf`);
      const csvPath = path.join(co.outDir, `yuho_${fc.label}.zip`);
      try { await fetchDoc(doc.docID, 2, pdfPath); console.log('  Saved PDF'); }
      catch (e) { console.error(`  PDF err: ${e.message}`); }
      try { await fetchDoc(doc.docID, 5, csvPath); console.log('  Saved CSV ZIP'); }
      catch (e) { console.error(`  ZIP err: ${e.message}`); }
      summary.push({ label: fc.label, found: true, docID: doc.docID, date: dateStr, docTypeCode: doc.docTypeCode, desc: doc.docDescription, filer: doc.filerName });
      await new Promise(r => setTimeout(r, 600));
    }

    // unzip CSVs to a sibling directory mirroring existing convention
    console.log(`\n--- unzipping ${co.name} CSV zips ---`);
    for (const f of fs.readdirSync(co.outDir)) {
      if (!f.endsWith('.zip') && !f.endsWith('_csv.zip')) continue;
      // Decide target name
      let dst;
      if (f.endsWith('_csv.zip')) {
        dst = path.join(co.outDir, f.replace(/\.zip$/, ''));
      } else if (f.startsWith('yuho_FY') && f.endsWith('.zip')) {
        const lbl = f.replace(/^yuho_/, '').replace(/\.zip$/, '');
        dst = path.join(co.outDir, `csv_yuho_${lbl}`);
      } else continue;
      if (fs.existsSync(dst)) continue; // skip if previously extracted
      try {
        fs.mkdirSync(dst, { recursive: true });
        const n = unzipTo(path.join(co.outDir, f), dst);
        console.log(`  OK ${f} -> ${n} entries`);
      } catch (e) {
        console.error(`  ERR ${f}: ${e.message}`);
      }
    }

    fs.writeFileSync(path.join(co.outDir, 'summary_pre2020.json'), JSON.stringify(summary, null, 2));
    allSummary[co.name] = summary;
  }
  fs.writeFileSync(path.join(__dirname, 'fetch_pre2020_summary.json'), JSON.stringify(allSummary, null, 2));
  console.log('\n=== ALL DONE ===');
  console.log(JSON.stringify(allSummary, null, 2));
})();
