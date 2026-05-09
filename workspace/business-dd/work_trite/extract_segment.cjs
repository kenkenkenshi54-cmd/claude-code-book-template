// Extract segment-related rows from a EDINET XBRL_TO_CSV file (UTF-16 LE)
const fs = require('fs');
const path = require('path');

const TARGETS = [
  {
    label: 'FY2024',
    csv: 'edinet/yuho_7th_FY2024_2025-03-28_S100VHZW_csv/XBRL_TO_CSV/jpcrp030000-asr-001_E37764-000_2024-12-31_01_2025-03-28.csv',
  },
  {
    label: 'FY2023',
    csv: 'edinet/yuho_6th_FY2023_2024-03-28_S100T5KO_csv/XBRL_TO_CSV/jpcrp030000-asr-001_E37764-000_2023-12-31_01_2024-03-28.csv',
  },
  {
    label: 'IPO_Ibu_2023',
    csv: 'edinet/ibu_IPO_2023_2023-06-20_S100QZXQ_csv/XBRL_TO_CSV/jpcrp020400-srs-001_E37764-000_2022-12-31_01_2023-06-20.csv',
  },
];

const DEFAULT_KEYWORDS = [
  'InformationAboutEmployeesText', 'EmployeesByJobCategory',
  'NumberOfEmployees', '従業員の状況', '従業員数', '臨時従業員',
  'トライトキャリア', 'トライトエンジニアリング',
];
const KEYWORDS = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_KEYWORDS;

for (const t of TARGETS) {
  const fp = path.join(__dirname, t.csv);
  if (!fs.existsSync(fp)) { console.log(`-- ${t.label}: not found ${fp}`); continue; }
  const buf = fs.readFileSync(fp);
  // Detect UTF-16 LE BOM (FF FE) or fallback to utf8
  let txt;
  if (buf[0] === 0xFF && buf[1] === 0xFE) txt = buf.slice(2).toString('utf16le');
  else if (buf[0] === 0xFE && buf[1] === 0xFF) txt = buf.slice(2).swap16().toString('utf16le');
  else txt = buf.toString('utf8');
  const lines = txt.split(/\r?\n/);
  console.log(`\n=== ${t.label} (${lines.length} rows) ===`);
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (KEYWORDS.some(k => ln.includes(k))) {
      console.log(`  [${i}] ${ln.substring(0, 600)}`);
    }
  }
}
