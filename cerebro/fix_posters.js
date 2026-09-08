// Reintenta los pósters que fallaron, con el título corregido. Parchea posters.json.
//   node cerebro/fix_posters.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const token = fs.readFileSync(path.join(__dirname, "tmdb.key"), "utf8").trim();
const H = { headers: { Authorization: "Bearer " + token, accept: "application/json" } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// normKey (norm|año)  →  búsqueda corregida
const FIX = {
  "la cordilllera|2017":"La cordillera", "foo figthers back and forth|2011":"Foo Fighters Back and Forth",
  "unbreakeable|2000":"Unbreakable", "nigthcrawler|2014":"Nightcrawler",
  "the curius case of benjamin buttom|2008":"The Curious Case of Benjamin Button",
  "bohemian rapsody|2018":"Bohemian Rhapsody", "the last sharnado|2018":"The Last Sharknado",
  "assault on precint 13|1976":"Assault on Precinct 13", "lord of chaos|2018":"Lords of Chaos",
  "the hill have eyes|1977":"The Hills Have Eyes", "el robo del sigo|2020":"El robo del siglo",
  "1917 0|2019":"1917", "uncuts gems|2019":"Uncut Gems", "the ravenant|2015":"The Revenant",
  "the purge election day|2016":"The Purge Election Year", "lost in traslation|2003":"Lost in Translation",
  "the big lebowsky|1998":"The Big Lebowski", "cranck 2|2009":"Crank High Voltage",
  "murder on the front row|2020":"Murder in the Front Row", "the killing of the sacreed deer|2017":"The Killing of a Sacred Deer",
  "violet and finch|2020":"All the Bright Places", "american murder the family next doord|2020":"American Murder The Family Next Door",
  "tiempo de valientas|2005":"Tiempo de valientes", "monty python and the holy grial|1975":"Monty Python and the Holy Grail",
  "blue jazmine|2013":"Blue Jasmine", "night of the living deads|1968":"Night of the Living Dead",
  "the age of the inocence|1993":"The Age of Innocence", "bringing out of dead|1999":"Bringing Out the Dead",
  "brockeback montain|2006":"Brokeback Mountain", "a quien place 2|2021":"A Quiet Place Part II",
  "211 0|2018":"211", "springbreakers|2012":"Spring Breakers", "train to busan peninsule|2020":"Peninsula",
  "white man cant jump|1992":"White Men Can't Jump", "the unbeareable weight of massive talent|2022":"The Unbearable Weight of Massive Talent",
  "halloweens kills|2021":"Halloween Kills", "dawn of the deads|2004":"Dawn of the Dead",
  "incantantion|2022":"Incantation", "once upon a time un hollywood|2019":"Once Upon a Time in Hollywood",
  "hated gg alin and the murder junkies|1993":"Hated GG Allin and the Murder Junkies",
  "76 89 93|2000":"76 89 03", "1922 0|2017":"1922", "perfume the history of a murderer|2006":"Perfume The Story of a Murderer",
  "the big night of pop|2024":"The Greatest Night in Pop", "nekromantic|1987":"Nekromantik",
  "i love u man|2009":"I Love You Man", "la princesa mononoque|1997":"Princess Mononoke",
  "victor frankestein|2015":"Victor Frankenstein", "booksmarts|2019":"Booksmart",
  "maxxine|2024":"MaXXXine", "kind of kindness|2024":"Kinds of Kindness", "alls hallows eve|2013":"All Hallows' Eve",
  "get him to they greek|2010":"Get Him to the Greek", "28 week later|2006":"28 Weeks Later",
  "dog days afternoon|1975":"Dog Day Afternoon", "jurasic park|1993":"Jurassic Park",
  "one battle after a other|2025":"One Battle After Another", "shot the psycshospiritual mantra del rock|2016":"Shot The Psycho-Spiritual Mantra of Rock",
  "la flor la termine el 4 4|2018":"La Flor Mariano Llinas", "rene lavand el gran simulador|2013":"René Lavand el gran simulador",
};

async function tmdb(u){ for(let i=0;i<4;i++){ const r=await fetch("https://api.themoviedb.org/3"+u,H); if(r.status===429){await sleep(1500);continue;} if(!r.ok)return null; return r.json(); } return null; }

(async () => {
  const gl = await tmdb("/genre/movie/list?language=es");
  const GEN = Object.fromEntries((gl?.genres||[]).map(g=>[g.id,g.name]));
  const out = JSON.parse(fs.readFileSync(path.join(ROOT,"posters.json"),"utf8"));
  let fixed=0, still=0;
  for (const [k,q] of Object.entries(FIX)) {
    if (out[k]) continue;
    const y = k.split("|")[1];
    let res = await tmdb(`/search/movie?query=${encodeURIComponent(q)}${y?"&year="+y:""}&language=es`);
    let best = res?.results?.[0];
    if (!best) { res = await tmdb(`/search/movie?query=${encodeURIComponent(q)}&language=es`); best = res?.results?.[0]; }
    if (best) {
      out[k] = {
        poster: best.poster_path ? "https://image.tmdb.org/t/p/w342"+best.poster_path : null,
        rating: best.vote_average ? Math.round(best.vote_average*10)/10 : null,
        genres: (best.genre_ids||[]).map(id=>GEN[id]).filter(Boolean),
        tmdb: best.id,
      };
      fixed++;
    } else { still++; console.log("sigue sin match:", q); }
    await sleep(60);
  }
  fs.writeFileSync(path.join(ROOT,"posters.json"), JSON.stringify(out));
  const withData = Object.values(out).filter(Boolean).length;
  console.log(`\ncorregidas: ${fixed} · siguen sin match: ${still}`);
  console.log(`posters.json: ${Object.keys(out).length} entradas, ${withData} con datos`);
})();
