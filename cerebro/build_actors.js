// Backfill del reparto principal desde TMDB -> ../actors.json
// Usa el id de TMDB ya resuelto en posters.json (no vuelve a buscar por título).
//   node cerebro/build_actors.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const token = fs.readFileSync(path.join(__dirname, "tmdb.key"), "utf8").trim();
const H = { headers: { Authorization: "Bearer " + token, accept: "application/json" } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TOP_N = 8;

async function tmdb(u){ for(let i=0;i<4;i++){ const r=await fetch("https://api.themoviedb.org/3"+u,H); if(r.status===429){await sleep(1500);continue;} if(!r.ok)return null; return r.json(); } return null; }

(async () => {
  const posters = JSON.parse(fs.readFileSync(path.join(ROOT, "posters.json"), "utf8"));
  const outPath = path.join(ROOT, "actors.json");
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};

  const entries = Object.entries(posters).filter(([k, v]) => v && v.tmdb);
  let done = 0, fetched = 0;
  for (const [key, v] of entries) {
    done++;
    if (out[key]) continue; // ya lo tenemos
    const d = await tmdb(`/movie/${v.tmdb}?append_to_response=credits&language=es`);
    if (d && d.credits && Array.isArray(d.credits.cast)) {
      out[key] = d.credits.cast.slice(0, TOP_N).map(c => c.name);
      fetched++;
    }
    if (done % 100 === 0) process.stdout.write(`  ${done}/${entries.length}\r`);
    await sleep(40);
  }
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log(`\nactors.json: ${Object.keys(out).length} entradas (${fetched} nuevas esta corrida)`);
})();
