// 監査スクリプト v2: 集計ステータス&規模ベースを考慮した GDP比較
import { MARKETS } from './market_map_data.mjs';

const sumAll = MARKETS.reduce((a, m) => a + (m.size_trillion || 0), 0);
const sumExclParent = MARKETS.filter((m) => m.aggregation !== '★親').reduce((a, m) => a + (m.size_trillion || 0), 0);
const sumExclChild = MARKETS.filter((m) => m.aggregation !== '☆子').reduce((a, m) => a + (m.size_trillion || 0), 0);
const sumExclFlow = MARKETS.filter((m) => {
  const b = m.size_basis || '';
  return !/取扱高|運用資産/.test(b);
}).reduce((a, m) => a + (m.size_trillion || 0), 0);

const GDP = 609;
console.log('=== 合計シナリオ ===');
console.log(`(1) 全エントリ単純合計        : ${sumAll.toFixed(0)}兆円 (GDP比 ${(sumAll/GDP*100).toFixed(0)}%)`);
console.log(`(2) ★親除外 (子のみ)         : ${sumExclParent.toFixed(0)}兆円 (GDP比 ${(sumExclParent/GDP*100).toFixed(0)}%)`);
console.log(`(3) ☆子除外 (親のみ)         : ${sumExclChild.toFixed(0)}兆円 (GDP比 ${(sumExclChild/GDP*100).toFixed(0)}%)`);
console.log(`(4) 取扱高/運用資産除外       : ${sumExclFlow.toFixed(0)}兆円 (GDP比 ${(sumExclFlow/GDP*100).toFixed(0)}%)`);
console.log(`参考 日本名目GDP (FY2024)     : ${GDP}兆円`);
console.log('');

console.log('=== 親産業別合計 ===');
const byParent = {};
for (const m of MARKETS) {
  byParent[m.parent] = (byParent[m.parent] || 0) + (m.size_trillion || 0);
}
for (const [p, s] of Object.entries(byParent).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${p.padEnd(18)}: ${s.toFixed(1)}兆円`);
}

console.log('\n=== ★親/☆子マーキング ===');
const parents = MARKETS.filter((m) => m.aggregation === '★親');
const children = MARKETS.filter((m) => m.aggregation === '☆子');
console.log(`★親 (${parents.length}件):`);
for (const m of parents) console.log(`  ${m.size_trillion}兆: ${m.parent} / ${m.segment}`);
console.log(`☆子 (${children.length}件):`);
for (const m of children) console.log(`  ${m.size_trillion}兆: ${m.parent} / ${m.segment}`);

console.log('\n=== 規模ベース集計 ===');
const byBasis = {};
for (const m of MARKETS) {
  const b = m.size_basis || '売上/出荷額';
  byBasis[b] = (byBasis[b] || 0) + 1;
}
for (const [b, n] of Object.entries(byBasis).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${b}: ${n}件`);
}

console.log(`\n総エントリ数: ${MARKETS.length} / 親産業数: ${new Set(MARKETS.map((m) => m.parent)).size}`);
