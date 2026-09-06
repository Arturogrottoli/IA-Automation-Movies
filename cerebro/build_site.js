// Refresca la instantánea de datos embebida en ../index.html desde catalogo_completo.csv.
// El sitio en vivo lee la hoja publicada; esto es solo el fallback para cuando no hay conexión.
//   node cerebro/build_site.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function parseCSV(s){const rows=[];let f="",row=[],q=false;for(let i=0;i<s.length;i++){const c=s[i];
if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
else{if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else if(c!=="\r"){f+=c;}}}
if(f.length||row.length){row.push(f);rows.push(row);}return rows;}

const rows = parseCSV(fs.readFileSync(path.join(ROOT,"cerebro/catalogo_completo.csv"),"utf8"));
const I = Object.fromEntries(rows[0].map((h,i)=>[h,i]));
const data = rows.slice(1).filter(r=>r.length>5).map(r=>[
  r[I.titulo], r[I.director], +r[I.anio_estreno]||null, r[I.pais_origen], r[I.fecha_vista], +r[I.anio_visto]||null
]);

const file = path.join(ROOT,"index.html");
let html = fs.readFileSync(file,"utf8");
html = html.replace(/const EMBEDDED = .*?;\n/, `const EMBEDDED = ${JSON.stringify(data)};\n`);
fs.writeFileSync(file, html);
console.log(`index.html: instantánea con ${data.length} películas.`);
