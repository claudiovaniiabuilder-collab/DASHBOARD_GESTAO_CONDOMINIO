/**
 * Configuração do dashboard.
 *
 * 1) Crie a planilha no Google Sheets (importe sheets/modelo-importacao.csv).
 * 2) Cole o código de google-apps-script/Code.gs em Extensões → Apps Script.
 * 3) Implante como app da Web (Executar como: eu | Quem tem acesso: Qualquer pessoa).
 * 4) Cole a URL do implante abaixo.
 *
 * Deixe vazio ("") para usar data.js / data/inconformidades.json locais.
 */
window.DASHBOARD_CONFIG = {
  // Ex.: "https://script.google.com/macros/s/XXXXXXXX/exec"
  sheetsJsonUrl: "https://script.google.com/macros/s/AKfycbzAJCrzUB8RSln_x9uwRHKvfbe3gCw6vZHqCvl9aDFvTlQrCCYBoHmIxrCD74BJDeQkeg/exec",

  // Evita cache agressivo do navegador ao buscar a planilha
  cacheBust: true,
};
