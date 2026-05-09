// FY2016-FY2020 の連結数値 + テクノプロ施工管理セグメントを抽出
// 既存 segment_data.json に追記する

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// CSV is UTF-16 LE with BOM, tab-delimited
function readCsv(p) {
  const buf = fs.readFileSync(p);
  const text = buf.slice(2).toString('utf16le');
  return text.split(/\r?\n/).map(l => l.split('\t').map(c => c.replace(/^"|"$/g, '')));
}

// 行検索ヘルパ
function find(rows, elementId, contextId) {
  for (const r of rows) {
    if (r[0] === elementId && r[2] === contextId) return r;
  }
  return null;
}
function findAll(rows, elementIdRe, contextIdRe) {
  return rows.filter(r => r[0] && elementIdRe.test(r[0]) && (!contextIdRe || contextIdRe.test(r[2] || '')));
}

function num(v) {
  if (!v || v === '－' || v === '-') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

// セグメント情報テキストブロックから施工管理セグメントの売上・営業利益・減価償却を抽出
// FY2016～FY2020 のテクノプロは「コンストラクション・マネジメント・アウトソーシング事業」と命名
function extractTechnoproSegment(textBlock) {
  // textBlock は HTML/XHTML 形式。施工管理セグメントの数値を抜く
  // HTMLからtable行を探す
  // 戦略: 「コンストラクション」を含む行・列の周辺を取る
  const result = { revenue: null, op_income: null, dep: null, employees: null };
  if (!textBlock) return result;
  // <td>の中身を取り、行ごとにグループ化
  // 簡易的に、「コンストラクション」を含む位置を見つけ、その行の数字列を取得
  const cells = [...textBlock.matchAll(/<(?:td|p)[^>]*>([\s\S]*?)<\/(?:td|p)>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  // 「コンストラクション・マネジメント」を含むセルを探す
  for (let i = 0; i < cells.length; i++) {
    if (/コンストラクション/.test(cells[i])) {
      // 続くセルの数値列を取得 (HTMLのtable構造による)
      // 最初の数値が売上、次が利益のような順の傾向
      const nextNumbers = [];
      for (let j = i + 1; j < Math.min(i + 30, cells.length); j++) {
        const n = num(cells[j]);
        if (n != null) nextNumbers.push(n);
        if (nextNumbers.length >= 8) break;
      }
      if (nextNumbers.length > 0 && result.revenue === null) {
        result.revenue = nextNumbers[0];
        if (nextNumbers.length > 1) result.op_income = nextNumbers[1];
      }
    }
  }
  return result;
}

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'segment_data.json'), 'utf8'));

// === Technopro FY16-FY20 ===
const technoproFiles = {
  FY2016: { path: 'work_technopro/edinet/csv_yuho_FY2016/XBRL_TO_CSV/jpcrp030000-asr-001_E31030-000_2016-06-30_01_2016-09-29.csv', period_end: '2016-06-30' },
  FY2017: { path: 'work_technopro/edinet/csv_yuho_FY2017/XBRL_TO_CSV/jpcrp030000-asr-001_E31030-000_2017-06-30_01_2017-09-26.csv', period_end: '2017-06-30' },
  FY2018: { path: 'work_technopro/edinet/csv_yuho_FY2018/XBRL_TO_CSV/jpcrp030000-asr-001_E31030-000_2018-06-30_01_2018-09-25.csv', period_end: '2018-06-30' },
  FY2019: { path: 'work_technopro/edinet/csv_yuho_FY2019/XBRL_TO_CSV/jpcrp030000-asr-001_E31030-000_2019-06-30_01_2019-09-27.csv', period_end: '2019-06-30' },
  FY2020: { path: 'work_technopro/edinet/csv_yuho_FY2020/XBRL_TO_CSV/jpcrp030000-asr-001_E31030-000_2020-06-30_01_2020-09-29.csv', period_end: '2020-06-30' },
};

