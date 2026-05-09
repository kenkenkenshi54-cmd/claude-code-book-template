// Extract key financials from EDINET CSVs (UTF-16 LE)
const fs = require('fs');
const path = require('path');

const FY_LIST = [2021, 2022, 2023, 2024, 2025];
const ROOT = path.join(__dirname, 'edinet');

function readUTF16(filePath) {
  const buf = fs.readFileSync(filePath);
  let start = 0;
  if (buf[0] === 0xFF && buf[1] === 0xFE) start = 2;
  return buf.slice(start).toString('utf16le');
}

function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

function parseTSV(text) {
  return text.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));
}

const elementsOfInterest = [
  // 5-year summary
  'jpcrp_cor:NetSalesSummaryOfBusinessResults',
  'jpcrp_cor:OperatingIncomeLossSummaryOfBusinessResults',
  'jpcrp_cor:OrdinaryIncomeLossSummaryOfBusinessResults',
  'jpcrp_cor:NetIncomeLossAttributableToOwnersOfParentSummaryOfBusinessResults',
  'jpcrp_cor:ProfitLossAttributableToOwnersOfParentSummaryOfBusinessResults',
  'jpcrp_cor:NetAssetsSummaryOfBusinessResults',
  'jpcrp_cor:TotalAssetsSummaryOfBusinessResults',
  'jpcrp_cor:EquityToAssetRatioSummaryOfBusinessResults',
  'jpcrp_cor:RateOfReturnOnEquitySummaryOfBusinessResults',
  'jpcrp_cor:CashFlowsFromOperatingActivitiesSummaryOfBusinessResults',
  'jpcrp_cor:CashFlowsFromInvestingActivitiesSummaryOfBusinessResults',
  'jpcrp_cor:CashFlowsFromFinancingActivitiesSummaryOfBusinessResults',
  'jpcrp_cor:CashAndCashEquivalentsSummaryOfBusinessResults',
];

const segmentTargets = [
  // segment - using IFRS or Japanese GAAP variants
  'NetSalesOfReportableSegments',
  'OperatingIncomeLossOfReportableSegments',
  'SegmentProfitLoss',
  'OperatingIncomeLoss',
  'CapitalExpendituresOfReportableSegments',
  'DepreciationOfReportableSegments',
  'AssetsOfReportableSegments',
];

for (const fy of FY_LIST) {
  const dir = path.join(ROOT, `csv_FY${fy}`, 'XBRL_TO_CSV');
  const files = fs.readdirSync(dir).filter(f => f.startsWith('jpcrp030000-asr'));
  if (!files.length) continue;
  const csv = readUTF16(path.join(dir, files[0]));
  const rows = parseTSV(csv);
  const idIdx = 0, labelIdx = 1, ctxIdx = 2, periodIdx = 5, unitIdx = 7, valIdx = 8;
  console.log(`\n=== FY${fy} ===`);

  // 5-year summary rows (only current period)
  for (const tgt of elementsOfInterest) {
    for (const r of rows) {
      if (r[idIdx] === tgt && r[ctxIdx].includes('CurrentYear')) {
        console.log(`  ${r[labelIdx]} | ${r[ctxIdx]} | ${r[valIdx]}`);
      }
    }
  }
}
