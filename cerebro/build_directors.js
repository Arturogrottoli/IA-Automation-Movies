// Directores de cada película, con su género según TMDB -> ../data/directors.json
// Usa el id de TMDB ya resuelto en posters.json (no vuelve a buscar por título).
// Sirve para preguntas que la hoja no puede contestar sola, como "¿cuántas
// directoras vi?": la columna director de la hoja es solo un nombre.
//   node cerebro/build_directors.js
//
// Formato: { "titulo|anio": [{ "n": "Greta Gerwig", "g": "f" }, ...] }
//   g = "f" mujer · "m" hombre · "nb" no binario · "?" TMDB no lo tiene cargado
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const token = fs.readFileSync(path.join(__dirname, "tmdb.key"), "utf8").trim();
const H = { headers: { Authorization: "Bearer " + token, accept: "application/json" } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GENERO = { 1: "f", 2: "m", 3: "nb" }; // códigos de TMDB; 0 = sin dato

async function tmdb(u){ for(let i=0;i<4;i++){ const r=await fetch("https://api.themoviedb.org/3"+u,H); if(r.status===429){await sleep(1500);continue;} if(!r.ok)return null; return r.json(); } return null; }

(async () => {
  const posters = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "posters.json"), "utf8"));
  const outPath = path.join(ROOT, "data", "directors.json");
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};

  const entries = Object.entries(posters).filter(([k, v]) => v && v.tmdb);
  let done = 0, fetched = 0;
  for (const [key, v] of entries) {
    done++;
    if (out[key]) continue; // ya lo tenemos
    const d = await tmdb(`/movie/${v.tmdb}/credits`);
    if (d && Array.isArray(d.crew)) {
      const seen = new Set();
      out[key] = d.crew
        .filter(c => c.job === "Director" && !seen.has(c.id) && seen.add(c.id))
        .map(c => ({ n: c.name, g: GENERO[c.gender] || "?" }));
      fetched++;
    }
    if (done % 100 === 0) process.stdout.write(`  ${done}/${entries.length}\r`);
    await sleep(40);
  }
  fs.writeFileSync(outPath, JSON.stringify(out));
  const all = Object.values(out).flat();
  const mujeres = new Set(all.filter(d => d.g === "f").map(d => d.n));
  const sinDato = new Set(all.filter(d => d.g === "?").map(d => d.n));
  console.log(`\ndirectors.json: ${Object.keys(out).length} entradas (${fetched} nuevas esta corrida) · ${mujeres.size} directoras · ${sinDato.size} sin género en TMDB`);
})();
