// Unzip EDINET CSV ZIPs and extract HTML text blocks for analysis
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FILED_LIST = [2021, 2022, 2023, 2024, 2025];
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
  ['NotesSegmentInformationConsolidatedFinancialStatementsIFRSTextBlock', 'segment_ifrs'],
  ['InformationAboutGeographicalAreasIFRSTextBlock', 'regions_ifrs'],
  ['NotesRevenue2ConsolidatedFinancialStatementsIFRSTextBlock', 'revenue_ifrs'],
  ['MajorShareholdersTextBlock', 'shareholders'],
  ['OverviewOfCapitalExpendituresEtcTextBlock', 'capex_overview'],
  ['MajorFacilitiesTextBlock', 'facilities'],
  ['BusinessPolicyBusinessEnvironmentIssuesToAddressEtcTextBlock', 'business_policy'],
  ['BusinessRisksTextBlock', 'risks'],
  ['ManagementAnalysisOfFinancialPositionOperatingResultsAndCashFlowsTextBlock', 'management_analysis'],
  ['CompanyHistoryTextBlock', 'history'],
  ['DescriptionOfBusinessTextBlock', 'business_desc'],
  ['OverviewOfAffiliatedEntitiesTextBlock', 'affiliated'],
  ['StrategyTextBlock', 'strategy'],
  ['CriticalContractsTextBlock', 'contracts'],
  ['OverviewOfBusinessTextBlock', 'business_overview'],
];

for (const filed of FILED_LIST) {
  const zip = path.join(ROOT, `yuho_filed${filed}.zip`);
  const csvDir = path.join(ROOT, `csv_filed${filed}`);
  if (!fs.existsSync(csvDir)) {
    console.log(`Unzipping ${zip}...`);
    fs.mkdirSync(csvDir, { recursive: true });
    try {
      execSync(`cd "${csvDir}" && unzip -o "${zip}"`, { stdio: 'pipe' });
    } catch (e) {
      console.error(`unzip err: ${e.message}`);
      continue;
    }
  }
  const xbrlDir = path.join(csvDir, 'XBRL_TO_CSV');
  if (!fs.existsSync(xbrlDir)) {
    console.error(`XBRL_TO_CSV not found in ${csvDir}`);
    continue;
  }
  const files = fs.readdirSync(xbrlDir).filter(f => f.startsWith('jpcrp030000-asr'));
  if (!files.length) {
    console.error(`no jpcrp030000-asr in ${xbrlDir}`);
    continue;
  }
  const csv = readUTF16(path.join(xbrlDir, files[0]));
  const rows = csv.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));
  for (const [elemSuffix, fname] of TARGETS) {
    const matched = rows.find(r => r[0].endsWith(elemSuffix));
    if (matched) {
      const outFile = path.join(OUT, `filed${filed}_${fname}.html`);
      fs.writeFileSync(outFile, matched[8]);
      console.log(`filed${filed} ${fname}: ${matched[8].length} chars → ${outFile}`);
    } else {
      console.log(`filed${filed} ${fname}: NOT FOUND`);
    }
  }
}
