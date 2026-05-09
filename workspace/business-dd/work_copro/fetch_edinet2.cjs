// Copro HD (7059) — fetch FY2024 & FY2025 yuho (March end → June filing)
const fs = require('fs');
const path = require('path');

const API_KEY = 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';
const SEC_CODE = '70590';
const OUT = path.join(__dirname, 'edinet');

async function listDocs(dateStr) {
  const url = `${BASE}/documents.json?date=${dateStr}&type=2&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dateStr}: HTTP ${res.status}`);
  const j = await res.json();
  return j.results || [];
}

async function scanForYuho(yy, ranges) {
  for (const [m, ds, de] of ranges) {
    for (let d = ds; d <= de; d++) {
      const dateStr = `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      try {
        const docs = await listDocs(dateStr);
        for (const doc of docs) {
          if (doc.secCode === SEC_CODE && doc.docTypeCode === '120') return { dateStr, doc };
        }
      } catch (e) {
        console.error(`  err ${dateStr}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 130));
    }
  }
  return null;
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
    { label: 'FY2024_Mar', year: 2024, ranges: [[5, 15, 31], [6, 1, 30], [7, 1, 15]] },
    { label: 'FY2025_Mar', year: 2025, ranges: [[5, 15, 31], [6, 1, 30], [7, 1, 15]] },
  ];
  const summary = [];
  for (const t of targets) {
    console.log(`\n=== ${t.label} ===`);
    const found = await scanForYuho(t.year, t.ranges);
    if (!found) {
      console.log(`  NOT FOUND for ${t.label}`);
      summary.push({ label: t.label, found: false });
      continue;
    }
    const { dateStr, doc } = found;
    console.log(`  Found: docID=${doc.docID}, date=${dateStr}, desc=${doc.docDescription}`);
    try {
      await fetchDoc(doc.docID, 2, path.join(OUT, `yuho_${t.label}.pdf`));
      console.log(`  Saved PDF`);
    } catch (e) {
      console.error(`  PDF err: ${e.message}`);
    }
    try {
      await fetchDoc(doc.docID, 5, path.join(OUT, `yuho_${t.label}.zip`));
      console.log(`  Saved CSV ZIP`);
    } catch (e) {
      console.error(`  ZIP err: ${e.message}`);
    }
    summary.push({ label: t.label, found: true, docID: doc.docID, date: dateStr, desc: doc.docDescription });
    await new Promise(r => setTimeout(r, 600));
  }
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(summary, null, 2));
})();
