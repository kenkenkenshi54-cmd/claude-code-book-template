// Probe EDINET for any document mentioning Nareru
const API_KEY = 'ee817fd5fd6a4754b5c9550f5d8672b9';
const BASE = 'https://api.edinet-fsa.go.jp/api/v2';

async function listDocs(dateStr) {
  const url = `${BASE}/documents.json?date=${dateStr}&type=2&Subscription-Key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dateStr}: HTTP ${res.status}`);
  const j = await res.json();
  return j.results || [];
}

(async () => {
  // Scan whole Nov 2024 and Nov 2025 looking for "ナレル" or secCode startswith "9163"
  const months = [
    [2023, 11], [2023, 12],
    [2024, 11], [2024, 12],
    [2025, 11], [2025, 12],
    [2026, 4], [2026, 5],
  ];
  for (const [y, m] of months) {
    const dim = new Date(y, m, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      try {
        const docs = await listDocs(ds);
        for (const doc of docs) {
          const name = (doc.filerName || '') + ' ' + (doc.docDescription || '');
          if (name.includes('ナレル') || (doc.secCode && doc.secCode.startsWith('9163'))) {
            console.log(`${ds}: code=${doc.secCode} type=${doc.docTypeCode} filer=${doc.filerName} desc=${doc.docDescription} docID=${doc.docID}`);
          }
        }
      } catch (e) {
        console.error(`err ${ds}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 80));
    }
  }
})();
