// 荏原製作所 (6361) の有報をEDINET API v2で5期分取得する。
// 2022年から12月決算に変更（それ以前は3月決算）。
const https = require('https');
const fs = require('fs');
const path = require('path');

const EDINET_API_KEY = 'ee817fd5fd6a4754b5c9550f5d8672b9';
const SEC_CODE = '63610'; // 6361 + trailing 0
const OUT_DIR = 'c:/Users/Kamei.Kenshi/Documents/dev/claude-code-book-template/workspace/business-dd/work_ebara/edinet';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`));
        } else {
          resolve(Buffer.concat(chunks));
        }
      });
    }).on('error', reject);
  });
}

function httpGetToFile(urlStr, savePath) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, res => {
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const ws = fs.createWriteStream(savePath);
      res.pipe(ws);
      ws.on('finish', () => ws.close(() => resolve(savePath)));
      ws.on('error', reject);
    }).on('error', reject);
  });
}

async function listDocuments(dateStr) {
  const url = `https://api.edinet-fsa.go.jp/api/v2/documents.json?date=${dateStr}&type=2&Subscription-Key=${EDINET_API_KEY}`;
  const buf = await httpGet(url);
  const j = JSON.parse(buf.toString('utf-8'));
  return j.results || [];
}

async function findYuhoInRange(year, monthStart, monthEnd) {
  for (let month = monthStart; month <= monthEnd; month++) {
    const lastDay = new Date(year, month, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      try {
        const docs = await listDocuments(dateStr);
        for (const d of docs) {
          if (d.secCode === SEC_CODE && d.docTypeCode === '120') {
            return { dateStr, doc: d };
          }
        }
      } catch (e) {
        // skip
      }
      await sleep(150);
    }
  }
  return { dateStr: null, doc: null };
}

async function fetchDoc(docId, type, savePath) {
  const url = `https://api.edinet-fsa.go.jp/api/v2/documents/${docId}?type=${type}&Subscription-Key=${EDINET_API_KEY}`;
  await httpGetToFile(url, savePath);
}

async function main() {
  const targets = [
    { label: 'FY2024_Dec', year: 2025, ms: 3, me: 4 },
    { label: 'FY2023_Dec', year: 2024, ms: 3, me: 4 },
    { label: 'FY2022_Dec', year: 2023, ms: 3, me: 4 },
    { label: 'FY2021_9M',  year: 2022, ms: 3, me: 4 },
    { label: 'FY2020_Mar', year: 2021, ms: 6, me: 7 },
  ];

  const summary = [];
  for (const t of targets) {
    console.log(`=== ${t.label} (search ${t.year}/${t.ms}-${t.me}) ===`);
    const { dateStr, doc } = await findYuhoInRange(t.year, t.ms, t.me);
    if (!doc) {
      console.log(`  NOT FOUND for ${t.label}`);
      summary.push({ label: t.label, found: false });
      continue;
    }
    console.log(`  Found docID=${doc.docID} date=${dateStr} desc=${doc.docDescription}`);
    for (const [type, ext] of [[5, 'zip'], [2, 'pdf']]) {
      const p = path.join(OUT_DIR, `yuho_${t.label}.${ext}`);
      try {
        await fetchDoc(doc.docID, type, p);
        console.log(`  Saved type=${type}: ${p}`);
      } catch (e) {
        console.log(`  fetch err type=${type}: ${e.message}`);
      }
    }
    summary.push({ label: t.label, found: true, docID: doc.docID, date: dateStr, desc: doc.docDescription });
    await sleep(800);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== Summary ===');
  for (const s of summary) console.log(s);
}

main().catch(e => { console.error(e); process.exit(1); });
