// Segunda tanda de re-matcheo (mismo mecanismo que rematch_posters.js).
//   node cerebro/rematch_posters2.js
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

const TARGETS = {
  "el estudiante|2011": { q: "El estudiante", y: 2011, d: "Santiago Mitre" },
  "perfectos desconocidos|2017": { q: "Perfectos desconocidos", y: 2017, d: "Alex de la Iglesia" },
  "demon|2015": { q: "Demon", y: 2015, d: "Marcin Wrona" },
  "toc toc|2017": { q: "Toc Toc", y: 2017, d: "Vicente Villanueva" },
  "birdbox|2018": { q: "Bird Box", y: 2018, d: "Susanne Bier" },
  "true story|2014": { q: "True Story", y: 2014, d: "Rupert Goold" },
  "the green book|2018": { q: "Green Book", y: 2018, d: "Peter Farrelly" },
  "rojo|2018": { q: "Rojo", y: 2018, d: "Benjamin Naishtat" },
  "leaving neverland|2018": { q: "Leaving Neverland", y: null, d: "Dan Reed" },
  "melbourne|2014": { q: "Melbourne", y: 2014, d: "Nima Javidi" },
  "lion|2016": { q: "Lion", y: 2016, d: "Garth Davis" },
  "la casa de la playa|2019": { q: "La casa de la playa", y: 2019, d: "July Massaccesi" },
  "el club|2015": { q: "El Club", y: 2015, d: "Pablo Larrain" },
  "toxico|2020": { q: "Toxico", y: 2020, d: "Ariel Martinez Herrera" },
  "the gentleman|2019": { q: "The Gentlemen", y: 2019, d: "Guy Ritchie" },
  "mid 90s|2018": { q: "Mid90s", y: 2018, d: "Jonah Hill" },
  "death at the funeral|2007": { q: "Death at a Funeral", y: 2007, d: "Frank Oz" },
  "atrapados sin salida|1976": { q: "One Flew Over the Cuckoo's Nest", y: null, d: "Milos Forman" },
  "batman dark knight|2008": { q: "The Dark Knight", y: 2008, d: "Christopher Nolan" },
  "the darkest hour|2017": { q: "Darkest Hour", y: 2017, d: "Joe Wright" },
  "old|2021": { q: "Old", y: 2021, d: "M. Night Shyamalan" },
  "parasite|2019": { q: "Parasite", y: 2019, d: "Bong Joon-ho" },
};

(async () => {
  const gl = await tmdb("/genre/movie/list?language=es");
  const GEN = Object.fromEntries((gl?.genres||[]).map(g=>[g.id,g.name]));
  const posters = JSON.parse(fs.readFileSync(path.join(ROOT, "posters.json"), "utf8"));

  let fixed = 0, unresolved = [];
  for (const [key, t] of Object.entries(TARGETS)) {
    const res = await tmdb(`/search/movie?query=${encodeURIComponent(t.q)}${t.y?"&year="+t.y:""}&language=es`);
    const cands = (res?.results || []).slice(0, 8);
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
      console.log(`[??] ${key}  -- ningun resultado matchea director "${t.d}"`);
    }
    await sleep(60);
  }

  fs.writeFileSync(path.join(ROOT, "posters.json"), JSON.stringify(posters));
  console.log(`\ncorregidos: ${fixed} · sin resolver: ${unresolved.length}${unresolved.length?" ("+unresolved.join(", ")+")":""}`);
})();
