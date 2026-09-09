// Compara cada película contra la ficha de TMDB que ya matcheó por año
// (el id guardado en posters.json). Marca director o año que no coinciden.
// No cambia nada — solo reporta a cerebro/check_datos.txt
//   node cerebro/check_datos.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const token = fs.readFileSync(path.join(__dirname, "tmdb.key"), "utf8").trim();
const H = { headers: { Authorization: "Bearer " + token, accept: "application/json" } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();

function parseCSV(s){const rows=[];let f="",row=[],q=false;for(let i=0;i<s.length;i++){const c=s[i];
if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
else{if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else if(c!=="\r"){f+=c;}}}
if(f.length||row.length){row.push(f);rows.push(row);}return rows;}

async function tmdb(u){ for(let i=0;i<4;i++){ const r=await fetch("https://api.themoviedb.org/3"+u,H); if(r.status===429){await sleep(1500);continue;} if(!r.ok)return null; return r.json(); } return null; }

// ¿algún token del apellido en común? (tolera "Joel Coen" vs "Joel Coen, Ethan Coen")
function dirMatch(a, b){
  const wa = new Set(norm(a).split(" ").filter(x=>x.length>2));
  const wb = norm(b).split(" ").filter(x=>x.length>2);
  return wb.some(x => wa.has(x));
}

(async () => {
  const posters = JSON.parse(fs.readFileSync(path.join(ROOT, "posters.json"), "utf8"));
  const pkey = (t,y) => norm(t) + "|" + (y||"");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const url = html.match(/const SHEET_CSV_URL = "([^"]+)"/)[1];
  const rows = parseCSV(await (await fetch(url)).text());
  const I = Object.fromEntries(rows[0].map((h,i)=>[h.trim(),i]));

  const seen = new Set(), movies = [];
  rows.slice(1).forEach((r,i) => {
    const t=(r[I.titulo]||"").trim(), y=+r[I.anio_estreno]||null, d=(r[I.director]||"").trim();
    if (!t) return;
    const k = norm(t)+"|"+y;
    if (seen.has(k)) return; seen.add(k);
    movies.push({ fila: i+2, t, y, d });
  });

  const flags = [];
  let n = 0;
  for (const m of movies) {
    n++;
    const px = posters[pkey(m.t, m.y)];
    if (!px || !px.tmdb) continue;          // no matcheó en el backfill
    const det = await tmdb(`/movie/${px.tmdb}?language=es&append_to_response=credits`);
    if (!det) { await sleep(40); continue; }
    const ty = +(det.release_date||"").slice(0,4) || null;
    const td = (det.credits?.crew||[]).filter(c => c.job === "Director").map(c => c.name);

    const yearBad = m.y && ty && Math.abs(ty - m.y) > 1;
    const dirBad  = m.d && td.length && !td.some(x => dirMatch(m.d, x));
    if (yearBad || dirBad) {
      flags.push({ ...m, tmdb_t: det.title, tmdb_y: ty, tmdb_d: td.join(", "),
        motivo: [yearBad && "año", dirBad && "director"].filter(Boolean).join(" + ") });
    }
    await sleep(40);
    if (n % 100 === 0) process.stdout.write(`  ${n}/${movies.length}\r`);
  }

  const out = flags.sort((a,b)=>a.fila-b.fila).map(f =>
    `fila ${f.fila}  "${f.t}" (${f.y||"?"} · ${f.d||"?"})\n   TMDB: ${f.tmdb_t} (${f.tmdb_y} · ${f.tmdb_d})   [${f.motivo}]`).join("\n\n");
  console.log(`\n${flags.length} con director o año que no coinciden:\n\n${out}\n`);
  fs.writeFileSync(path.join(__dirname, "check_datos.txt"), out + "\n");
  console.log("Guardado en cerebro/check_datos.txt");
})();
