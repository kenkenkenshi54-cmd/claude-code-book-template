// Aggregate key financial fields across 5 yuho
const fs = require('fs');
const path = require('path');

function readUTF16(filePath) {
  const buf = fs.readFileSync(filePath);
  let start = 0;
  if (buf[0] === 0xFF && buf[1] === 0xFE) start = 2;
  return buf.slice(start).toString('utf16le');
}
function unq(s) { return (s || '').replace(/^"|"$/g, ''); }

const SEGMENT_MAP = {
  'MechanicalElectricityAndITField': '機電・IT',
  'ConstructionField': '建設',
  'ManufacturingField': '製造',
  'OverseasField': '海外',
};

const TARGETS = {
  'jpigp_cor:RevenueIFRS': '売上収益',
  'jpigp_cor:SegmentProfitLossIFRS': 'セグメント利益',
  'jpigp_cor:CapitalExpendituresIFRS': '設備投資',
  'jpigp_cor:DepreciationAndAmortizationExpenseIFRS': '減価償却費',
  'jpcrp_cor:RevenueIFRSSummaryOfBusinessResults': '連結売上収益(サマリ)',
  'jpcrp_cor:OperatingProfitLossIFRSSummaryOfBusinessResults': '連結営業利益(サマリ)',
  'jpcrp_cor:ProfitLossAttributableToOwnersOfParentIFRSSummaryOfBusinessResults': '親会社株主帰属当期純利益',
  'jpcrp_cor:CapitalAdequacyRatioIFRSSummaryOfBusinessResults': '自己資本比率',
  'jpcrp_cor:RateOfReturnOnEquityIFRSSummaryOfBusinessResults': 'ROE',
  'jpcrp_cor:NumberOfEmployees': '従業員数',
};

const out = {};

for (const fy of [2021, 2022, 2023, 2024, 2025]) {
  const root = path.join(__dirname, 'edinet', `csv_yuho_FY${fy}`, 'XBRL_TO_CSV');
  if (!fs.existsSync(root)) { console.error(`SKIP ${fy}`); continue; }
  const files = fs.readdirSync(root).filter(f => f.startsWith('jpcrp030000-asr'));
  const csv = readUTF16(path.join(root, files[0]));
  const rows = csv.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t').map(unq));

  out[fy] = { segments: {}, summary: {} };

  for (const r of rows) {
    const id = r[0], label = r[1], ctx = r[2], val = r[8];
    if (!val || val === '－') continue;
    if (!TARGETS[id]) continue;

    if (id === 'jpigp_cor:RevenueIFRS' || id === 'jpigp_cor:SegmentProfitLossIFRS') {
      // CurrentYearDuration / Prior1YearDuration / segment slice
      let period = null;
      if (ctx.startsWith('CurrentYearDuration')) period = 'current';
      else if (ctx.startsWith('Prior1YearDuration')) period = 'prior1';
      else continue;
      let segName = '_total';
      for (const [k, v] of Object.entries(SEGMENT_MAP)) {
        if (ctx.includes(k)) { segName = v; break; }
      }
      if (segName === '_total') {
        // total / reconciling: skip non-segment unless ctx ends with just the period (= consolidated)
        if (ctx === `${period === 'current' ? 'CurrentYearDuration' : 'Prior1YearDuration'}`) segName = '連結';
        else continue;
      }
      out[fy].segments[segName] = out[fy].segments[segName] || {};
      const key = (id === 'jpigp_cor:RevenueIFRS' ? '売上' : '営業利益') + '_' + period;
      out[fy].segments[segName][key] = Number(val) / 1e6; // to million yen
    } else if (id === 'jpigp_cor:CapitalExpendituresIFRS' || id === 'jpigp_cor:DepreciationAndAmortizationExpenseIFRS') {
      let period = null;
      if (ctx.startsWith('CurrentYearDuration')) period = 'current';
      else if (ctx.startsWith('Prior1YearDuration')) period = 'prior1';
      else continue;
      let segName = '_skip';
      for (const [k, v] of Object.entries(SEGMENT_MAP)) {
        if (ctx.includes(k)) { segName = v; break; }
      }
      if (segName === '_skip') continue;
      out[fy].segments[segName] = out[fy].segments[segName] || {};
      const key = (id.includes('CapitalExp') ? 'capex' : 'da') + '_' + period;
      out[fy].segments[segName][key] = Number(val) / 1e6;
    } else if (id.startsWith('jpcrp_cor:')) {
      let period = ctx.split('_')[0];
      out[fy].summary[period] = out[fy].summary[period] || {};
      out[fy].summary[period][TARGETS[id]] = val;
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'extracted', 'segments_and_summary.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
