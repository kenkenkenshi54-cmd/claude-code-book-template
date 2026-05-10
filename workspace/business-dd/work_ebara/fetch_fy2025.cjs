// FY2025 Dec → 2026年3月提出
const https = require('https');
const fs = require('fs');
const path = require('path');

const KEY = 'ee817fd5fd6a4754b5c9550f5d8672b9';
const SEC = '63610';
const OUT = 'c:/Users/Kamei.Kenshi/Documents/dev/claude-code-book-template/workspace/business-dd/work_ebara/edinet';

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function get(url){return new Promise((res,rej)=>{https.get(url,r=>{const cs=[];r.on('data',c=>cs.push(c));r.on('end',()=>res(Buffer.concat(cs)));}).on('error',rej);});}
function getFile(url,p){return new Promise((res,rej)=>{https.get(url,r=>{const ws=fs.createWriteStream(p);r.pipe(ws);ws.on('finish',()=>ws.close(()=>res(p)));ws.on('error',rej);}).on('error',rej);});}

async function listDocs(d){
  const buf = await get(`https://api.edinet-fsa.go.jp/api/v2/documents.json?date=${d}&type=2&Subscription-Key=${KEY}`);
  return JSON.parse(buf.toString('utf-8')).results || [];
}

(async () => {
  for (const month of [3,4]) {
    const lastDay = new Date(2026, month, 0).getDate();
    for (let day=1; day<=lastDay; day++) {
      const d = `2026-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      try {
        const docs = await listDocs(d);
        for (const doc of docs) {
          if (doc.secCode === SEC && doc.docTypeCode === '120') {
            console.log(`Found: ${d} ${doc.docID} ${doc.docDescription}`);
            await getFile(`https://api.edinet-fsa.go.jp/api/v2/documents/${doc.docID}?type=5&Subscription-Key=${KEY}`, path.join(OUT,'yuho_FY2025_Dec.zip'));
            await getFile(`https://api.edinet-fsa.go.jp/api/v2/documents/${doc.docID}?type=2&Subscription-Key=${KEY}`, path.join(OUT,'yuho_FY2025_Dec.pdf'));
            console.log('saved');
            return;
          }
        }
      } catch(e){}
      await sleep(150);
    }
  }
  console.log('NOT FOUND');
})();
