// Search wider for Copro HD recent yuho — try all months 2024-2026
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

async function fetchDoc(docId, type, savePath) {
  const url = `${BASE}/documents/${docId}?type=${type}&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${docId} type=${type}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(savePath, buf);
  return savePath;
}

(async () => {
  // Full month-1 of every month 2024 onward to find any 7059 filing
  const found = [];
  const startYear = 2023, startMonth = 7;
  const endYear = 2026, endMonth = 4;
  const sample_days = [1, 8, 15, 22, 28];
  for (let y = startYear; y <= endYear; y++) {
    const ms = (y === startYear ? startMonth : 1);
    const me = (y === endYear ? endMonth : 12);
    for (let m = ms; m <= me; m++) {
      for (const d of sample_days) {
        const ds = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        try {
          const docs = await listDocs(ds);
          for (const doc of docs) {
            if (doc.secCode === SEC_CODE) {
              found.push({ ds, docID: doc.docID, type: doc.docTypeCode, desc: doc.docDescription });
              console.log(`  ${ds}: ${doc.docTypeCode} ${doc.docID} ${doc.docDescription}`);
            }
          }
        } catch (e) {
          console.error(`  err ${ds}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 120));
      }
    }
  }
  fs.writeFileSync(path.join(OUT, 'all_filings_sampled.json'), JSON.stringify(found, null, 2));
  // Now scan each unique month near filings to find yuho
  const yuhos = found.filter(f => f.type === '120');
  console.log('\n=== YUHO found by sampling ===');
  console.log(yuhos);
  for (const yh of yuhos) {
    const pdfPath = path.join(OUT, `yuho_${yh.docID}.pdf`);
    try {
      await fetchDoc(yh.docID, 2, pdfPath);
      console.log(`Saved ${pdfPath}`);
    } catch (e) {
      console.error(e.message);
    }
    try {
      await fetchDoc(yh.docID, 5, path.join(OUT, `yuho_${yh.docID}.zip`));
      console.log(`Saved zip`);
    } catch (e) {
      console.error(e.message);
    }
    await new Promise(r => setTimeout(r, 400));
  }
})();
