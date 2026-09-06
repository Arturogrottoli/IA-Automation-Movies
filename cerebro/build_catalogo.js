// Une el histórico 2018-2025 (peliculas_import.csv) con el 2026 ya completo (pelis_2026.csv)
// -> cerebro/catalogo_completo.csv listo para importar a Airtable.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function parseCSV(s){const rows=[];let f="",row=[],q=false;for(let i=0;i<s.length;i++){const c=s[i];
if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
else{if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else if(c==="\r"){}else f+=c;}}
if(f.length||row.length){row.push(f);rows.push(row);}return rows;}
const esc = v => { v = v==null?"":String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v; };

const COLS = ["id","numero","titulo","director","anio_estreno","pais_origen","fecha_vista","anio_visto","es_revisionado","estado_enriquecimiento","fuente"];
const out = [COLS];

// --- histórico 2018-2025 ---
const hist = parseCSV(fs.readFileSync(path.join(ROOT,"cerebro/peliculas_import.csv"),"utf8"));
const hIdx = Object.fromEntries(hist[0].map((h,i)=>[h,i]));
for (const r of hist.slice(1)) {
  if (!r.length || +r[hIdx.anio_visto] >= 2026) continue;   // el 2026 viejo se descarta
  out.push(COLS.map(c => r[hIdx[c]] ?? ""));
}

// --- 2026 completo ---
const p26 = parseCSV(fs.readFileSync(path.join(ROOT,"cerebro/pelis_2026.csv"),"utf8"));
const pIdx = Object.fromEntries(p26[0].map((h,i)=>[h,i]));
for (const r of p26.slice(1)) {
  if (r.length < 6) continue;
  const num = r[pIdx.numero];
  out.push([
    "P2026-" + String(num).padStart(3,"0"),
    num,
    r[pIdx.titulo],
    r[pIdx.director],
    r[pIdx.anio_estreno],
    r[pIdx.pais_origen],
    r[pIdx.fecha_vista],
    "2026",
    r[pIdx.revision_2026].startsWith("Sí") || r[pIdx.visto_antes].startsWith("Sí") ? "Si" : "No",
    "Aprobada",
    "CSV historico",
  ]);
}

fs.writeFileSync(path.join(ROOT,"cerebro/catalogo_completo.csv"), out.map(r=>r.map(esc).join(",")).join("\r\n"), "utf8");
const y = {};
out.slice(1).forEach(r => y[r[7]] = (y[r[7]]||0)+1);
console.log(`catalogo_completo.csv: ${out.length-1} filas`);
console.log("por año visto:", JSON.stringify(y));
