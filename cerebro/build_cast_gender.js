// Género de cada persona del reparto principal, según TMDB -> ../data/genero-reparto.json
// actors.json guarda solo nombres; esto agrega el género para poder contestar
// cosas como "¿cuáles son las actrices que más vi?". Solo consulta TMDB por las
// películas que tienen algún nombre del reparto todavía sin género.
//   node cerebro/build_cast_gender.js
//
// Formato: { "Emma Stone": "f", "Robert De Niro": "m", ... }
//   f = mujer · m = hombre · nb = no binario · ? = TMDB no lo tiene cargado
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
  const actors = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "actors.json"), "utf8"));
  const outPath = path.join(ROOT, "data", "genero-reparto.json");
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};

  const pendientes = Object.entries(actors).filter(([k, names]) => posters[k]?.tmdb && names.some(n => !(n in out)));
  let done = 0;
  for (const [key, names] of pendientes) {
    done++;
    const d = await tmdb(`/movie/${posters[key].tmdb}/credits`);
    if (!d) continue; // TMDB falló: se reintenta en la próxima corrida
    for (const c of d.cast ?? []) {
      if (names.includes(c.name) && !(c.name in out)) out[c.name] = GENERO[c.gender] || "?";
    }
    // Nombres que no aparecen igual en los créditos: "?" para no volver a consultarlos cada día.
    for (const n of names) if (!(n in out)) out[n] = "?";
    if (done % 100 === 0) process.stdout.write(`  ${done}/${pendientes.length}\r`);
    await sleep(40);
  }
  fs.writeFileSync(outPath, JSON.stringify(out));
  const v = Object.values(out);
  console.log(`\ngenero-reparto.json: ${v.length} personas (${pendientes.length} películas consultadas) · ${v.filter(g => g === "f").length} mujeres · ${v.filter(g => g === "m").length} hombres · ${v.filter(g => g === "?").length} sin dato`);
})();