console.log('=== Technopro FY16-FY20 ===');
for (const [fy, info] of Object.entries(technoproFiles)) {
  try {
    const fp = path.join(ROOT, info.path);
    if (!fs.existsSync(fp)) {
      console.log(`  ${fy}: file not found: ${info.path}`);
      // try to find variant
      const dir = path.dirname(path.join(ROOT, info.path));
      const cand = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.startsWith('jpcrp030000-asr-001')) : [];
      console.log(`    variants: ${cand.join(', ')}`);
      continue;
    }
    const rows = readCsv(fp);
    // 連結ベース取得
    const rev = find(rows, 'jpigp_cor:RevenueIFRS', 'CurrentYearDuration')
              || find(rows, 'jpcrp_cor:RevenueIFRSSummaryOfBusinessResults', 'CurrentYearDuration')
              || find(rows, 'jppfs_cor:NetSales', 'CurrentYearDuration');
    const gp  = find(rows, 'jpigp_cor:GrossProfitIFRS', 'CurrentYearDuration')
              || find(rows, 'jppfs_cor:GrossProfit', 'CurrentYearDuration');
    const op  = find(rows, 'jpigp_cor:OperatingProfitLossIFRS', 'CurrentYearDuration')
              || find(rows, 'jpcrp_cor:OperatingProfitLossIFRSSummaryOfBusinessResults', 'CurrentYearDuration')
              || find(rows, 'jppfs_cor:OperatingIncome', 'CurrentYearDuration');
    const emp = find(rows, 'jpcrp_cor:NumberOfEmployees', 'CurrentYearInstant');
    // セグメント別 (施工管理 = ConstructionManagementOutsourcingBusinessMember)
    const segEmp = findAll(rows, /^jpcrp_cor:NumberOfEmployees$/, /CurrentYearInstant_.*ConstructionManagement/);
    // セグメント情報テキストブロック (IFRS適用社)
    const segBlock = find(rows, 'jpigp_cor:NotesSegmentInformationConsolidatedFinancialStatementsIFRSTextBlock', 'CurrentYearDuration');
    const segData = segBlock ? extractTechnoproSegment(segBlock[8]) : null;

    const consolRev = num(rev?.[8]);
    const consolGp = num(gp?.[8]);
    const consolOp = num(op?.[8]);
    const consolEmp = num(emp?.[8]);
    const segHc = segEmp.length > 0 ? num(segEmp[0][8]) : null;

    console.log(`  ${fy}: rev=${consolRev}, gp=${consolGp}, op=${consolOp}, emp=${consolEmp}, segEmp=${segHc}, segRev=${segData?.revenue}, segOp=${segData?.op_income}`);

    if (!data.technopro[fy]) data.technopro[fy] = {};
    Object.assign(data.technopro[fy], {
      segment_revenue: segData?.revenue ? Math.round(segData.revenue / 1e6) : null,  // 円→百万円
      segment_op_income: segData?.op_income ? Math.round(segData.op_income / 1e6) : null,
      segment_op_margin: (segData?.op_income && segData?.revenue) ? Math.round(segData.op_income / segData.revenue * 1000) / 10 : null,
      segment_assets: null,
      segment_capex: null,
      segment_depreciation: null,
      consol_revenue: consolRev ? Math.round(consolRev / 1e6) : null,
      consol_op_income: consolOp ? Math.round(consolOp / 1e6) : null,
      consol_op_margin: (consolOp && consolRev) ? Math.round(consolOp / consolRev * 1000) / 10 : null,
      consol_gross_profit: consolGp ? Math.round(consolGp / 1e6) : null,
      consol_gross_margin: (consolGp && consolRev) ? Math.round(consolGp / consolRev * 10000) / 100 : null,
      headcount_total: consolEmp,
      headcount_segment: segHc,
      notes: `EDINETから第${fy === 'FY2016' ? '11' : fy === 'FY2017' ? '12' : fy === 'FY2018' ? '13' : fy === 'FY2019' ? '14' : '15'}期有報抽出。施工管理セグメント数値はセグメント情報注記から自動抽出（精度限定的、PDF確認推奨）。`
    });
  } catch (e) {
    console.error(`  ${fy} error: ${e.message}`);
  }
}

