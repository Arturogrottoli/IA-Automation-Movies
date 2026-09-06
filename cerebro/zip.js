// Mini-zipper sin dependencias: recomprime una carpeta a un .xlsx válido (nombres con "/").
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const srcDir = process.argv[2];
const outFile = process.argv[3];

function walk(dir, base = "") {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = base ? base + "/" + e.name : e.name;
    if (e.isDirectory()) out = out.concat(walk(full, rel));
    else out.push(rel);
  }
  return out;
}

let files = walk(srcDir);
// [Content_Types].xml primero, luego _rels, luego el resto
files.sort((a, b) => {
  const rank = f => (f === "[Content_Types].xml" ? 0 : f.startsWith("_rels/") ? 1 : 2);
  return rank(a) - rank(b) || a.localeCompare(b);
});

const crc32 = buf => zlib.crc32(buf) >>> 0;

const chunks = [];
const central = [];
let offset = 0;

for (const name of files) {
  const data = fs.readFileSync(path.join(srcDir, name));
  const comp = zlib.deflateRawSync(data, { level: 9 });
  const nameBuf = Buffer.from(name, "utf8");
  const crc = crc32(data);

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);      // version needed
  lh.writeUInt16LE(0x0800, 6);  // flag: UTF-8 names
  lh.writeUInt16LE(8, 8);       // method: deflate
  lh.writeUInt16LE(0, 10);      // time
  lh.writeUInt16LE(0, 12);      // date
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(comp.length, 18);
  lh.writeUInt32LE(data.length, 22);
  lh.writeUInt16LE(nameBuf.length, 26);
  lh.writeUInt16LE(0, 28);
  chunks.push(lh, nameBuf, comp);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0);
  ch.writeUInt16LE(20, 4);      // version made by
  ch.writeUInt16LE(20, 6);      // version needed
  ch.writeUInt16LE(0x0800, 8);  // flag: UTF-8
  ch.writeUInt16LE(8, 10);      // method
  ch.writeUInt16LE(0, 12);
  ch.writeUInt16LE(0, 14);
  ch.writeUInt32LE(crc, 16);
  ch.writeUInt32LE(comp.length, 20);
  ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(nameBuf.length, 28);
  ch.writeUInt16LE(0, 30);
  ch.writeUInt16LE(0, 32);
  ch.writeUInt16LE(0, 34);
  ch.writeUInt16LE(0, 36);
  ch.writeUInt32LE(0, 38);
  ch.writeUInt32LE(offset, 42);
  central.push(Buffer.concat([ch, nameBuf]));

  offset += lh.length + nameBuf.length + comp.length;
}

const centralBuf = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralBuf.length, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

fs.writeFileSync(outFile, Buffer.concat([...chunks, centralBuf, eocd]));
console.log(`${outFile}: ${files.length} entradas, ${fs.statSync(outFile).size} bytes`);
