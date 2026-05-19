// Extract HTML text blocks (segment, customers, shareholders, etc.) and save as raw HTML files
const fs = require('fs');
const path = require('path');

const FY_LIST = [2021, 2022, 2023, 2024, 2025];
const ROOT = path.join(__dirname, 'edinet');
const OUT = path.join(__dirname, 'extracted');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function readUTF16(filePath) {
  const buf = fs.readFileSync(filePath);
  let start = 0;
  if (buf[0] === 0xFF && buf[1] === 0xFE) start = 2;
  return buf.slice(start).toString('utf16le');
}
function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

const TARGETS = [
  ['NotesSegmentInformationEtcConsolidatedFinancialStatementsTextBlock', 'segment_full'],
  ['InformationForEachOfMainCustomersTextBlock', 'customers'],
  ['MajorShareholdersTextBlock', 'shareholders'],
  ['RevenuesFromExternalCustomersInformationForEachRegionTextBlock', 'regions'],
  ['OverviewOfCapitalExpendituresEtcTextBlock', 'capex_overview'],
  ['MajorFacilitiesTextBlock', 'facilities'],
  ['MajorComponentsOfSellingGeneralAndAdministrativeExpensesTextBlock', 'sga'],
  ['DescriptionOfReportableSegmentsTextBlock', 'segment_overview'],
  ['BusinessPolicyBusinessEnvironmentIssuesToAddressEtcTextBlock', 'business_policy'],
  ['BusinessRisksTextBlock', 'risks'],
  ['ManagementAnalysisOfFinancialPositionOperatingResultsAndCashFlowsTextBlock', 'management_analysis'],
];

for (const fy of FY_LIST) {
  const dir = path.join(ROOT, `csv_FY${fy}`, 'XBRL_TO_CSV');
  const files = fs.readdirSync(dir).filter(f => f.startsWith('jpcrp030000-asr'));
  if (!files.length) continue;
  const csv = readUTF16(path.join(dir, files[0]));
  const rows = csv.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));
  for (const [elemSuffix, fname] of TARGETS) {
    const matched = rows.find(r => r[0].endsWith(elemSuffix));
    if (matched) {
      const outFile = path.join(OUT, `FY${fy}_${fname}.html`);
      fs.writeFileSync(outFile, matched[8]);
      console.log(`FY${fy} ${fname}: ${matched[8].length} chars → ${outFile}`);
    } else {
      console.log(`FY${fy} ${fname}: NOT FOUND`);
    }
  }
}
