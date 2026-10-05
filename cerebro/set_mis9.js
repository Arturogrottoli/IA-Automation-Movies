// Fija "Mis 9 películas" del dueño del sitio -> ../data/mis9.json (lo lee la Placa X).
// Armá la selección en el sitio, tocá "Copiar link" y pasalo acá:
//   node cerebro/set_mis9.js "<link copiado>" "Tu nombre"
// Sin argumentos muestra lo que hay guardado.
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "data", "mis9.json");

const [link, nombre] = process.argv.slice(2);
if (!link) {
  console.log(fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "Todavía no hay mis9.json");
  process.exit(0);
}

let raw;
try {
  raw = new URL(link).searchParams.get("nueve");
} catch {
  raw = link; // también acepta directamente "680,25376,..."
}
if (!raw) { console.error("El link no trae ?nueve= — copialo con el botón \"Copiar link\" de la placa."); process.exit(1); }

const picks = raw.split(",").slice(0, 9).map(t => (t.trim() === "" ? null : /^\d+$/.test(t.trim()) ? +t.trim() : t.trim()));
while (picks.length < 9) picks.push(null);
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const out = { nombre: nombre ?? prev.nombre ?? "", picks };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`mis9.json: ${picks.filter(p => p != null).length}/9 · nombre "${out.nombre}"`);
