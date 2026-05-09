// Unzip all *_csv.zip files in edinet/ directory using pure Node (no external)
// Implements minimal ZIP central-directory parser; supports stored (0) and deflate (8).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readUInt16LE(buf, off) { return buf.readUInt16LE(off); }
function readUInt32LE(buf, off) { return buf.readUInt32LE(off); }

function parseZip(buf) {
  // find EOCD: signature 0x06054b50
  let eocdOff = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOff = i; break; }
  }
  if (eocdOff < 0) throw new Error('EOCD not found');
  const totalEntries = readUInt16LE(buf, eocdOff + 10);
  const cdSize = readUInt32LE(buf, eocdOff + 12);
  const cdOff = readUInt32LE(buf, eocdOff + 16);

  const entries = [];
  let p = cdOff;
  for (let i = 0; i < totalEntries; i++) {
    if (readUInt32LE(buf, p) !== 0x02014b50) throw new Error('CDH not found at ' + p);
    const method = readUInt16LE(buf, p + 10);
    const compSize = readUInt32LE(buf, p + 20);
    const uncompSize = readUInt32LE(buf, p + 24);
    const nameLen = readUInt16LE(buf, p + 28);
    const extraLen = readUInt16LE(buf, p + 30);
    const commentLen = readUInt16LE(buf, p + 32);
    const localOff = readUInt32LE(buf, p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    entries.push({ name, method, compSize, uncompSize, localOff });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function extractEntry(buf, e, destDir) {
  // local file header
  if (buf.readUInt32LE(e.localOff) !== 0x04034b50) throw new Error('LFH bad');
  const nameLen = readUInt16LE(buf, e.localOff + 26);
  const extraLen = readUInt16LE(buf, e.localOff + 28);
  const dataOff = e.localOff + 30 + nameLen + extraLen;
  const data = buf.slice(dataOff, dataOff + e.compSize);
  let out;
  if (e.method === 0) {
    out = data;
  } else if (e.method === 8) {
    out = zlib.inflateRawSync(data);
  } else {
    throw new Error('Unsupported method ' + e.method);
  }
  const fp = path.join(destDir, e.name);
  if (e.name.endsWith('/')) {
    fs.mkdirSync(fp, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, out);
  }
}

const OUT = path.join(__dirname, 'edinet');
const files = fs.readdirSync(OUT).filter(f => f.endsWith('_csv.zip'));
for (const f of files) {
  const src = path.join(OUT, f);
  const dst = path.join(OUT, f.replace(/\.zip$/, ''));
  if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  try {
    const buf = fs.readFileSync(src);
    const entries = parseZip(buf);
    for (const e of entries) extractEntry(buf, e, dst);
    console.log(`OK ${f} -> ${entries.length} entries`);
  } catch (e) {
    console.error(`ERR ${f}: ${e.message}`);
  }
}
