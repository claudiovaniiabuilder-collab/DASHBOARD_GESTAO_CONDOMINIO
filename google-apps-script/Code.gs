/**
 * MD Engenharia — API JSON do Dashboard
 *
 * Como usar:
 * 1. No Google Sheets: Extensões → Apps Script
 * 2. Apague o código padrão e cole este arquivo inteiro
 * 3. Salve → Implantar → Nova implantação → Tipo: App da Web
 *    - Executar como: Eu
 *    - Quem tem acesso: Qualquer pessoa
 * 4. Copie a URL e cole em config.js → sheetsJsonUrl
 *
 * A primeira aba da planilha deve ter o cabeçalho do modelo
 * (veja sheets/modelo-importacao.csv).
 */

var HEADER_MAP = {
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

function doGet(e) {
  try {
    var data = lerPlanilha_();
    var out = ContentService.createTextOutput(JSON.stringify(data));
    out.setMimeType(ContentService.MimeType.JSON);
    return out;
  } catch (err) {
    var errOut = ContentService.createTextOutput(
      JSON.stringify({ error: String(err && err.message ? err.message : err) })
    );
    errOut.setMimeType(ContentService.MimeType.JSON);
    return errOut;
  }
}

function lerPlanilha_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  var headers = values[0].map(function (h) {
    return String(h || "").trim();
  });

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var raw = values[r];
    if (linhaVazia_(raw)) continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var key = HEADER_MAP[headers[c]];
      if (!key) continue;
      obj[key] = normalizarValor_(key, raw[c]);
    }

    if (!obj.id && !obj.descricao) continue;
    rows.push(obj);
  }
  return rows;
}

function linhaVazia_(row) {
  for (var i = 0; i < row.length; i++) {
    if (row[i] !== "" && row[i] !== null && row[i] !== undefined) return false;
  }
  return true;
}

function normalizarValor_(key, value) {
  if (value === "" || value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  if (key === "mes") {
    var mes = String(value).trim();
    if (/^\d+$/.test(mes)) mes = ("0" + mes).slice(-2);
    return mes;
  }

  if (
    key === "ano" ||
    key === "gravidade" ||
    key === "urgencia" ||
    key === "tendencia" ||
    key === "gut" ||
    key === "prioridade"
  ) {
    var n = Number(value);
    return isNaN(n) ? null : n;
  }

  return String(value).trim();
}

/** Teste manual no editor: Executar → testarLeitura */
function testarLeitura() {
  var data = lerPlanilha_();
  Logger.log("Registros: " + data.length);
  if (data.length) Logger.log(JSON.stringify(data[0], null, 2));
}
