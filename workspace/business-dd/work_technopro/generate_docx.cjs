// Convert report_draft.md to docx using the `docx` package
// Resolves docx from project root node_modules
const fs = require('fs');
const path = require('path');

const ROOT_NM = path.resolve(__dirname, '..', '..', '..', 'node_modules');
const docxPath = path.join(ROOT_NM, 'docx');
const docx = require(docxPath);
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  convertInchesToTwip,
} = docx;

const MD_FILE = path.join(__dirname, 'report_draft.md');
const OUT_FILE = path.resolve(__dirname, '..', 'output', `technopro_business_dd_${getDateStr()}.docx`);

function getDateStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

const FONT = 'Arial';
const COLOR = {
  H1: '1F3A5F', H2: '2C4F7A', H3: '404040',
  HEADER_BG: '1F3A5F', HEADER_FG: 'FFFFFF',
  ALT_ROW: 'F2F4F7',
};

// Inline parser: handles **bold** in text
function parseInline(text) {
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0; let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
    parts.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  if (parts.length === 0) parts.push({ text, bold: false });
  return parts;
}

function makeRuns(text, opts = {}) {
  const { size = 21, color = '000000', italic = false } = opts;
  return parseInline(text).map(p => new TextRun({
    text: p.text, bold: p.bold, italics: italic, size, color, font: FONT,
  }));
}

function p(text, opts = {}) {
  const { size = 21, color = '000000', after = 80, before = 0, italic = false, alignment = AlignmentType.LEFT, indent = 0 } = opts;
  return new Paragraph({
    alignment,
    spacing: { before, after, line: 280 },
    indent: indent ? { left: convertInchesToTwip(indent) } : undefined,
    children: makeRuns(text, { size, color, italic }),
  });
}

function h1(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: COLOR.H1, font: FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 25, color: COLOR.H2, font: FONT })],
  });
}
function h3(text) {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 23, color: COLOR.H3, font: FONT })],
  });
}
function h4(text) {
  return new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text, bold: true, size: 21, color: '595959', font: FONT })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 40, line: 280 },
    children: makeRuns(text, { size: 20 }),
  });
}

function num(text, n) {
  return new Paragraph({
    spacing: { after: 40, line: 280 },
    indent: { left: convertInchesToTwip(0.25) },
    children: [new TextRun({ text: `${n}. `, bold: true, size: 21, font: FONT }), ...makeRuns(text, { size: 21 })],
  });
}

function makeCell(text, opts = {}) {
  const { bg, bold = false, color = '000000', size = 18, alignment = AlignmentType.LEFT, width } = opts;
  const w = width ? { size: width, type: WidthType.PERCENTAGE } : undefined;
  return new TableCell({
    width: w,
    shading: bg ? { type: docx.ShadingType.SOLID, color: bg, fill: bg } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      alignment,
      spacing: { line: 240 },
      children: makeRuns(text, { size, color, bold }),
    })],
  });
}

function makeTable(rows) {
  const colCount = rows[0].length;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, i) => new TableRow({
      children: r.map(cell => {
        if (i === 0) {
          return makeCell(cell, { bg: COLOR.HEADER_BG, color: COLOR.HEADER_FG, bold: true, alignment: AlignmentType.CENTER });
        }
        const isAltRow = i % 2 === 0;
        return makeCell(cell, { bg: isAltRow ? COLOR.ALT_ROW : undefined });
      })
    })),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'BFBFBF' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'BFBFBF' },
    },
  });
}

// --- Markdown parser ---
function parseMd(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    // H1
    if (/^#\s/.test(line)) { out.push({ type: 'h1', text: line.replace(/^#\s+/, '') }); i++; continue; }
    if (/^##\s/.test(line)) { out.push({ type: 'h2', text: line.replace(/^##\s+/, '') }); i++; continue; }
    if (/^###\s/.test(line)) { out.push({ type: 'h3', text: line.replace(/^###\s+/, '') }); i++; continue; }
    if (/^####\s/.test(line)) { out.push({ type: 'h4', text: line.replace(/^####\s+/, '') }); i++; continue; }
    // HR
    if (/^---+$/.test(line.trim())) { i++; continue; }
    // Table
    if (/^\|/.test(line) && /\|/.test(lines[i + 1] || '') && /[-:]+/.test(lines[i + 1] || '')) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        if (/^\|[\s\-:|]+\|$/.test(lines[i].trim())) { i++; continue; }
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        rows.push(cells);
        i++;
      }
      out.push({ type: 'table', rows });
      continue;
    }
    // Bullet
    if (/^-\s/.test(line)) {
      out.push({ type: 'bullet', text: line.replace(/^-\s+/, '') });
      i++; continue;
    }
    // Numbered
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      out.push({ type: 'num', n: numMatch[1], text: numMatch[2] });
      i++; continue;
    }
    // Block quote
    if (/^>\s/.test(line)) {
      out.push({ type: 'quote', text: line.replace(/^>\s+/, '') });
      i++; continue;
    }
    // Plain paragraph (collect contiguous lines)
    let buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^[#\-|>]|^\d+\.\s/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push({ type: 'p', text: buf.join(' ').replace(/\s+/g, ' ').trim() });
  }
  return out;
}

function tokensToDocx(tokens) {
  const children = [];
  for (const t of tokens) {
    if (t.type === 'h1') children.push(h1(t.text));
    else if (t.type === 'h2') children.push(h2(t.text));
    else if (t.type === 'h3') children.push(h3(t.text));
    else if (t.type === 'h4') children.push(h4(t.text));
    else if (t.type === 'p') children.push(p(t.text));
    else if (t.type === 'bullet') children.push(bullet(t.text));
    else if (t.type === 'num') children.push(num(t.text, t.n));
    else if (t.type === 'quote') children.push(p(t.text, { italic: true, color: '595959', indent: 0.25 }));
    else if (t.type === 'table') {
      children.push(makeTable(t.rows));
      children.push(p('', { after: 60 }));
    }
  }
  return children;
}

(async () => {
  const md = fs.readFileSync(MD_FILE, 'utf8');
  const tokens = parseMd(md);
  const children = tokensToDocx(tokens);

  const doc = new Document({
    creator: 'Business DD Skill',
    title: 'テクノプロ・ホールディングス ビジネスDD',
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.9),
            right: convertInchesToTwip(0.9),
            bottom: convertInchesToTwip(0.9),
            left: convertInchesToTwip(0.9),
          },
        },
      },
      children,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  if (!fs.existsSync(path.dirname(OUT_FILE))) fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log(`Wrote: ${OUT_FILE} (${buf.length} bytes)`);
})();
