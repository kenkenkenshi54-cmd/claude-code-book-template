// Open Up Group (2154) yuho fetch via EDINET API v2 (direct docID)
const fs = require('fs');
const path = require('path');

const API_KEY = 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';
const OUT = path.join(__dirname, 'edinet');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { fy: 2021, docID: 'S100MIC4', date: '2021-09-29' },
  { fy: 2022, docID: 'S100P8XS', date: '2022-09-28' },
  { fy: 2023, docID: 'S100RWY3', date: '2023-09-27' },
  { fy: 2024, docID: 'S100UFFE', date: '2024-09-26' },
  { fy: 2025, docID: 'S100WQCA', date: '2025-09-22' },
];

async function fetchDoc(docId, type, savePath) {
  const url = `${BASE}/documents/${docId}?type=${type}&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${docId} type=${type}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(savePath, buf);
  return savePath;
}

(async () => {
  for (const t of TARGETS) {
    console.log(`\n=== FY${t.fy} (docID=${t.docID}, ${t.date}) ===`);
    try {
      await fetchDoc(t.docID, 2, path.join(OUT, `yuho_FY${t.fy}.pdf`));
      console.log(`  Saved PDF`);
    } catch (e) { console.error(`  PDF err: ${e.message}`); }
    try {
      await fetchDoc(t.docID, 5, path.join(OUT, `yuho_FY${t.fy}.zip`));
      console.log(`  Saved CSV ZIP`);
    } catch (e) { console.error(`  ZIP err: ${e.message}`); }
    await new Promise(r => setTimeout(r, 800));
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(TARGETS, null, 2));
  console.log('\n=== Done ===');
})();
