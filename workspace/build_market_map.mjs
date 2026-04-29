// 日本の主要産業 サブセグメント別市場マップ (FY2024) — Excel生成スクリプト
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { MARKETS } from './market_map_data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Style constants =====
const FONT_HEADER = { name: 'Yu Gothic', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
const FONT_TITLE = { name: 'Yu Gothic', size: 14, bold: true, color: { argb: 'FF000000' } };
const FONT_BLACK = { name: 'Yu Gothic', size: 10, color: { argb: 'FF000000' } };
const FONT_BLACK_B = { name: 'Yu Gothic', size: 10, bold: true, color: { argb: 'FF000000' } };
const FONT_LINK = { name: 'Yu Gothic', size: 10, underline: true, color: { argb: 'FF0563C1' } };

const FILL_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } };
const FILL_PARENT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
const FILL_ALT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FB' } };

const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
};

const FMT_OKU = '#,##0';
const FMT_TRN = '0.0"兆円"';

// ===== Build workbook =====
async function build() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Claude Code';
  wb.created = new Date();

  const ws = wb.addWorksheet('1兆円市場マップ', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }],
  });

  // Columns:
  // A: 親産業 / B: サブセグメント / C: 市場規模(兆円) / D: 市場構造 / E: 100億規模プレイヤー目安
  // F-O: 上位5社の社名+売上(億円) / P: 出典(市場規模) / Q: 注記
  const widths = [12, 26, 11, 11, 18,
                  20, 11, 20, 11, 20, 11, 20, 11, 20, 11,
                  38, 30];
  ws.columns = widths.map((w) => ({ width: w }));

  // Title row 1
  ws.mergeCells('A1:Q1');
  const titleCell = ws.getCell('A1');
  titleCell.value = '日本の主要産業 サブセグメント別 市場マップ (FY2024) — 親産業 / サブセグメント / 市場規模 / 市場構造 / 上位5社のセグメント売上';
  titleCell.font = FONT_TITLE;
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 26;

  // Header row 3
  const headers = [
    '親産業', 'サブセグメント', '市場規模(兆円)', '市場構造', '100億規模プレイヤー目安',
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

  // Data rows from row 4
  let prevParent = null;
  let rowIdx = 4;
  for (const m of MARKETS) {
    const parentChanged = m.parent !== prevParent;
    prevParent = m.parent;

    const row = ws.getRow(rowIdx);
    row.getCell(1).value = m.parent;
    row.getCell(2).value = m.segment;
    row.getCell(3).value = m.size_trillion;
    row.getCell(4).value = m.structure || '';
    row.getCell(5).value = m.pl_layer || '';

    const comps = m.companies || [];
    for (let i = 0; i < 5; i++) {
      const nameCell = row.getCell(6 + i * 2);
      const revCell = row.getCell(7 + i * 2);
      if (i < comps.length) {
        nameCell.value = comps[i].name || null;
        revCell.value = comps[i].revenue_oku || null;
      } else {
        nameCell.value = null;
        revCell.value = null;
      }
    }

    // Size source as hyperlink (col 16)
    const sizeSrcCell = row.getCell(16);
    if (m.size_url) {
      sizeSrcCell.value = { text: m.size_source || '', hyperlink: m.size_url };
      sizeSrcCell.font = FONT_LINK;
    } else {
      sizeSrcCell.value = m.size_source || '';
      sizeSrcCell.font = FONT_BLACK;
    }

    // Note (col 17)
    row.getCell(17).value = m.note || '';
    row.getCell(17).font = FONT_BLACK;

    // Apply formatting
    for (let col = 1; col <= 17; col++) {
      const cell = row.getCell(col);
      if (col !== 16 || !m.size_url) cell.font = FONT_BLACK;
      cell.border = BORDER_THIN;
      const numericCol = [3, 7, 9, 11, 13, 15].includes(col);
      cell.alignment = {
        horizontal: numericCol ? 'right' : 'left',
        vertical: 'middle',
        wrapText: col === 5 || col === 16 || col === 17,
      };
      if (parentChanged && col === 1) {
        cell.fill = FILL_PARENT;
        cell.font = FONT_BLACK_B;
      } else if (col === 1 || col === 2) {
        cell.fill = FILL_ALT;
      }
    }

    row.getCell(3).numFmt = FMT_TRN;
    for (const col of [7, 9, 11, 13, 15]) row.getCell(col).numFmt = FMT_OKU;

    row.height = 50;
    rowIdx++;
  }

  // Auto filter
  ws.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: rowIdx - 1, column: 17 },
  };

  // Output
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
