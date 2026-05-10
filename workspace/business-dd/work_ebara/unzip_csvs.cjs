// EDINETのZIPを展開してCSVを取り出す
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EDIR = 'c:/Users/Kamei.Kenshi/Documents/dev/claude-code-book-template/workspace/business-dd/work_ebara/edinet';

const labels = ['FY2025_Dec', 'FY2024_Dec', 'FY2023_Dec', 'FY2022_Dec', 'FY2021_9M'];

for (const lab of labels) {
  const zipPath = path.join(EDIR, `yuho_${lab}.zip`);
  const outDir = path.join(EDIR, `csv_${lab}`);
  if (!fs.existsSync(zipPath)) { console.log(`skip ${lab}: no zip`); continue; }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  try {
    // Use PowerShell Expand-Archive
    execSync(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${outDir}'"`, { stdio: 'inherit' });
    console.log(`unzipped: ${lab}`);
  } catch (e) {
    console.log(`err ${lab}: ${e.message}`);
  }
}
