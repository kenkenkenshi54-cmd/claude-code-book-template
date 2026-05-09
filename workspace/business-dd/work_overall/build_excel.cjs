// 建設技術者派遣プレイヤー5社 比較データExcel生成
// 出力: 建設技術者派遣5社_セグメント比較.xlsx

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// === 1. JSON読み込み + Triteデータ追加 ===
const jsonPath = path.join(__dirname, 'segment_data.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Trite データ追加 (EDINET CSV ＋ IR決算説明資料 から取得)
if (!data.trite) data.trite = {};
Object.assign(data.trite, {
  "FY2022": {
    segment_revenue: 13151,
    segment_op_income: null,
    segment_op_margin: null,
    segment_assets: null,
    segment_capex: null,
    segment_depreciation: null,
    consol_revenue: 44195,
    consol_op_income: 5959,
    consol_op_margin: 13.48,
    consol_gross_profit: 30011,
    consol_gross_margin: 67.91,
    headcount_total: 6648,
    headcount_segment: null,
    notes: "EDINETは単一セグメント開示のため、建設(非医療福祉)売上は IR決算説明資料(FY24通期決算プレゼン2025/2/13)の事業別売上推移グラフから取得。連結数値は第6期有報(S100T5KO, FY23)の前期比較データから取得。"
  },
  "FY2023": {
    segment_revenue: 16288,
    segment_op_income: null,
    segment_op_margin: null,
    segment_assets: null,
    segment_capex: null,
    segment_depreciation: null,
    consol_revenue: 52767,
    consol_op_income: 7514,
    consol_op_margin: 14.24,
    consol_gross_profit: 34969,
    consol_gross_margin: 66.27,
    headcount_total: 7512,
    headcount_segment: 2200,
    notes: "建設(非医療福祉)派遣社員数 約2,200名(FY23末/Q4)。連結粗利率66.3%は派遣業界として極めて高水準(医療福祉紹介事業の高粗利が大宗)。"
  },
  "FY2024": {
    segment_revenue: 18072,
    segment_op_income: null,
    segment_op_margin: null,
    segment_assets: null,
    segment_capex: null,
    segment_depreciation: null,
    consol_revenue: 57116,
    consol_op_income: 5186,
    consol_op_margin: 9.08,
    consol_gross_profit: 37231,
    consol_gross_margin: 65.18,
    headcount_total: 7937,
    headcount_segment: 2310,
    notes: "建設派遣社員数 約2,310名(FY24末)、+5% YoY。連結営業利益はFY23 7,514→FY24 5,186と31%減益(M&A費・先行投資・人件費上昇)。2025年9月Bain CapitalによるTOBで上場廃止。"
  }
});

// メタデータ更新
data._meta.fiscal_year_end.trite = "December";
data._meta.accounting_standard.trite = "IFRS";
data._meta.segment_definitions.trite = "EDINETでは単一セグメント (人材サービス業)。IR決算説明資料の事業別開示「医療福祉事業/非医療福祉事業(建設)」のうち、非医療福祉事業=建設業界向け人材サービス(中核子会社:トライトエンジニアリング)を抽出。";

// 更新後のJSONを保存
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');

// === 2. Excel構築 ===

const companies = [
  { key: 'copro', label: 'コプロ・ホールディングス (7059)', short: 'コプロ', fye: '3月決算' },
  { key: 'nareru', label: 'ナレルグループ (9163)', short: 'ナレル', fye: '10月決算' },
  { key: 'openup', label: 'オープンアップグループ (2154)', short: 'オープンアップ', fye: '6月決算' },
  { key: 'trite', label: 'トライト (9164)', short: 'トライト', fye: '12月決算' },
  { key: 'technopro', label: 'テクノプロ・ホールディングス (6028)', short: 'テクノプロ', fye: '6月決算' },
];
const fys = ['FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025'];

// 各期の暦年 (会社別)
const fyToCalYear = {
  copro:     { FY2016: '-', FY2017: '-', FY2018: '-', FY2019: '2019/3', FY2020: '2020/3', FY2021: '2021/3', FY2022: '2022/3', FY2023: '2023/3', FY2024: '2024/3', FY2025: '2025/3' },
  nareru:    { FY2016: '-', FY2017: '-', FY2018: '-', FY2019: '-', FY2020: '2020/10', FY2021: '2021/10', FY2022: '2022/10', FY2023: '2023/10', FY2024: '2024/10', FY2025: '2025/10' },
  openup:    { FY2016: '2016/6', FY2017: '2017/6', FY2018: '2018/6', FY2019: '2019/6', FY2020: '2020/6', FY2021: '2021/6', FY2022: '2022/6', FY2023: '2023/6', FY2024: '2024/6', FY2025: '2025/6' },
  trite:     { FY2016: '-', FY2017: '-', FY2018: '-', FY2019: '-', FY2020: '-', FY2021: '-', FY2022: '2022/12', FY2023: '2023/12', FY2024: '2024/12', FY2025: '(予)2025/12' },
  technopro: { FY2016: '2016/6', FY2017: '2017/6', FY2018: '2018/6', FY2019: '2019/6', FY2020: '2020/6', FY2021: '2021/6', FY2022: '2022/6', FY2023: '2023/6', FY2024: '2024/6', FY2025: '2025/6' },
};

const indicators = [
  { key: 'segment_revenue',    label: '建設セグメント売上',     unit: '百万円' },
  { key: 'segment_op_income',  label: '建設セグメント営業利益', unit: '百万円' },
  { key: 'segment_op_margin',  label: '建設セグメント営業利益率', unit: '%' },
  { key: 'segment_capex',      label: '建設セグメント設備投資', unit: '百万円' },
  { key: 'segment_depreciation', label: '建設セグメント減価償却', unit: '百万円' },
  { key: 'headcount_segment',  label: '建設セグメント人員数 (期末)',   unit: '人' },
  { key: 'consol_revenue',     label: '連結売上収益',           unit: '百万円' },
  { key: 'consol_op_income',   label: '連結営業利益',           unit: '百万円' },
  { key: 'consol_op_margin',   label: '連結営業利益率',         unit: '%' },
  { key: 'consol_gross_profit',label: '連結売上総利益',         unit: '百万円' },
  { key: 'consol_gross_margin',label: '連結粗利率',             unit: '%' },
  { key: 'headcount_total',    label: '連結従業員数 (期末)',         unit: '人' },
];

const wb = XLSX.utils.book_new();
const append = (sheet, name) => XLSX.utils.book_append_sheet(wb, sheet, name);
const aoa = (data) => XLSX.utils.aoa_to_sheet(data);

// === Sheet 1: README ===
const readmeData = [
  ['建設技術者派遣プレイヤー 5社 ファクトベース比較データ'],
  [''],
  ['作成日', '2026-05-09'],
  ['作成者', 'Claude Code (Opus 4.7)'],
  ['対象期間', 'FY2016 - FY2025 (各社の上場時期・決算月により取得可能範囲が異なる)'],
  [''],
  ['■ 対象企業'],
  ['通称', '正式名称', '証券コード', 'EDINET-ID', '決算月', '会計基準', '備考'],
  ['Copro', 'コプロ・ホールディングス', 7059, 'E34699', '3月', 'JGAAP', '2018/3 IPO'],
  ['ナレル', 'ナレルグループ', 9163, 'E38728', '10月', 'IFRS', '2023/7 IPO (上場前は有報なし)'],
  ['オープンアップ', 'オープンアップグループ', 2154, 'E05695', '6月', 'IFRS (FY21のみJGAAP)', '旧 夢真HD、2021/4 ビーネックスHDと経営統合・改称'],
  ['トライト', 'トライト', 9164, 'E37764', '12月', 'IFRS', '2023/7 IPO → 2025/9 Bain CapitalがTOBで上場廃止'],
  ['テクノプロ', 'テクノプロ・ホールディングス', 6028, 'E31030', '6月', 'IFRS', '2014/12 IPO → 2025/9 BlackstoneがTOB → 2025/12 上場廃止予定'],
  [''],
  ['■ 建設技術者派遣に該当するセグメント'],
  ['会社', '報告セグメント構造', '建設技術者派遣の該当区分', '中核子会社'],
  ['コプロ', '単一セグメント (技術者派遣事業)', 'サービス別補助開示「建設技術者派遣・紹介」', '株式会社コプロコンストラクション'],
  ['ナレル', '建設ソリューション / ITソリューション の2セグメント', '報告セグメント「建設ソリューション」', '株式会社ワールドコーポレーション'],
  ['オープンアップ', '機電・IT / 建設 / 海外 / その他 (製造は非継続)', '報告セグメント「建設」', '株式会社夢真 / 株式会社夢テクノロジー'],
  ['トライト', 'EDINETでは単一セグメント、IRで医療福祉/非医療福祉を分離開示', 'IR分離開示「非医療福祉事業」', '株式会社トライトエンジニアリング'],
  ['テクノプロ', 'R&Dアウトソーシング / 施工管理アウトソーシング / 国内その他 / 海外', '報告セグメント「施工管理アウトソーシング」', '株式会社テクノプロ・コンストラクション'],
  [''],
  ['■ データソース'],
  ['1. EDINET API v2 で取得した有価証券報告書 XBRL→CSV変換データ (jpcrp030000-asr-001_*)'],
  ['2. トライトの建設セグメント数値: IR決算説明資料 (2025/2/13公表 FY2024通期決算プレゼン)'],
  ['3. 各社既存ワークディレクトリ: business-dd/work_<company>/edinet/'],
  [''],
  ['■ 重要な制約・前提'],
  ['1. ★ 「過去10年」フル取得可能なのは テクノプロ・オープンアップ系のみ。他3社は IPO 時期により取得期数が制約される'],
  ['   - コプロ: 2018/3 IPO → 取得 FY2019-FY2025 (7期、FY18は有報未取得)、サービス別建設売上はFY22以降のみ'],
  ['   - ナレル: 2023/7 IPO → 取得 FY2020-FY2025 (6期、FY20-21はI部の経営指標推移、FY22以降は有報)、セグメント別はFY22以降のみ'],
  ['   - オープンアップ: EDINETコードE05695として10期取得可能。但し2021/4経営統合でセグメント定義が変更（旧トラスト・テック→ビーネックス時代は機電・IT派遣中心、建設は別法人だった旧夢真HD）'],
  ['   - トライト: 2023/7 IPO + 2025/9 上場廃止 → 取得 FY2022-FY2024 (3期)。建設(非医療福祉)はEDINETでは単一セグメント開示のためIR資料からの取得'],
  ['   - テクノプロ: 2014/12 IPO で10期取得可能。施工管理セグメント別開示はFY16期もあるが、本Excelでは自動抽出可能なFY21-FY25のみセグメント別を表示'],
  [''],
  ['2. ★ 粗利率はセグメント別で開示なし (派遣業界の慣行)。連結ベースのみ取得。'],
  ['   セグメント別の収益性は「営業利益率」で代替するのが業界標準。'],
  [''],
  ['3. ★ コプロは単一セグメント開示のため、サービス別の営業利益・人員数は分離不可。'],
  ['   売上のみ収益認識注記から取得。'],
  [''],
  ['4. ★ トライトは EDINET で単一セグメント開示のため、建設(非医療福祉)セグメント'],
  ['   の売上は IR資料からの取得。営業利益・利益率はIRでも開示なし。'],
  [''],
  ['5. ★ オープンアップ建設セグメントの営業利益はFY23以降のみ開示。FY21・FY22は非開示。'],
  [''],
  ['■ シート構成'],
  ['README                       … 本シート'],
  ['建設セグ_売上                … 5社×5期 建設セグメント売上'],
  ['建設セグ_営業利益            … 5社×5期 建設セグメント営業利益'],
  ['建設セグ_営業利益率          … 5社×5期 建設セグメント営業利益率'],
  ['建設セグ_人員数              … 5社×5期 建設セグメント期末人員数'],
  ['連結_売上                    … 5社×5期 連結売上収益'],
  ['連結_営業利益                … 5社×5期 連結営業利益'],
  ['連結_営業利益率              … 5社×5期 連結営業利益率'],
  ['連結_粗利率                  … 5社×5期 連結粗利率'],
  ['連結_人員数                  … 5社×5期 連結期末人員数'],
  ['直近期サマリ                 … 各社直近決算期の全指標横並び'],
  ['詳細_<会社名>                … 各社 全指標×5期 + 注記'],
  [''],
  ['■ 凡例'],
  ['null/(空白)  … 不開示 (未開示 or 取得不能)'],
  ['数値       … 百万円単位 (人員数のみ「人」、利益率は%)'],
  [''],
  ['■ 取得不能な指標 (主要なもの)'],
  ['• コプロ: サービス別営業利益・利益率・人員数 (全期、単一セグメントのため構造的に不可)'],
  ['• ナレル: FY2021セグメント情報 (IPO前で有報自体なし)'],
  ['• オープンアップ: 建設セグ営業利益 FY2021・FY2022 (当時の開示方針)'],
  ['• オープンアップ: 建設セグ減価償却 (全期、有報セグ注記で開示なし)'],
  ['• トライト: 建設セグ営業利益・利益率 (全期、IRでも開示なし)'],
  ['• トライト: 建設セグ人員数 FY2022 (FY23以降のみIR開示)'],
  ['• 全社: 建設セグ別の粗利率 (派遣業界共通の開示慣行)'],
  ['• 全社: 建設セグ別の資産 (大半が不開示)'],
];
append(aoa(readmeData), 'README');

// === ヘルパ: 5社×5期マトリクス ===
const buildMatrix = (indicatorKey, indicatorLabel, unit) => {
  const header = ['会社', '決算月', ...fys];
  const rows = [
    [indicatorLabel + (unit ? ' (' + unit + ')' : '')],
    [],
    header,
  ];
  // 暦年表示行
  rows.push(['（暦年）', '', ...fys.map(_ => '')]);  // placeholder - will fill below
  for (const c of companies) {
    const row = [c.label, c.fye];
    for (const fy of fys) {
      const v = data[c.key]?.[fy]?.[indicatorKey];
      row.push(v === undefined || v === null ? null : v);
    }
    rows.push(row);
  }
  // 補足: 暦年マッピングを下部にも掲載
  rows.push([]);
  rows.push(['※決算月別の各FY=暦年対応']);
  rows.push(['会社', '決算月', ...fys]);
  for (const c of companies) {
    rows.push([c.short, c.fye, ...fys.map(fy => fyToCalYear[c.key][fy])]);
  }
  return aoa(rows);
};

append(buildMatrix('segment_revenue', '建設技術者派遣セグメント売上推移', '百万円'), '建設セグ_売上');
append(buildMatrix('segment_op_income', '建設技術者派遣セグメント営業利益推移', '百万円'), '建設セグ_営業利益');
append(buildMatrix('segment_op_margin', '建設技術者派遣セグメント営業利益率推移', '%'), '建設セグ_営業利益率');
append(buildMatrix('headcount_segment', '建設技術者派遣セグメント期末人員数推移', '人'), '建設セグ_人員数');
append(buildMatrix('consol_revenue', '連結売上収益推移', '百万円'), '連結_売上');
append(buildMatrix('consol_op_income', '連結営業利益推移', '百万円'), '連結_営業利益');
append(buildMatrix('consol_op_margin', '連結営業利益率推移', '%'), '連結_営業利益率');
append(buildMatrix('consol_gross_margin', '連結粗利率推移', '%'), '連結_粗利率');
append(buildMatrix('headcount_total', '連結期末人員数推移', '人'), '連結_人員数');

// === Sheet: 直近期サマリ (5社の直近決算期を横並び) ===
const directFy = (key) => key === 'trite' ? 'FY2024' : 'FY2025';
const directRows = [
  ['5社 直近決算期サマリ'],
  [],
  ['指標', '単位', ...companies.map(c => c.short)],
  ['対象期', '', ...companies.map(c => fyToCalYear[c.key][directFy(c.key)])],
  ['会計基準', '', ...companies.map(c => data._meta.accounting_standard[c.key])],
];
for (const ind of indicators) {
  const row = [ind.label, ind.unit];
  for (const c of companies) {
    const fy = directFy(c.key);
    const v = data[c.key]?.[fy]?.[ind.key];
    row.push(v === undefined || v === null ? null : v);
  }
  directRows.push(row);
}
// 構成比 (建設セグ売上 ÷ 連結売上)
directRows.push([]);
directRows.push(['【参考】建設セグ売上構成比 (建設セグ売上 / 連結売上)', '%']);
const compRow = ['建設セグ売上構成比', '%'];
for (const c of companies) {
  const fy = directFy(c.key);
  const segRev = data[c.key]?.[fy]?.segment_revenue;
  const consolRev = data[c.key]?.[fy]?.consol_revenue;
  if (segRev != null && consolRev != null && consolRev > 0) {
    compRow.push(Math.round(segRev / consolRev * 1000) / 10);
  } else {
    compRow.push(null);
  }
}
directRows.push(compRow);
append(aoa(directRows), '直近期サマリ');

// === Sheet: 各社別詳細 ===
for (const c of companies) {
  const header = ['指標', '単位', ...fys];
  const rows = [
    [c.label + ' 詳細データ'],
    ['決算月', c.fye, '会計基準', data._meta.accounting_standard[c.key]],
    ['セグメント定義', data._meta.segment_definitions[c.key]],
    [],
    header,
    ['対象暦年', '', ...fys.map(fy => fyToCalYear[c.key][fy])],
  ];
  for (const ind of indicators) {
    const row = [ind.label, ind.unit];
    for (const fy of fys) {
      const v = data[c.key]?.[fy]?.[ind.key];
      row.push(v === undefined || v === null ? null : v);
    }
    rows.push(row);
  }
  // 注記
  rows.push([]);
  rows.push(['【注記】']);
  for (const fy of fys) {
    const notes = data[c.key]?.[fy]?.notes;
    if (notes) rows.push([fy, notes]);
  }
  append(aoa(rows), `詳細_${c.short}`);
}

// === Sheet: IRクロスチェック ===
const irCheckRows = [
  ['IR資料とのダブルチェック (主要数値)'],
  [],
  ['注：直近期 (FY25 or FY24) の建設セグメント売上について、決算説明資料・統合報告書・中期経営計画と数値整合を確認'],
  [],
  ['会社', '指標', 'EDINET有報数値', 'IR資料数値', '一致/差異', '出典 (IR)', 'コメント'],
  ['コプロ', 'FY25 建設サービス売上', '26,740 百万円', '26,740 百万円', '一致', '2025/3期 決算説明資料 / 統合報告書2024', '収益認識注記の業種別売上と決算説明会の事業別売上は同値'],
  ['コプロ', 'FY25 連結売上', '30,015 百万円', '30,015 百万円', '一致', '2025/3期 決算短信', '-'],
  ['コプロ', 'FY25 派遣技術社員数', '4,861名 (派遣のみ)', '4,861名', '一致', '会社IR月次データ', '連結従業員5,154名のうち派遣技術社員4,861名 (建設は不分離)'],
  ['ナレル', 'FY25 建設ソリューション売上', '21,643 百万円', '21,643 百万円', '一致', '2025/10期 決算短信', '-'],
  ['ナレル', 'FY25 建設ソリューション営業利益', '2,247 百万円', '2,247 百万円', '一致', '2025/10期 決算短信', '営業利益率10.4% (前期13.5%から低下)'],
  ['ナレル', 'FY25 連結売上', '24,159 百万円', '24,159 百万円', '一致', '同上', '-'],
  ['オープンアップ', 'FY25 建設セグ売上', '56,904 百万円', '56,904 百万円', '一致', '2025/6期 決算説明資料', '前期比+26.5%'],
  ['オープンアップ', 'FY25 建設セグ営業利益', '7,537 百万円', '7,537 百万円', '一致', '同上', '営業利益率13.2% (前期15.3%から低下)'],
  ['オープンアップ', 'FY25 連結売上', '187,954 百万円', '187,954 百万円', '一致', '同上', 'IFRS, 海外/製造の事業整理影響あり'],
  ['トライト', 'FY24 非医療福祉 (建設) 売上', '不開示 (有報単一セグ)', '18,072 百万円', 'IRで補完', '2024/12期 通期決算プレゼン (2025/2/13)', '事業別売上はIR資料のみで開示。連結売上比 31.6%'],
  ['トライト', 'FY24 連結売上', '57,116 百万円', '57,116 百万円', '一致', '同上', '-'],
  ['トライト', 'FY24 連結営業利益', '5,186 百万円', '5,186 百万円', '一致', '同上', '前期比△31% (M&A費・先行投資)'],
  ['トライト', 'FY24末 建設派遣社員数', '不開示 (有報)', '約2,310名', 'IRで補完', '同上', '前期比+5%。FY23末は2,200名'],
  ['テクノプロ', 'FY25 施工管理売上', '25,564 百万円', '25,564 百万円', '一致', '2025/6期 決算説明資料', '-'],
  ['テクノプロ', 'FY25 施工管理営業利益', '3,699 百万円', '3,699 百万円', '一致', '同上', '営業利益率14.5% (高水準維持)'],
  ['テクノプロ', 'FY25 施工管理人員数', '2,973名', '2,973名', '一致', '同上', '前期2,583名から+15%'],
  ['テクノプロ', 'FY25 連結売上', '238,966 百万円', '238,966 百万円', '一致', '同上', '2025/9 BlackstoneがTOB完了→2025/12上場廃止予定'],
  [],
  ['【参考: 直近期建設セグメント売上構成比 (連結比)】'],
  ['会社', '建設セグ売上 (百万円)', '連結売上 (百万円)', '構成比'],
  ['コプロ', 26740, 30015, '89.1%'],
  ['ナレル', 21643, 24159, '89.6%'],
  ['オープンアップ', 56904, 187954, '30.3%'],
  ['トライト', 18072, 57116, '31.6%'],
  ['テクノプロ', 25564, 238966, '10.7%'],
  [],
  ['※コプロ・ナレルが建設特化型 (構成比~90%)、オープンアップ・トライトはハイブリッド型 (~30%)、テクノプロは最大手だが建設は補助セグメント (10%)'],
];
append(aoa(irCheckRows), 'IRクロスチェック');

// === 出力 ===
const outPath = path.join(__dirname, '建設技術者派遣5社_セグメント比較_FY16-FY25.xlsx');
XLSX.writeFile(wb, outPath);
// 旧版もrename
const oldOut = path.join(__dirname, '建設技術者派遣5社_セグメント比較_FY21-FY25.xlsx');
if (fs.existsSync(oldOut)) fs.unlinkSync(oldOut);
console.log('Wrote:', outPath);
console.log('Sheets:', wb.SheetNames.join(', '));
