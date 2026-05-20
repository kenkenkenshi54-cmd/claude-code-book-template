// 日本の主要産業 サブセグメント別市場マップ (FY2024) — Excel生成スクリプト v4
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { MARKETS as RAW_MARKETS } from './market_map_data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PARENT_ORDER = [
  '自動車', '建設', '不動産・建物管理',
  '製造業', 'エレクトロニクス', '機械',
  'インフラ・環境',
  '物流・運輸',
  '小売', '外食', '食品・飲料',
  'ヘルスケア',
  '情報・通信',
  '専門サービス', '金融',
  '娯楽・エンタメ', 'レジャー・観光',
  '教育', '農林水産', '公共・防衛',
];

const MARKETS = [...RAW_MARKETS].sort((a, b) => {
  const ai = PARENT_ORDER.indexOf(a.parent);
  const bi = PARENT_ORDER.indexOf(b.parent);
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
});

// ===== Style constants =====
const FONT_HEADER = { name: 'Yu Gothic', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
const FONT_TITLE = { name: 'Yu Gothic', size: 14, bold: true, color: { argb: 'FF000000' } };
const FONT_BLACK = { name: 'Yu Gothic', size: 10, color: { argb: 'FF000000' } };
const FONT_BLACK_B = { name: 'Yu Gothic', size: 10, bold: true, color: { argb: 'FF000000' } };
const FONT_RED = { name: 'Yu Gothic', size: 10, color: { argb: 'FFC00000' } };
const FONT_GREY = { name: 'Yu Gothic', size: 10, color: { argb: 'FF808080' } };
const FONT_LINK = { name: 'Yu Gothic', size: 10, underline: true, color: { argb: 'FF0563C1' } };

const FILL_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } };
const FILL_PARENT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
const FILL_ALT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FB' } };
const FILL_AGG_PARENT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const FILL_AGG_CHILD = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
const FILL_BASIS_FLAG = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };

const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
};

const FMT_OKU = '#,##0';
const FMT_TRN = '0.0"兆円"';

async function build() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Claude Code';
  wb.created = new Date();

  const ws = wb.addWorksheet('1兆円市場マップ', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }],
  });

  // 19 columns:
  // A:親産業 / B:サブセグ / C:市場規模(兆円) / D:規模ベース / E:集計ステータス / F:市場構造 / G:100億規模PL層
  // H-Q:上位5社 / R:出典(市場規模) / S:注記
  const widths = [
    12, 30, 11, 22, 14, 11, 18,
    20, 11, 20, 11, 20, 11, 20, 11, 20, 11,
    38, 30,
  ];
  ws.columns = widths.map((w) => ({ width: w }));

  ws.mergeCells('A1:S1');
  const titleCell = ws.getCell('A1');
  titleCell.value = '日本の主要産業 サブセグメント別 市場マップ (FY2024) — 規模ベース/集計ステータスを明示し二重カウントを抑制';
  titleCell.font = FONT_TITLE;
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 26;

  const headers = [
    '親産業', 'サブセグメント', '市場規模(兆円)', '規模ベース', '集計ステータス', '市場構造', '100億規模プレイヤー目安',
    '1位 社名', '1位 売上(億円)',
    '2位 社名', '2位 売上(億円)',
    '3位 社名', '3位 売上(億円)',
    '4位 社名', '4位 売上(億円)',
    '5位 社名', '5位 売上(億円)',
    '出典 (市場規模)', '注記',
  ];
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = FONT_HEADER;
    c.fill = FILL_HEADER;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = BORDER_THIN;
  });
  headerRow.height = 38;

  let prevParent = null;
  let rowIdx = 4;
  for (const m of MARKETS) {
    const parentChanged = m.parent !== prevParent;
    prevParent = m.parent;
    const basis = m.size_basis || '売上/出荷額';
    const isFlow = !/取扱高|運用資産|粗利益|保険料収入|国民医療費|介護費用/.test(basis);
    const agg = m.aggregation || '';

    const row = ws.getRow(rowIdx);
    row.getCell(1).value = m.parent;
    row.getCell(2).value = m.segment;
    row.getCell(3).value = m.size_trillion;
    row.getCell(4).value = basis;
    row.getCell(5).value = agg;
    row.getCell(6).value = m.structure || '';
    row.getCell(7).value = m.pl_layer || '';

    const comps = m.companies || [];
    for (let i = 0; i < 5; i++) {
      const nameCell = row.getCell(8 + i * 2);
      const revCell = row.getCell(9 + i * 2);
      if (i < comps.length) {
        nameCell.value = comps[i].name || null;
        revCell.value = comps[i].revenue_oku || null;
      } else {
        nameCell.value = null;
        revCell.value = null;
      }
    }

    const sizeSrcCell = row.getCell(18);
    if (m.size_url) {
      sizeSrcCell.value = { text: m.size_source || '', hyperlink: m.size_url };
      sizeSrcCell.font = FONT_LINK;
    } else {
      sizeSrcCell.value = m.size_source || '';
      sizeSrcCell.font = FONT_BLACK;
    }

    row.getCell(19).value = m.note || '';
    row.getCell(19).font = FONT_BLACK;

    for (let col = 1; col <= 19; col++) {
      const cell = row.getCell(col);
      if (col !== 18 || !m.size_url) cell.font = FONT_BLACK;
      cell.border = BORDER_THIN;
      const numericCol = [3, 9, 11, 13, 15, 17].includes(col);
      cell.alignment = {
        horizontal: numericCol ? 'right' : 'left',
        vertical: 'middle',
        wrapText: col === 4 || col === 7 || col === 18 || col === 19,
      };
      if (parentChanged && col === 1) {
        cell.fill = FILL_PARENT;
        cell.font = FONT_BLACK_B;
      } else if (col === 1 || col === 2) {
        cell.fill = FILL_ALT;
      }
    }

    // 規模ベース列 (D=4) の色付け: 取扱高/運用資産/粗利益等は注意喚起色
    if (!isFlow) {
      row.getCell(4).fill = FILL_BASIS_FLAG;
      row.getCell(4).font = FONT_RED;
    } else {
      row.getCell(4).font = FONT_GREY;
    }

    // 集計ステータス列 (E=5) の色付け
    if (agg === '★親') {
      row.getCell(5).fill = FILL_AGG_PARENT;
      row.getCell(5).font = FONT_BLACK_B;
    } else if (agg === '☆子') {
      row.getCell(5).fill = FILL_AGG_CHILD;
      row.getCell(5).font = FONT_BLACK;
    }

    row.getCell(3).numFmt = FMT_TRN;
    for (const col of [9, 11, 13, 15, 17]) row.getCell(col).numFmt = FMT_OKU;

    row.height = 50;
    rowIdx++;
  }

  ws.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: rowIdx - 1, column: 19 },
  };

  const outDir = path.join(__dirname, 'fermi-estimation', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, '日本の1兆円市場マップ_FY2024.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`Saved: ${outPath}`);
  console.log(`Markets: ${MARKETS.length} rows`);
  console.log(`Parents: ${new Set(MARKETS.map((m) => m.parent)).size}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