// === Openup (旧トラスト・テック→ビーネックス) FY16-FY20 ===
const openupFiles = {
  FY2016: 'work_open_up_group/edinet/csv_yuho_FY2016/XBRL_TO_CSV/jpcrp030000-asr-001_E05695-000_2016-06-30_01_2016-09-26.csv',
  FY2017: 'work_open_up_group/edinet/csv_yuho_FY2017/XBRL_TO_CSV/jpcrp030000-asr-001_E05695-000_2017-06-30_01_2017-09-25.csv',
  FY2018: 'work_open_up_group/edinet/csv_yuho_FY2018/XBRL_TO_CSV/jpcrp030000-asr-001_E05695-000_2018-06-30_01_2018-09-25.csv',
  FY2019: 'work_open_up_group/edinet/csv_yuho_FY2019/XBRL_TO_CSV/jpcrp030000-asr-001_E05695-000_2019-06-30_01_2019-09-30.csv',
  FY2020: 'work_open_up_group/edinet/csv_yuho_FY2020/XBRL_TO_CSV/jpcrp030000-asr-001_E05695-000_2020-06-30_01_2020-09-30.csv',
};

console.log('\n=== Openup (旧トラスト・テック/ビーネックス) FY16-FY20 ===');
for (const [fy, p] of Object.entries(openupFiles)) {
  try {
    const fp = path.join(ROOT, p);
    if (!fs.existsSync(fp)) { console.log(`  ${fy}: not found: ${p}`); continue; }
    const rows = readCsv(fp);
    const rev = find(rows, 'jppfs_cor:NetSales', 'CurrentYearDuration')
              || find(rows, 'jpcrp_cor:NetSalesSummaryOfBusinessResults', 'CurrentYearDuration')
              || find(rows, 'jpigp_cor:RevenueIFRS', 'CurrentYearDuration');
    const gp  = find(rows, 'jppfs_cor:GrossProfit', 'CurrentYearDuration')
              || find(rows, 'jpigp_cor:GrossProfitIFRS', 'CurrentYearDuration');
    const op  = find(rows, 'jppfs_cor:OperatingIncome', 'CurrentYearDuration')
              || find(rows, 'jpigp_cor:OperatingProfitLossIFRS', 'CurrentYearDuration')
              || find(rows, 'jpcrp_cor:OperatingIncomeSummaryOfBusinessResults', 'CurrentYearDuration');
    const emp = find(rows, 'jpcrp_cor:NumberOfEmployees', 'CurrentYearInstant');

    const consolRev = num(rev?.[8]);
    const consolGp = num(gp?.[8]);
    const consolOp = num(op?.[8]);
    const consolEmp = num(emp?.[8]);

    console.log(`  ${fy}: rev=${consolRev}, gp=${consolGp}, op=${consolOp}, emp=${consolEmp}`);

    if (!data.openup[fy]) data.openup[fy] = {};
    Object.assign(data.openup[fy], {
      segment_revenue: null,  // 当時は別法人(トラスト・テック)で「建設」セグメントが現在の定義と異なる
      segment_op_income: null,
      segment_op_margin: null,
      segment_assets: null,
      segment_capex: null,
      segment_depreciation: null,
      consol_revenue: consolRev ? Math.round(consolRev / 1e6) : null,
      consol_op_income: consolOp ? Math.round(consolOp / 1e6) : null,
      consol_op_margin: (consolOp && consolRev) ? Math.round(consolOp / consolRev * 1000) / 10 : null,
      consol_gross_profit: consolGp ? Math.round(consolGp / 1e6) : null,
      consol_gross_margin: (consolGp && consolRev) ? Math.round(consolGp / consolRev * 10000) / 100 : null,
      headcount_total: consolEmp,
      headcount_segment: null,
      notes: `※注意: 当時は ${fy === 'FY2016' || fy === 'FY2017' ? 'オープンアップグループ (旧名)' : fy === 'FY2018' || fy === 'FY2019' ? '株式会社トラスト・テック' : '株式会社ビーネックスグループ'} (機電・IT派遣がメイン事業)。2021/4 夢真HDと経営統合し現在のオープンアップGに改編。「建設」セグメントは現在の定義と異なる/極めて小規模だったため null。連結数値はJGAAPベース。`
    });
  } catch (e) {
    console.error(`  ${fy} error: ${e.message}`);
  }
}

