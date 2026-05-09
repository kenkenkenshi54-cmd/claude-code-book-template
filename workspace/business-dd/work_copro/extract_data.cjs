// Extract key financial / business data points from each yuho CSV
const fs = require('fs');
const path = require('path');

const LABELS = ['yuho_FY2021_Mar', 'yuho_FY2022_Mar', 'yuho_FY2023_Mar', 'yuho_FY2024_Mar', 'yuho_FY2025_Mar'];

function readUTF16(filePath) {
  const buf = fs.readFileSync(filePath);
  let start = 0;
  if (buf[0] === 0xFF && buf[1] === 0xFE) start = 2;
  return buf.slice(start).toString('utf16le');
}
function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

const interesting = [
  // Top-line connections
  'NetSales',
  'OperatingIncome',
  'OrdinaryIncome',
  'ProfitLoss',
  // Personnel
  'NumberOfEmployees',
  'AverageAge',
  'AverageYearsOfService',
  'AverageAnnualSalary',
  // Capex / Depreciation
  'CapitalExpenditures',
  'Depreciation',
  // Major customer / shareholder
  'MajorShareholder',
  'NameOfMajorCustomer',
  'NameMajorShareholders',
  'NumberOfSharesHeldMajorShareholders',
  'ShareholdingRatioMajorShareholders',
  // Selling general
  'CostOfSales',
  'GrossProfit',
  'SellingGeneralAndAdministrativeExpenses',
  // PerShare
  'CashFlowsFromOperatingActivities',
];

for (const lab of LABELS) {
  console.log(`\n############### ${lab} ###############`);
  const ROOT = path.join(__dirname, 'edinet', `csv_${lab}`, 'XBRL_TO_CSV');
  if (!fs.existsSync(ROOT)) { console.log(' (no csv dir)'); continue; }
  const files = fs.readdirSync(ROOT).filter(f => f.startsWith('jpcrp030000-asr'));
  if (!files.length) { console.log(' (no asr csv)'); continue; }
  const csv = readUTF16(path.join(ROOT, files[0]));
  const rows = csv.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));
  const printed = new Set();
  for (const r of rows) {
    const id = r[0] || '';
    const lab2 = r[1] || '';
    const ctx = r[2] || '';
    const unit = r[7] || '';
    const val = (r[8] || '').slice(0, 80);
    if (interesting.some(kw => id.includes(kw))) {
      const key = `${id}|${ctx}`;
      if (printed.has(key)) continue;
      printed.add(key);
      console.log(`${id} | ${lab2} | ${ctx} | ${unit} | ${val}`);
    }
  }
}
