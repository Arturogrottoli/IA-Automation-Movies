// Exporta los 3 docs del curso (docs/*.md) a PDF con Chrome headless.
// Arma un HTML temporal por doc (markdown y Mermaid se renderizan en el navegador,
// desde CDN) y lo imprime. Necesita Chrome instalado y conexión a internet.
//   node cerebro/export_docs_pdf.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");

const DOCS = ["arquitectura", "manual-de-datos", "costos"];
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(p => fs.existsSync(p));
if (!CHROME) { console.error("No encontré Chrome ni Edge"); process.exit(1); }

const CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  body { font: 10.5pt/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; }
  h1 { font-size: 20pt; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; }
  h2 { font-size: 14pt; margin-top: 1.6em; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  h3 { font-size: 11.5pt; margin-top: 1.3em; }
  h1, h2, h3 { break-after: avoid; }
  code { font: 9pt Consolas, monospace; background: #f3f3f3; padding: 1px 3px; border-radius: 3px; }
  pre { background: #f3f3f3; padding: 8px 10px; border-radius: 4px; white-space: pre-wrap; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin: 0.8em 0; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; }
  tr { break-inside: avoid; }
  blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 10px; color: #555; }
  a { color: #1a4fa0; text-decoration: none; }
  .mermaid { text-align: center; break-inside: avoid; margin: 1em 0; }
  .mermaid svg { max-width: 100%; height: auto; }
`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "docs-pdf-"));
for (const name of DOCS) {
  const md = fs.readFileSync(path.join(ROOT, "docs", name + ".md"), "utf8");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${name}</title>
<style>${CSS}</style>
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
</head><body><main id="doc"></main>
<script>
  const md = ${JSON.stringify(md).replace(/</g, "\\u003c")};
  const el = document.getElementById("doc");
  el.innerHTML = marked.parse(md);
  el.querySelectorAll("pre code.language-mermaid").forEach(c => {
    const d = document.createElement("div");
    d.className = "mermaid";
    d.textContent = c.textContent;
    c.parentElement.replaceWith(d);
  });
  mermaid.initialize({ startOnLoad: false, theme: "neutral" });
  mermaid.run();
</script></body></html>`;
  const htmlPath = path.join(tmp, name + ".html");
  fs.writeFileSync(htmlPath, html);
  const pdfPath = path.join(ROOT, "docs", name + ".pdf");
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
    "--virtual-time-budget=15000", "--run-all-compositor-stages-before-draw",
    "--print-to-pdf=" + pdfPath, "file:///" + htmlPath.replace(/\\/g, "/"),
  ], { stdio: "ignore" });
  console.log(`docs/${name}.pdf  (${Math.round(fs.statSync(pdfPath).size / 1024)} KB)`);
}
fs.rmSync(tmp, { recursive: true, force: true });
