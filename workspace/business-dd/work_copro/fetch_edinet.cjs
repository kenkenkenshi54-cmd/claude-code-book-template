// Fetch Copro Holdings (7059, secCode "70590") yuho for FY2020-FY2025 via EDINET API v2
// 2023年8月に決算月を3月→9月に変更。経過期間は2024年4-9月の6ヶ月変則決算。
// 旧3月決算→6月後半提出、新9月決算→12月後半提出
const fs = require('fs');
const path = require('path');

const API_KEY = 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';
const SEC_CODE = '70590';
const OUT = path.join(__dirname, 'edinet');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function listDocs(dateStr) {
  const url = `${BASE}/documents.json?date=${dateStr}&type=2&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dateStr}: HTTP ${res.status}`);
  const j = await res.json();
  return j.results || [];
}

async function scanForYuho(scanRanges) {
  // scanRanges: array of [year, month, dayStart, dayEnd]
  for (const [yy, m, ds, de] of scanRanges) {
    for (let d = ds; d <= de; d++) {
      const dateStr = `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
      await new Promise(r => setTimeout(r, 150));
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
  // 5期分（直近重視）
  const targets = [
    { label: 'FY2021_Mar', ranges: [[2021, 5, 15, 31], [2021, 6, 1, 30], [2021, 7, 1, 15]] },
    { label: 'FY2022_Mar', ranges: [[2022, 5, 15, 31], [2022, 6, 1, 30], [2022, 7, 1, 15]] },
    { label: 'FY2023_Mar', ranges: [[2023, 5, 15, 31], [2023, 6, 1, 30], [2023, 7, 1, 15]] },
    { label: 'FY2024H1_Sep', ranges: [[2024, 11, 1, 30], [2024, 12, 1, 31], [2025, 1, 1, 15]] },
    { label: 'FY2025_Sep', ranges: [[2025, 11, 1, 30], [2025, 12, 1, 31], [2026, 1, 1, 15]] },
  ];
  const summary = [];
  for (const t of targets) {
    console.log(`\n=== ${t.label} ===`);
    const found = await scanForYuho(t.ranges);
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
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(summary, null, 2));
})();
