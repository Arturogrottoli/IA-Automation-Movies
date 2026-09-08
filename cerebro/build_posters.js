// Backfill de pósters, rating y género desde TMDB → posters.json (junto a index.html).
// Corre una vez (o cuando quieras refrescar). El token va en cerebro/tmdb.key (ignorado por git).
//   node cerebro/build_posters.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const token = (process.env.TMDB_TOKEN
  || (fs.existsSync(path.join(__dirname, "tmdb.key")) && fs.readFileSync(path.join(__dirname, "tmdb.key"), "utf8"))
  || "").trim();
if (!token) { console.error("Falta el token: poné el read access token de TMDB en cerebro/tmdb.key"); process.exit(1); }

const H = { headers: { Authorization: "Bearer " + token, accept: "application/json" } };
const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const key = (t, y) => norm(t) + "|" + (y || "");
const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseCSV(s){const rows=[];let f="",row=[],q=false;for(let i=0;i<s.length;i++){const c=s[i];
if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
else{if(c==='"')q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else if(c!=="\r"){f+=c;}}}
if(f.length||row.length){row.push(f);rows.push(row);}return rows;}

async function tmdb(url){
  for (let a=0;a<4;a++){
    const r = await fetch("https://api.themoviedb.org/3" + url, H);
    if (r.status === 429){ await sleep(1500); continue; }
    if (!r.ok) return null;
    return r.json();
  }
  return null;
}

(async () => {
  // fuente: la hoja publicada (más actual que el CSV local)
  const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const SHEET_CSV_URL = "([^"]+)"/);
  const csv = src ? await (await fetch(src[1])).text() : fs.readFileSync(path.join(ROOT, "cerebro/catalogo_completo.csv"), "utf8");
  const rows = parseCSV(csv);
  const h = rows[0].map(x => x.trim());
  const ci = k => h.indexOf(k);
  const movies = rows.slice(1)
    .filter(r => r.length > ci("titulo") && (r[ci("titulo")] || "").trim())
    .map(r => ({ t: r[ci("titulo")].trim(), y: +r[ci("anio_estreno")] || null }));

  // mapa de géneros (es)
  const gl = await tmdb("/genre/movie/list?language=es");
  const GEN = Object.fromEntries((gl?.genres || []).map(g => [g.id, g.name]));

  // cargar lo ya resuelto para no re-consultar
  const outPath = path.join(ROOT, "posters.json");
  const prev = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
  const out = { ...prev };

  const uniq = [...new Map(movies.map(m => [key(m.t, m.y), m])).values()];
  let hit = 0, miss = 0, skip = 0;
  for (const m of uniq) {
    const k = key(m.t, m.y);
    if (k in out) { skip++; continue; }
    const q = encodeURIComponent(m.t);
    let res = await tmdb(`/search/movie?query=${q}${m.y ? "&year=" + m.y : ""}&language=es`);
    let best = res?.results?.[0];
    if (!best && m.y) { res = await tmdb(`/search/movie?query=${q}&language=es`); best = res?.results?.[0]; }
    if (best) {
      out[k] = {
        poster: best.poster_path ? "https://image.tmdb.org/t/p/w342" + best.poster_path : null,
        rating: best.vote_average ? Math.round(best.vote_average * 10) / 10 : null,
        genres: (best.genre_ids || []).map(id => GEN[id]).filter(Boolean),
        tmdb: best.id,
      };
      hit++;
    } else {
      out[k] = null; // miss registrado
      miss++;
    }
    if ((hit + miss) % 50 === 0) process.stdout.write(`  ${hit + miss}/${uniq.length}\r`);
    await sleep(60);
  }

  fs.writeFileSync(outPath, JSON.stringify(out));
  const bytes = fs.statSync(outPath).size;
  console.log(`\nposters.json: ${Object.keys(out).length} entradas (${Math.round(bytes/1024)} KB)`);
  console.log(`nuevas: ${hit} con datos, ${miss} sin match · ${skip} ya estaban`);
  const misses = uniq.filter(m => out[key(m.t, m.y)] === null).slice(0, 30);
  if (misses.length) console.log("sin match:", misses.map(m => `${m.t} (${m.y || "?"})`).join(" · "));
})();
