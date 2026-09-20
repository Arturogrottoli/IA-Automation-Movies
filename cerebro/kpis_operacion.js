// KPI de volumen: cuántas películas se registraron vía bot (fuente = "Bot
// Telegram"), agrupadas por fecha_vista (proxy de fecha de registro — se
// registra el mismo día que se vio). No cambia nada — solo imprime.
//   node cerebro/kpis_operacion.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function parseCSV(s) {
  const rows = [];
  let f = "", row = [], q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c !== "\r") f += c;
    }
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}

(async () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const url = html.match(/const SHEET_CSV_URL = "([^"]+)"/)[1];
  const rows = parseCSV(await (await fetch(url)).text());
  const header = rows[0];
  const idx = (k) => header.indexOf(k);

  const bot = rows.slice(1).filter((r) => r[idx("fuente")] === "Bot Telegram");
  const porDia = new Map();
  for (const r of bot) {
    const f = r[idx("fecha_vista")];
    porDia.set(f, (porDia.get(f) || 0) + 1);
  }
  const dias = [...porDia.keys()].sort();
  const primero = dias[0], ultimo = dias[dias.length - 1];
  const spanDias = (new Date(ultimo) - new Date(primero)) / 86400000 + 1;

  console.log(`Registros vía bot: ${bot.length}`);
  console.log(`Rango: ${primero} a ${ultimo} (${spanDias} días)`);
  console.log(`Promedio: ${(bot.length / spanDias).toFixed(2)} / día`);
  console.log(`Pico: ${Math.max(...porDia.values())} en un mismo día`);
  console.log("\nPor día:");
  for (const d of dias) console.log(`  ${d}  ${"█".repeat(porDia.get(d))} ${porDia.get(d)}`);

  fs.writeFileSync(
    path.join(__dirname, "kpis_operacion.json"),
    JSON.stringify({ total: bot.length, primero, ultimo, spanDias, porDia: Object.fromEntries(porDia) }, null, 2),
  );
  console.log("\nGuardado en cerebro/kpis_operacion.json");
})();
