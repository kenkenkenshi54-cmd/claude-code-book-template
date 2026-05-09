// Fetch Nareru Group (9163, secCode "91630") yuho via EDINET API v2
// FY end is October; yuho filed late January
const fs = require('fs');
const path = require('path');

const API_KEY = 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';
const SEC_CODE = '91630';
const OUT = path.join(__dirname, 'edinet');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function listDocs(dateStr) {
  const url = `${BASE}/documents.json?date=${dateStr}&type=2&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dateStr}: HTTP ${res.status}`);
  const j = await res.json();
  return j.results || [];
}

async function findDocs(year, month) {
  const dim = new Date(year, month, 0).getDate();
  const targets = [];
  for (let d = 1; d <= dim; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    try {
      const docs = await listDocs(dateStr);
      for (const doc of docs) {
        if (doc.secCode === SEC_CODE || (doc.filerName || '').includes('ナレル')) {
          targets.push({ dateStr, doc });
        }
      }
    } catch (e) {
      console.error(`  err ${dateStr}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 80));
  }
  return targets;
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
  // FY-end Oct; yuho late Jan; semi-annual late June
  const months = [
    [2023, 1], [2023, 6],   // possibly yuho for FY2022 Oct, semi for FY2023
    [2024, 1], [2024, 6],   // yuho FY2023 Oct, semi FY2024
    [2025, 1], [2025, 6],   // yuho FY2024 Oct, semi FY2025
    [2026, 1], [2026, 4], [2026, 5], // yuho FY2025 Oct, recent
  ];
  for (const [y, m] of months) {
    console.log(`\n=== Searching ${y}-${m} ===`);
    const docs = await findDocs(y, m);
    for (const { dateStr, doc } of docs) {
      console.log(`  ${dateStr}: code=${doc.secCode} type=${doc.docTypeCode} desc=${doc.docDescription} filer=${doc.filerName}`);
      summary.push({ dateStr, docID: doc.docID, docTypeCode: doc.docTypeCode, desc: doc.docDescription, filer: doc.filerName });
      if (['120', '130', '140', '160'].includes(doc.docTypeCode)) {
        const tag = `${doc.docTypeCode}_${dateStr}_${doc.docID}`;
        try {
          await fetchDoc(doc.docID, 2, path.join(OUT, `${tag}.pdf`));
          console.log(`    Saved PDF`);
        } catch (e) {
          console.error(`    PDF err: ${e.message}`);
        }
        try {
          await fetchDoc(doc.docID, 5, path.join(OUT, `${tag}.zip`));
          console.log(`    Saved CSV ZIP`);
        } catch (e) {
          console.error(`    ZIP err: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 600));
      }
    }
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(summary, null, 2));
})();
