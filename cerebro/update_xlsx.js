// Regenera la hoja "2026" de Pelis.xlsx con los datos completos de cerebro/pelis_2026.csv
// No usa librerías: edita sharedStrings.xml y worksheets/sheet9.xml in situ.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const X = process.argv[2]; // carpeta con el xlsx descomprimido

// --- datos ---
function parseCSV(s){const rows=[];let f="",row=[],q=false;for(let i=0;i<s.length;i++){const c=s[i];
if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
else{if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else if(c==="\r"){}else f+=c;}}
if(f.length||row.length){row.push(f);rows.push(row);}return rows;}
const data = parseCSV(fs.readFileSync(path.join(ROOT,"cerebro/pelis_2026.csv"),"utf8")).slice(1).filter(r=>r.length>5);

const serial = iso => { const [y,m,d]=iso.split("-").map(Number); return Math.round((Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/864e5); };

// --- sharedStrings ---
const ssPath = path.join(X,"xl/sharedStrings.xml");
let ss = fs.readFileSync(ssPath,"utf8");
const unesc = t => t.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&");
const esc = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const strs = [...ss.matchAll(/<si>(.*?)<\/si>/gs)].map(m=>{
  return [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(x=>unesc(x[1])).join("");
});
const idx = new Map(strs.map((s,i)=>[s,i]));
const added = [];
function S(v){
  v = (v==null?"":String(v));
  if (idx.has(v)) return idx.get(v);
  const i = strs.length + added.length;
  idx.set(v,i); added.push(v);
  return i;
}

// --- filas de la hoja 2026 ---
// estilos observados: A -> s="2" (fila par) / s="4" (fila impar); B -> s="3"; C..F -> s="4"
let body = `<row r="1"><c r="A1" s="1" t="s"><v>0</v></c><c r="B1" s="1" t="s"><v>1</v></c><c r="C1" s="1" t="s"><v>2</v></c><c r="D1" s="1" t="s"><v>3</v></c><c r="E1" s="1" t="s"><v>4</v></c><c r="F1" s="1" t="s"><v>5</v></c></row>`;
data.forEach((r,n)=>{
  const rowNum = n + 2;
  const [numero,fecha,titulo,director,anio,pais] = r;
  const sa = rowNum % 2 === 0 ? "2" : "4";
  const cells = [];
  cells.push(`<c r="A${rowNum}" s="${sa}"><v>${Number(numero)}.0</v></c>`);
  cells.push(`<c r="B${rowNum}" s="3"><v>${serial(fecha)}.0</v></c>`);
  cells.push(`<c r="C${rowNum}" s="4" t="s"><v>${S(titulo)}</v></c>`);
  cells.push(`<c r="D${rowNum}" s="4" t="s"><v>${S(director)}</v></c>`);
  cells.push(anio ? `<c r="E${rowNum}" s="4"><v>${Number(anio)}.0</v></c>` : `<c r="E${rowNum}" s="4"/>`);
  cells.push(pais ? `<c r="F${rowNum}" s="4" t="s"><v>${S(pais)}</v></c>` : `<c r="F${rowNum}" s="4"/>`);
  body += `<row r="${rowNum}">${cells.join("")}</row>`;
});

// --- reescribir sheet9.xml ---
const shPath = path.join(X,"xl/worksheets/sheet9.xml");
let sh = fs.readFileSync(shPath,"utf8");
sh = sh.replace(/<sheetData>.*<\/sheetData>/s, `<sheetData>${body}</sheetData>`);
fs.writeFileSync(shPath, sh, "utf8");

// --- reescribir sharedStrings.xml ---
if (added.length){
  const extra = added.map(v=>`<si><t xml:space="preserve">${esc(v)}</t></si>`).join("");
  ss = ss.replace("</sst>", extra + "</sst>");
}
const total = strs.length + added.length;
ss = ss.replace(/count="\d+" uniqueCount="\d+"/, `count="${total}" uniqueCount="${total}"`);
fs.writeFileSync(ssPath, ss, "utf8");

console.log(`Hoja 2026: ${data.length} filas escritas. Strings nuevos: ${added.length}.`);
if (added.length) console.log(added.slice(0,40).join(" | "));
