// Re-matchea pósters puntuales eligiendo, entre varios resultados de búsqueda,
// el que tenga el director correcto (en vez de tomar results[0] a ciegas).
// Corrige entradas de posters.json señaladas por check_datos.js como posible
// error, cuando en realidad el dato de la hoja está bien y lo que falla es el
// matcheo del póster.
//   node cerebro/rematch_posters.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const token = fs.readFileSync(path.join(__dirname, "tmdb.key"), "utf8").trim();
const H = { headers: { Authorization: "Bearer " + token, accept: "application/json" } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
const dirMatch = (a, b) => {
  const wa = new Set(norm(a).split(" ").filter(x=>x.length>2));
  const wb = norm(b).split(" ").filter(x=>x.length>2);
  return wb.some(x => wa.has(x));
};

async function tmdb(u){ for(let i=0;i<4;i++){ const r=await fetch("https://api.themoviedb.org/3"+u,H); if(r.status===429){await sleep(1500);continue;} if(!r.ok)return null; return r.json(); } return null; }

// key en posters.json (norm(titulo_hoja)+"|"+anio_hoja) -> {query, year, director}
const TARGETS = {
  "oxygen|2021": { q: "Oxygen", y: 2021, d: "Alexandre Aja" },
  "the innocents|2021": { q: "The Innocents", y: 2021, d: "Eskil Vogt" },
  "alive|2020": { q: "Alive", y: 2020, d: "Il Cho" },
  "the wailing|2016": { q: "The Wailing", y: 2016, d: "Na Hong-jin" },
  "men|2022": { q: "Men", y: 2022, d: "Alex Garland" },
  "mr death|2000": { q: "Mr. Death", y: null, d: "Errol Morris" },
  "tabloide|2010": { q: "Tabloid", y: 2010, d: "Errol Morris" },
  "gates of heaven|1980": { q: "Gates of Heaven", y: null, d: "Errol Morris" },
  "pinocchio|2022": { q: "Pinocchio", y: 2022, d: "Guillermo del Toro" },
  "planet horror|2007": { q: "Planet Terror", y: 2007, d: "Robert Rodriguez" },
  "the arrival|2016": { q: "Arrival", y: 2016, d: "Denis Villeneuve" },
  "the sorcerer|1977": { q: "Sorcerer", y: 1977, d: "William Friedkin" },
  "finders keepers|2015": { q: "Finders Keepers", y: 2015, d: "Bryan Carberry" },
  "madame claude|2021": { q: "Madame Claude", y: 2021, d: "Sylvie Verheyde" },
  "the trap|2024": { q: "Trap", y: 2024, d: "M. Night Shyamalan" },
  "thelma|2024": { q: "Thelma", y: 2024, d: "Josh Margolin" },
  "joy|2024": { q: "Joy", y: 2024, d: "Ben Taylor" },
  "raw|2016": { q: "Raw", y: 2016, d: "Julia Ducournau" },
  "a nightmare on elm street|2010": { q: "A Nightmare on Elm Street", y: 2010, d: "Samuel Bayer" },
  "carrie|2013": { q: "Carrie", y: 2013, d: "Kimberly Peirce" },
  "the toxic avenger|2023": { q: "The Toxic Avenger", y: null, d: "Macon Blair" },
  "the exam|2009": { q: "Exam", y: 2009, d: "Stuart Hazeldine" },
};

(async () => {
  const gl = await tmdb("/genre/movie/list?language=es");
  const GEN = Object.fromEntries((gl?.genres||[]).map(g=>[g.id,g.name]));
  const posters = JSON.parse(fs.readFileSync(path.join(ROOT, "posters.json"), "utf8"));

  let fixed = 0, unresolved = [];
  for (const [key, t] of Object.entries(TARGETS)) {
    const res = await tmdb(`/search/movie?query=${encodeURIComponent(t.q)}${t.y?"&year="+t.y:""}&language=es`);
    const cands = (res?.results || []).slice(0, 6);
    let match = null;
    for (const c of cands) {
      const det = await tmdb(`/movie/${c.id}?append_to_response=credits`);
      await sleep(40);
      if (!det) continue;
      const dirs = (det.credits?.crew || []).filter(x => x.job === "Director").map(x => x.name);
      if (dirs.some(x => dirMatch(t.d, x))) { match = { c, dirs }; break; }
    }
    if (match) {
      const c = match.c;
      const old = posters[key];
      posters[key] = {
        poster: c.poster_path ? "https://image.tmdb.org/t/p/w342" + c.poster_path : null,
        rating: c.vote_average ? Math.round(c.vote_average*10)/10 : null,
        genres: (c.genre_ids||[]).map(id=>GEN[id]).filter(Boolean),
        tmdb: c.id,
      };
      const changed = !old || old.tmdb !== c.id;
      console.log(`${changed?"[fix]":"[ok ]"} ${key}  ->  tmdb ${c.id} (${match.dirs.join(", ")})`);
      if (changed) fixed++;
    } else {
      unresolved.push(key);
      console.log(`[??] ${key}  -- ningún resultado matchea director "${t.d}"`);
    }
    await sleep(60);
  }

  fs.writeFileSync(path.join(ROOT, "posters.json"), JSON.stringify(posters));
  console.log(`\ncorregidos: ${fixed} · sin resolver: ${unresolved.length}${unresolved.length?" ("+unresolved.join(", ")+")":""}`);
})();
