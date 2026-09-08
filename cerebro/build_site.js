// Refresca la instantánea de datos embebida en ../index.html
// y la copia portable cerebro/catalogo_completo.csv, desde la hoja publicada.
//   node cerebro/build_site.js
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "index.html");
const csvFile = path.join(__dirname, "catalogo_completo.csv");

function parseCSV(s){const rows=[];let f="",row=[],q=false;for(let i=0;i<s.length;i++){const c=s[i];
if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
else{if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else if(c!=="\r"){f+=c;}}}
if(f.length||row.length){row.push(f);rows.push(row);}return rows;}

let html = fs.readFileSync(file, "utf8");
const src = html.match(/const SHEET_CSV_URL = "([^"]+)"/);
if (!src) { console.error("Falta SHEET_CSV_URL en index.html"); process.exit(1); }

fetch(src[1]).then(r => r.text()).then(txt => {
  fs.writeFileSync(csvFile, txt.replace(/\r\n/g, "\n"));
  const rows = parseCSV(txt);
  const h = rows[0].map(x => x.trim());
  const ix = k => h.indexOf(k);
  const c = { t:ix("titulo"), d:ix("director"), ay:ix("anio_estreno"), p:ix("pais_origen"), f:ix("fecha_vista"), vy:ix("anio_visto") };
  const data = rows.slice(1)
    .filter(r => r.length > c.t && (r[c.t]||"").trim())
    .map(r => [r[c.t], r[c.d]||"", +r[c.ay]||null, r[c.p]||"", r[c.f]||"", +r[c.vy]||null]);
  html = html.replace(/const EMBEDDED = \[.*?\];\n/, () => `const EMBEDDED = ${JSON.stringify(data)};\n`);
  fs.writeFileSync(file, html);
  console.log(`Refrescado con ${data.length} películas: index.html + cerebro/catalogo_completo.csv`);
});