// === Copro FY19-FY20 ===
const coproFiles = {
  FY2019: 'work_copro/edinet/csv_yuho_FY2019_Mar/XBRL_TO_CSV/jpcrp030000-asr-001_E34699-000_2019-03-31_01_2019-06-26.csv',
  FY2020: 'work_copro/edinet/csv_yuho_FY2020_Mar/XBRL_TO_CSV/jpcrp030000-asr-001_E34699-000_2020-03-31_01_2020-06-25.csv',
};

console.log('\n=== Copro FY19-FY20 ===');
for (const [fy, p] of Object.entries(coproFiles)) {
  try {
    const fp = path.join(ROOT, p);
    if (!fs.existsSync(fp)) { console.log(`  ${fy}: not found: ${p}`); continue; }
    const rows = readCsv(fp);
    const rev = find(rows, 'jppfs_cor:NetSales', 'CurrentYearDuration')
              || find(rows, 'jpcrp_cor:NetSalesSummaryOfBusinessResults', 'CurrentYearDuration');
    const gp  = find(rows, 'jppfs_cor:GrossProfit', 'CurrentYearDuration');
    const op  = find(rows, 'jppfs_cor:OperatingIncome', 'CurrentYearDuration')
              || find(rows, 'jpcrp_cor:OperatingIncomeSummaryOfBusinessResults', 'CurrentYearDuration');
    const emp = find(rows, 'jpcrp_cor:NumberOfEmployees', 'CurrentYearInstant');

    const consolRev = num(rev?.[8]);
    const consolGp = num(gp?.[8]);
    const consolOp = num(op?.[8]);
    const consolEmp = num(emp?.[8]);

    console.log(`  ${fy}: rev=${consolRev}, gp=${consolGp}, op=${consolOp}, emp=${consolEmp}`);

    if (!data.copro[fy]) data.copro[fy] = {};
    Object.assign(data.copro[fy], {
      segment_revenue: null,
      segment_op_income: null,
      segment_op_margin: null,
      segment_assets: null,
      segment_capex: null,
      segment_depreciation: null,
      consol_revenue: consolRev ? Math.round(consolRev / 1e6) : null,
      consol_op_income: consolOp ? Math.round(consolOp / 1e6) : null,
      consol_op_margin: (consolOp && consolRev) ? Math.round(consolOp / consolRev * 1000) / 10 : null,
      consol_gross_profit: consolGp ? Math.round(consolGp / 1e6) : null,
      consol_gross_margin: (consolGp && consolRev) ? Math.round(consolGp / consolRev * 10000) / 100 : null,
      headcount_total: consolEmp,
      headcount_segment: null,
      notes: `第${fy === 'FY2019' ? '13' : '14'}期有報抽出。単一セグメント開示のためサービス別建設売上は当時の収益認識注記が無く取得不可 (FY22から開示開始)。連結数値のみ。`
    });
  } catch (e) {
    console.error(`  ${fy} error: ${e.message}`);
  }
}

