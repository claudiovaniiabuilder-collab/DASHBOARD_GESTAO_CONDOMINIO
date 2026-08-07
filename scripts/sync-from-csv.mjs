/**
 * Converte data/inconformidades.csv → data/inconformidades.json + data.js
 * Uso: node scripts/sync-from-csv.mjs
 *
 * Útil como backup local. Com Google Sheets configurado em config.js,
 * o dashboard lê a planilha online e este script não é necessário no dia a dia.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const csvPath = path.join(root, "data", "inconformidades.csv");
const jsonPath = path.join(root, "data", "inconformidades.json");
const publicJson = path.join(root, "public", "data", "inconformidades.json");
const dataJsPath = path.join(root, "data.js");

const HEADER_MAP = {
  ID_LAUDO: "id",
  Ano: "ano",
  Mes: "mes",
  Sistema: "sistema",
  Subsistema: "subsistema",
  Descricao: "descricao",
  Tipo_Falha: "tipoFalha",
  Gravidade: "gravidade",
  Urgencia: "urgencia",
  Tendencia: "tendencia",
  GUT: "gut",
  Prioridade: "prioridade",
  Responsavel: "responsavel",
  Local: "local",
  Detalhe_Unidade: "detalheUnidade",
  Status_Correcao: "status",
  Data_Conclusao: "dataConclusao",
};

const NUM_KEYS = new Set(["ano", "gravidade", "urgencia", "tendencia", "gut", "prioridade"]);

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = lines[0].split(";");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(";");
    const obj = {};
    headers.forEach((h, idx) => {
      const key = HEADER_MAP[h.trim()];
      if (!key) return;
      let v = (cols[idx] ?? "").trim();
      if (v === "") {
        obj[key] = null;
        return;
      }
      if (key === "mes" && /^\d+$/.test(v)) v = v.padStart(2, "0");
      if (NUM_KEYS.has(key)) {
        const n = Number(v);
        obj[key] = Number.isFinite(n) ? n : null;
      } else {
        obj[key] = v;
      }
    });
    if (obj.id || obj.descricao) rows.push(obj);
  }
  return rows;
}

const csv = fs.readFileSync(csvPath, "utf8");
const data = parseCsv(csv);
const json = JSON.stringify(data, null, 4);
fs.mkdirSync(path.dirname(publicJson), { recursive: true });
fs.writeFileSync(jsonPath, json + "\n", "utf8");
fs.writeFileSync(publicJson, json + "\n", "utf8");
fs.writeFileSync(dataJsPath, `window.INCONFORMIDADES = ${json};\n`, "utf8");
console.log(`OK: ${data.length} registros → data/inconformidades.json, public/data/, data.js`);
