// Refresca la instantánea de datos para la app Angular (fallback offline).
// Equivalente a build_site.js, pero escribe un archivo JSON estático en vez
// de parchear un literal dentro de index.html.
//   node cerebro/build_ng_snapshot.js
const fs = require("fs");
const path = require("path");
const htmlFile = path.join(__dirname, "..", "index.html");
const outFile = path.join(__dirname, "..", "app", "public", "data", "catalog-snapshot.json");

function parseCSV(s){const rows=[];let f="",row=[],q=false;for(let i=0;i<s.length;i++){const c=s[i];
if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
else{if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else if(c!=="\r"){f+=c;}}}
if(f.length||row.length){row.push(f);rows.push(row);}return rows;}

const html = fs.readFileSync(htmlFile, "utf8");
const src = html.match(/const SHEET_CSV_URL = "([^"]+)"/);
if (!src) { console.error("Falta SHEET_CSV_URL en index.html"); process.exit(1); }

fetch(src[1]).then(r => r.text()).then(txt => {
  const rows = parseCSV(txt);
  const h = rows[0].map(x => x.trim());
  const ix = k => h.indexOf(k);
  const c = { t:ix("titulo"), d:ix("director"), ay:ix("anio_estreno"), p:ix("pais_origen"), f:ix("fecha_vista"), vy:ix("anio_visto"), fu:ix("fuente") };
  const data = rows.slice(1)
    .filter(r => r.length > c.t && (r[c.t]||"").trim())
    .map(r => [r[c.t], r[c.d]||"", +r[c.ay]||null, r[c.p]||"", r[c.f]||"", +r[c.vy]||null, r[c.fu]||""]);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data));
  console.log(`Refrescado app/public/data/catalog-snapshot.json con ${data.length} filas.`);
});
