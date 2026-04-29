// Verify generated xlsx
import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, 'fermi-estimation', 'output', '日本の1兆円市場マップ_FY2024.xlsx');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const ws = wb.getWorksheet(1);

console.log('Sheet name:', ws.name);
console.log('Dimensions:', ws.dimensions);
console.log('Total rows:', ws.rowCount);
console.log('');

console.log('=== Header row 3 ===');
const hdr = ws.getRow(3);
for (let c = 1; c <= 17; c++) console.log(`  col ${c}: ${hdr.getCell(c).value}`);

console.log('\n=== Per-parent count ===');
const counts = {};
for (let r = 4; r <= ws.rowCount; r++) {
  const p = ws.getRow(r).getCell(1).value;
  if (p) counts[p] = (counts[p] || 0) + 1;
}
for (const [p, n] of Object.entries(counts)) console.log(`  ${p}: ${n}`);
console.log(`Total: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);

console.log('\n=== Sample rows ===');
for (const r of [4, 12, 25, 40, 55, 70, 85]) {
  if (r > ws.rowCount) continue;
  const row = ws.getRow(r);
  const p = row.getCell(1).value;
  const seg = row.getCell(2).value;
  const sz = row.getCell(3).value;
  const struct = row.getCell(4).value;
  const c1 = row.getCell(6).value;
  const r1 = row.getCell(7).value;
  console.log(`row ${r}: ${p} / ${seg} / ${sz}兆 / ${struct} / 1位=${c1}(${r1}億)`);
}

console.log('\nVERIFY OK');