// === Nareru I-bu (5期推移) ===
console.log('\n=== Nareru I-bu (5期推移) ===');
try {
  const fp = path.join(ROOT, 'work_nareru/edinet/ibu_IPO_2023_2023-06-19_S100QZAG_csv/XBRL_TO_CSV/jpcrp020400-srs-001_E38728-000_2022-10-31_01_2023-06-19.csv');
  if (fs.existsSync(fp)) {
    const rows = readCsv(fp);
    // Prior4Year ~ Current の経営指標推移
    const periods = ['Prior4YearDuration', 'Prior3YearDuration', 'Prior2YearDuration', 'Prior1YearDuration', 'CurrentYearDuration'];
    const periodInst = ['Prior4YearInstant', 'Prior3YearInstant', 'Prior2YearInstant', 'Prior1YearInstant', 'CurrentYearInstant'];
    const fys = ['FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022'];

    for (let i = 0; i < 5; i++) {
      const ctx = periods[i];
      const ctxI = periodInst[i];
      const rev = find(rows, 'jpcrp_cor:RevenueIFRSSummaryOfBusinessResults', ctx)
                || find(rows, 'jpcrp_cor:NetSalesSummaryOfBusinessResults', ctx);
      const op  = find(rows, 'jpcrp_cor:OperatingProfitLossIFRSSummaryOfBusinessResults', ctx)
                || find(rows, 'jpcrp_cor:OperatingIncomeSummaryOfBusinessResults', ctx);
      const emp = find(rows, 'jpcrp_cor:NumberOfEmployees', ctxI);
      const consolRev = num(rev?.[8]);
      const consolOp = num(op?.[8]);
      const consolEmp = num(emp?.[8]);
      console.log(`  ${fys[i]}: rev=${consolRev}, op=${consolOp}, emp=${consolEmp}`);

      if (!data.nareru[fys[i]]) data.nareru[fys[i]] = {};
      // 既存 FY2021/FY2022 は上書きしない
      const existing = data.nareru[fys[i]];
      const updates = {
        consol_revenue: existing?.consol_revenue || (consolRev ? Math.round(consolRev / 1e6) : null),
        consol_op_income: existing?.consol_op_income || (consolOp ? Math.round(consolOp / 1e6) : null),
        consol_op_margin: existing?.consol_op_margin || ((consolOp && consolRev) ? Math.round(consolOp / consolRev * 1000) / 10 : null),
        headcount_total: existing?.headcount_total || consolEmp,
      };
      // FY2018/2019/2020はnewly addedなので埋める
      if (!existing.notes || fys[i] === 'FY2018' || fys[i] === 'FY2019' || fys[i] === 'FY2020') {
        Object.assign(data.nareru[fys[i]], updates);
        if (!existing.notes) {
          data.nareru[fys[i]].segment_revenue = null;
          data.nareru[fys[i]].segment_op_income = null;
          data.nareru[fys[i]].segment_op_margin = null;
          data.nareru[fys[i]].segment_assets = null;
          data.nareru[fys[i]].segment_capex = null;
          data.nareru[fys[i]].segment_depreciation = null;
          data.nareru[fys[i]].consol_gross_profit = null;
          data.nareru[fys[i]].consol_gross_margin = null;
          data.nareru[fys[i]].headcount_segment = null;
          data.nareru[fys[i]].notes = `IPO時 有価証券届出書 (Ⅰの部, S100QZAG, 2023/6/19) の経営指標等の推移から取得。連結数値のみ。セグメント別はI部にも開示なし。`;
        }
      }
    }
  } else {
    console.log('  Not found:', fp);
  }
} catch (e) {
  console.error(`  Nareru I-bu error: ${e.message}`);
}

fs.writeFileSync(path.join(__dirname, 'segment_data.json'), JSON.stringify(data, null, 2) + '\n');
console.log('\n=== Wrote segment_data.json with FY16-FY20 additions ===');
