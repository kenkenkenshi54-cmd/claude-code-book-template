// Fetch Sumitomo Corporation (8053, secCode "80530") yuho for FY2020-FY2024 (filed 2021-2025) via EDINET API v2
const fs = require('fs');
const path = require('path');

const API_KEY = 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';
const SEC_CODE = '80530';
const OUT = path.join(__dirname, 'edinet');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function listDocs(dateStr) {
  const url = `${BASE}/documents.json?date=${dateStr}&type=2&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dateStr}: HTTP ${res.status}`);
  const j = await res.json();
  return j.results || [];
}

async function findYuho(year) {
  // Sumitomo Corp is March-end fiscal; yuho filed mid-to-late June
  const months = [
    [6, 15, 30],
    [7, 1, 10],
  ];
  for (const [m, ds, de] of months) {
    for (let d = ds; d <= de; d++) {
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      try {
        const docs = await listDocs(dateStr);
        for (const doc of docs) {
          if (doc.secCode === SEC_CODE && doc.docTypeCode === '120') {
            return { dateStr, doc };
          }
        }
      } catch (e) {
        console.error(`  err ${dateStr}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 200));
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
  const summary = [];
  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    console.log(`\n=== Searching yuho filed in ${year} ===`);
    const found = await findYuho(year);
    if (!found) {
      console.log(`  NOT FOUND filed in ${year}`);
      summary.push({ filing_year: year, found: false });
      continue;
    }
    const { dateStr, doc } = found;
    console.log(`  Found: docID=${doc.docID}, date=${dateStr}, desc=${doc.docDescription}`);
    try {
      await fetchDoc(doc.docID, 2, path.join(OUT, `yuho_filed${year}.pdf`));
      console.log(`  Saved PDF`);
    } catch (e) {
      console.error(`  PDF err: ${e.message}`);
    }
    try {
      await fetchDoc(doc.docID, 5, path.join(OUT, `yuho_filed${year}.zip`));
      console.log(`  Saved CSV ZIP`);
    } catch (e) {
      console.error(`  ZIP err: ${e.message}`);
    }
    summary.push({ filing_year: year, found: true, docID: doc.docID, date: dateStr, desc: doc.docDescription });
    await new Promise(r => setTimeout(r, 800));
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(summary, null, 2));
})();
