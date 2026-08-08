const MES_NOME = {
  "00": "Ano",
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

const MES_FULL = {
  "00": "Sem mês",
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

const MES_ALIAS = {
  jan: "01", janeiro: "01",
  fev: "02", fevereiro: "02",
  mar: "03", marco: "03", março: "03",
  abr: "04", abril: "04",
  mai: "05", maio: "05",
  jun: "06", junho: "06",
  jul: "07", julho: "07",
  ago: "08", agosto: "08",
  set: "09", setembro: "09",
  out: "10", outubro: "10",
  nov: "11", novembro: "11",
  dez: "12", dezembro: "12",
};

const SISTEMAS_CANONICOS = [
  "Civil",
  "Elétrico",
  "Proteção Contra Incêndio",
  "Telecomunicações",
  "Segurança",
  "Transporte Vertical",
  "Gestão Técnica",
];

const SISTEMA_COLORS = {
  "Civil": "#3d8f84",
  "Elétrico": "#2f5d8a",
  "Proteção Contra Incêndio": "#d64545",
  "Telecomunicações": "#0e7490",
  "Segurança": "#c2410c",
  "Transporte Vertical": "#7c3aed",
  "Gestão Técnica": "#a16207",
};

/** Mapeia nomes legados da planilha → sistema canônico Vistrat (chaves sem acento) */
const SISTEMA_MAP = {
  civil: "Civil",
  eletrico: "Elétrico",
  incendio: "Proteção Contra Incêndio",
  "protecao contra incendio": "Proteção Contra Incêndio",
  spda: "Proteção Contra Incêndio",
  telecom: "Telecomunicações",
  telecomunicacoes: "Telecomunicações",
  seguranca: "Segurança",
  hidraulico: "Civil",
  hidrossanitario: "Civil",
  gas: "Civil",
  climatizacao: "Civil",
  ventilacao: "Civil",
  operacional: "Gestão Técnica",
  gestao: "Gestão Técnica",
  "gestao tecnica": "Gestão Técnica",
  "transporte vertical": "Transporte Vertical",
  elevadores: "Transporte Vertical",
  elevador: "Transporte Vertical",
};

function normalizarChaveSistema(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function mapearSistema(sistema, subsistema) {
  const raw = String(sistema || "").trim();
  if (!raw) return "Gestão Técnica";

  const key = normalizarChaveSistema(raw);
  if (SISTEMA_MAP[key]) return SISTEMA_MAP[key];

  // Já canônico
  if (SISTEMAS_CANONICOS.includes(raw)) return raw;
  const canonHit = SISTEMAS_CANONICOS.find((s) => normalizarChaveSistema(s) === key);
  if (canonHit) return canonHit;

  const sub = normalizarChaveSistema(subsistema);
  if (
    sub.includes("spda") ||
    sub.includes("hidrante") ||
    sub.includes("extintor") ||
    sub.includes("corta-fogo") ||
    sub.includes("corta fogo") ||
    sub.includes("iluminacao de emergencia") ||
    sub.includes("alarme de emergencia")
  ) {
    return "Proteção Contra Incêndio";
  }
  if (sub.includes("elevador") || sub.includes("plataforma")) {
    return "Transporte Vertical";
  }
  if (sub.includes("cftv") || sub.includes("acesso") || sub.includes("portao")) {
    return "Segurança";
  }
  if (sub.includes("interfon") || sub.includes("telefonia") || sub.includes("dados") || sub === "tv") {
    return "Telecomunicações";
  }

  return raw;
}

const FILTER_KEYS = ["ano", "mes", "sistema", "tipo", "local", "status", "prioridade"];
const FILTER_LABELS = {
  ano: "Ano",
  mes: "Mês",
  sistema: "Sistema",
  tipo: "Tipo",
  local: "Local",
  status: "Status",
  prioridade: "Criticidade",
};

function normalizarLocal(local) {
  const v = String(local || "").trim().toLowerCase();
  if (!v) return "Área comum";
  if (v === "unidade" || v.includes("apto") || v.includes("apart")) return "Unidade";
  return "Área comum";
}

function normalizarAno(value, id) {
  if (value !== null && value !== undefined && value !== "") {
    const n = Number(String(value).trim());
    if (Number.isFinite(n) && n >= 2000 && n <= 2100) return n;
  }
  const fromId = String(id || "").match(/\/(20\d{2})\b/);
  if (fromId) return Number(fromId[1]);
  return null;
}

function normalizarMes(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return String(value.getMonth() + 1).padStart(2, "0");
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^\d{4}-(\d{2})(?:-\d{2})?/);
  if (iso) {
    const n = Number(iso[1]);
    return n >= 1 && n <= 12 ? iso[1] : null;
  }

  if (/^\d{1,2}$/.test(raw)) {
    const n = Number(raw);
    return n >= 1 && n <= 12 ? String(n).padStart(2, "0") : null;
  }

  const alias = MES_ALIAS[raw.toLowerCase()];
  if (alias) return alias;

  const prefix = raw.toLowerCase().match(/^(\d{1,2}|[a-zçã]+)/i);
  if (prefix) {
    if (/^\d{1,2}$/.test(prefix[1])) {
      const n = Number(prefix[1]);
      return n >= 1 && n <= 12 ? String(n).padStart(2, "0") : null;
    }
    if (MES_ALIAS[prefix[1]]) return MES_ALIAS[prefix[1]];
  }

  return null;
}

function enriquecer(raw) {
  return (raw || []).map((d) => {
    const ano = normalizarAno(d.ano, d.id);
    let mes = normalizarMes(d.mes);
    // Sem mês na planilha: agrupa no ponto anual (00) para não sumir dos gráficos
    if (ano && !mes) mes = "00";
    const sistemaOriginal = String(d.sistema || "").trim();
    const sistema = mapearSistema(sistemaOriginal, d.subsistema);
    return {
      ...d,
      ano,
      mes,
      sistemaOriginal,
      sistema,
      localPublico: normalizarLocal(d.local),
    };
  }).filter((d) => d.ano || d.descricao || d.id);
}

const TIMELINE_PAGE_SIZE = 20;

const state = {
  data: [],
  charts: {},
  filters: {
    ano: "", mes: "", sistema: "", tipo: "", local: "", status: "", prioridade: "",
  },
  syncing: false,
  /** null = ir para a página mais recente ao renderizar */
  timelinePage: null,
};

const el = (id) => document.getElementById(id);

const THEME_KEY = "dashboard-theme";

function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function chartTheme() {
  const dark = isDarkTheme();
  return {
    tick: dark ? "#9aa8b6" : "#6b7785",
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(31,41,51,0.06)",
    border: dark ? "#1c2532" : "#ffffff",
    tooltipBg: dark ? "rgba(15, 20, 27, 0.94)" : "rgba(30, 41, 59, 0.92)",
  };
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "dark" ? "#0f141b" : "#1e3a5f");
  const btn = el("btnTheme");
  if (btn) {
    btn.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
    btn.title = next === "dark" ? "Tema escuro (clique para claro)" : "Tema claro (clique para escuro)";
  }
}

function setupThemeToggle() {
  applyTheme(isDarkTheme() ? "dark" : "light");
  el("btnTheme")?.addEventListener("click", () => {
    applyTheme(isDarkTheme() ? "light" : "dark");
    if (state.data.length) render();
  });
}

function showBootError(msg) {
  const box = el("bootError");
  if (!box) {
    console.error(msg);
    return;
  }
  box.hidden = false;
  box.textContent = msg;
}

async function carregarBase() {
  const cfg = window.DASHBOARD_CONFIG || {};
  const sheetsUrl = String(cfg.sheetsJsonUrl || "").trim();

  // 1) Google Sheets (Apps Script Web App)
  if (sheetsUrl) {
    try {
      const url = cfg.cacheBust
        ? `${sheetsUrl}${sheetsUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
        : sheetsUrl;
      const res = await fetch(url, { cache: "no-store", redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.error) throw new Error(json.error);
      if (Array.isArray(json) && json.length) return json;
      throw new Error("Planilha retornou lista vazia");
    } catch (err) {
      console.warn("Falha ao carregar Google Sheets:", err);
    }
  }

  // 2) data.js já injetou window.INCONFORMIDADES
  if (Array.isArray(window.INCONFORMIDADES) && window.INCONFORMIDADES.length) {
    return window.INCONFORMIDADES;
  }

  // 3) fallback: JSON da pasta data/
  try {
    const res = await fetch("data/inconformidades.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json) && json.length) return json;
  } catch (err) {
    console.warn("Falha ao carregar data/inconformidades.json", err);
  }

  return [];
}

function isResolvida(status) {
  const s = String(status || "").toLowerCase();
  return s.includes("conclu") || s.includes("resolv") || s.includes("fechad");
}

function uniqueSorted(values) {
  return [...new Set(values.filter((v) => v !== null && v !== undefined && v !== ""))]
    .sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a).localeCompare(String(b), "pt-BR", { numeric: true });
    });
}

function fillSelect(select, values, allLabel = "Selecionar Tudo") {
  const current = select.value;
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = allLabel;
  select.appendChild(all);
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = String(v);
    select.appendChild(opt);
  });
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

function toggleFilter(key, value) {
  const next = String(value ?? "");
  state.filters[key] = state.filters[key] === next ? "" : next;
  state.timelinePage = null;
  syncSelectsFromState();
  render();
}

function setFilter(key, value) {
  state.filters[key] = String(value ?? "");
  state.timelinePage = null;
  syncSelectsFromState();
  render();
}

function clearFilters() {
  FILTER_KEYS.forEach((k) => { state.filters[k] = ""; });
  state.timelinePage = null;
  syncSelectsFromState();
  render();
}

function syncSelectsFromState() {
  state.syncing = true;
  el("fAno").value = state.filters.ano;
  el("fMes").value = state.filters.mes;
  el("fSistema").value = state.filters.sistema;
  el("fTipo").value = state.filters.tipo;
  el("fLocal").value = state.filters.local;
  el("fStatus").value = state.filters.status;
  el("fPrioridade").value = state.filters.prioridade;
  state.syncing = false;
}

function readSelectsToState() {
  state.filters.ano = el("fAno").value;
  state.filters.mes = el("fMes").value;
  state.filters.sistema = el("fSistema").value;
  state.filters.tipo = el("fTipo").value;
  state.filters.local = el("fLocal").value;
  state.filters.status = el("fStatus").value;
  state.filters.prioridade = el("fPrioridade").value;
}

function setupFilters() {
  fillSelect(el("fAno"), uniqueSorted(state.data.map((d) => d.ano)));

  el("fMes").innerHTML = "";
  const allMes = document.createElement("option");
  allMes.value = "";
  allMes.textContent = "Selecionar Tudo";
  el("fMes").appendChild(allMes);
  uniqueSorted(state.data.map((d) => d.mes)).forEach((m) => {
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = MES_FULL[m] || m;
    el("fMes").appendChild(opt);
  });

  fillSelect(
    el("fSistema"),
    groupCountSistemas(state.data).map(([nome]) => nome)
  );
  fillSelect(el("fTipo"), uniqueSorted(state.data.map((d) => d.tipoFalha)));
  fillSelect(el("fLocal"), ["Área comum", "Unidade"]);
  fillSelect(el("fStatus"), uniqueSorted(state.data.map((d) => d.status)));

  el("fPrioridade").innerHTML = "";
  const allP = document.createElement("option");
  allP.value = "";
  allP.textContent = "Selecionar Tudo";
  el("fPrioridade").appendChild(allP);
  [
    ["1", "Alto"],
    ["2", "Médio"],
    ["3", "Baixo"],
  ].forEach(([v, t]) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = t;
    el("fPrioridade").appendChild(opt);
  });

  ["fAno", "fMes", "fSistema", "fTipo", "fLocal", "fStatus", "fPrioridade"].forEach((id) => {
    el(id).addEventListener("change", () => {
      if (state.syncing) return;
      readSelectsToState();
      state.timelinePage = null;
      render();
    });
  });

  el("fPrivacidade").addEventListener("change", render);
  el("btnLimpar").addEventListener("click", clearFilters);

  document.querySelectorAll(".local-item").forEach((btn) => {
    btn.addEventListener("click", () => toggleFilter("local", btn.dataset.local));
  });

  document.querySelectorAll(".kpi.interactive").forEach((card) => {
    card.addEventListener("click", () => {
      const kind = card.dataset.kpi;
      if (kind === "all") return clearFilters();
      if (kind === "abertas") return toggleFilter("status", "Aberto");
      if (kind === "criticos") return toggleFilter("prioridade", "1");
      if (kind === "resolvidas") {
        const concluido = uniqueSorted(state.data.map((d) => d.status)).find((s) => isResolvida(s));
        return toggleFilter("status", concluido || "Concluído");
      }
    });
  });
}

function getFiltered() {
  const f = state.filters;
  return state.data.filter((d) => {
    if (f.ano && String(d.ano) !== f.ano) return false;
    if (f.mes && String(d.mes) !== f.mes) return false;
    if (f.sistema && d.sistema !== f.sistema) return false;
    if (f.tipo && d.tipoFalha !== f.tipo) return false;
    if (f.local && d.localPublico !== f.local) return false;
    if (f.status && d.status !== f.status) return false;
    if (f.prioridade && String(d.prioridade) !== f.prioridade) return false;
    return true;
  });
}

function chipValue(key, value) {
  if (key === "mes") return MES_FULL[value] || value;
  if (key === "prioridade") return ({ 1: "Alto", 2: "Médio", 3: "Baixo" })[value] || value;
  return value;
}

function renderChips() {
  const chips = el("chips");
  const active = FILTER_KEYS.filter((k) => state.filters[k]);
  if (!active.length) {
    chips.innerHTML = `<span class="muted">Clique nos gráficos ou KPIs para filtrar · visão completa</span>`;
    return;
  }
  chips.innerHTML = active.map((k) => `
    <span class="chip">
      ${FILTER_LABELS[k]}: ${chipValue(k, state.filters[k])}
      <button type="button" data-clear="${k}" aria-label="Remover">×</button>
    </span>
  `).join("");
  chips.querySelectorAll("button[data-clear]").forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.clear, ""));
  });
}

function destroyChart(name) {
  if (state.charts[name]) {
    state.charts[name].destroy();
    delete state.charts[name];
  }
}

function makeChart(name, canvasId, config) {
  destroyChart(name);
  if (typeof Chart === "undefined") {
    showBootError("Biblioteca de gráficos não carregou (vendor/chart.umd.min.js).");
    return;
  }
  const canvas = el(canvasId);
  if (!canvas) return;
  state.charts[name] = new Chart(canvas.getContext("2d"), config);
}

function onChartClick(name, handler) {
  const chart = state.charts[name];
  if (!chart) return;
  chart.options.onClick = (_evt, elements) => {
    if (!elements.length) return;
    handler(elements[0], chart);
  };
  chart.options.onHover = (evt, elements) => {
    evt.native.target.style.cursor = elements.length ? "pointer" : "default";
  };
  chart.update("none");
}

function dimColors(colors, selectedLabel, labels) {
  if (!selectedLabel) return colors;
  return colors.map((c, i) => (labels[i] === selectedLabel ? c : hexAlpha(c, 0.28)));
}

function hexAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function tooltipBase(total) {
  const theme = chartTheme();
  return {
    backgroundColor: theme.tooltipBg,
    padding: 10,
    cornerRadius: 8,
    callbacks: {
      label(ctx) {
        const value = typeof ctx.parsed === "object"
          ? (ctx.parsed.y ?? ctx.parsed.x ?? 0)
          : ctx.parsed;
        const pct = total ? ((value / total) * 100).toFixed(1).replace(".", ",") : null;
        const prefix = ctx.dataset.label ? `${ctx.dataset.label}: ` : "";
        return pct ? `${prefix}${value} (${pct}%)` : `${prefix}${value}`;
      },
      footer() { return "Clique para filtrar"; },
    },
  };
}

function periodoTexto(rows) {
  const anos = uniqueSorted(rows.map((r) => r.ano));
  const meses = uniqueSorted(rows.map((r) => r.mes).filter((m) => m && m !== "00"));
  if (anos.length === 1 && meses.length === 1) {
    return `${MES_FULL[meses[0]] || meses[0]} ${anos[0]}`;
  }
  if (anos.length === 1) return String(anos[0]);
  if (anos.length > 1) return `${anos[0]}–${anos[anos.length - 1]}`;
  return "Sem período";
}

function rotuloPeriodo(ano, mes) {
  const yy = String(ano).slice(-2);
  if (!mes || mes === "00") return String(ano);
  return `${MES_NOME[mes] || mes}/${yy}`;
}

function buildTimeline(rows) {
  const map = new Map();
  rows.forEach((r) => {
    if (!r.ano) return;
    const mes = r.mes || "00";
    const key = `${String(r.ano).padStart(4, "0")}-${mes}`;
    if (!map.has(key)) {
      map.set(key, { abertas: 0, concluidas: 0, key, ano: String(r.ano), mes });
    }
    if (isResolvida(r.status)) map.get(key).concluidas += 1;
    else map.get(key).abertas += 1;
  });
  return [...map.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((p) => ({
      ...p,
      label: rotuloPeriodo(p.ano, p.mes),
    }));
}

function cumulativeTimeline(rows) {
  let abertas = 0;
  let concluidas = 0;
  return buildTimeline(rows).map((p) => {
    abertas += p.abertas;
    concluidas += p.concluidas;
    return { ...p, abertas, concluidas };
  });
}

function groupCount(rows, keyFn) {
  const map = new Map();
  rows.forEach((r) => {
    const k = keyFn(r) || "Não informado";
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function groupCountSistemas(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const k = r.sistema || "Não informado";
    map.set(k, (map.get(k) || 0) + 1);
  });
  const ordered = SISTEMAS_CANONICOS
    .filter((nome) => map.has(nome))
    .map((nome) => [nome, map.get(nome)]);
  const extras = [...map.entries()]
    .filter(([nome]) => !SISTEMAS_CANONICOS.includes(nome))
    .sort((a, b) => b[1] - a[1]);
  return [...ordered, ...extras];
}

function applyPeriodFromPoint(point) {
  if (!point) return;
  if (state.filters.ano === point.ano && state.filters.mes === point.mes) {
    state.filters.ano = "";
    state.filters.mes = "";
  } else {
    state.filters.ano = point.ano;
    state.filters.mes = point.mes;
  }
  state.timelinePage = null;
  syncSelectsFromState();
  render();
}

function getTimelineWindow(items) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / TIMELINE_PAGE_SIZE) || 1);

  if (state.timelinePage == null || state.timelinePage >= pageCount) {
    state.timelinePage = pageCount - 1;
  }
  if (state.timelinePage < 0) state.timelinePage = 0;

  const start = state.timelinePage * TIMELINE_PAGE_SIZE;
  const end = Math.min(start + TIMELINE_PAGE_SIZE, total);
  return {
    items: items.slice(start, end),
    start,
    end,
    page: state.timelinePage,
    pageCount,
    total,
  };
}

function updateTimelinePagers(windowInfo) {
  const { start, end, page, pageCount, total } = windowInfo;
  const show = total > TIMELINE_PAGE_SIZE;
  const label = total
    ? `${start + 1}–${end} de ${total}`
    : "0 itens";

  ["pagerLinha", "pagerBarras"].forEach((id) => {
    const pager = el(id);
    if (!pager) return;
    pager.hidden = !show;
    const info = pager.querySelector("[data-timeline-info]");
    if (info) info.textContent = label;
    pager.querySelectorAll("[data-timeline-dir]").forEach((btn) => {
      const dir = Number(btn.getAttribute("data-timeline-dir"));
      btn.disabled = dir < 0 ? page <= 0 : page >= pageCount - 1;
    });
  });
}

function shiftTimelinePage(dir) {
  if (state.timelinePage == null) state.timelinePage = 0;
  state.timelinePage += dir;
  render();
}

function setupTimelinePagers() {
  document.querySelectorAll("[data-timeline-dir]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.getAttribute("data-timeline-dir"));
      if (!Number.isFinite(dir) || dir === 0) return;
      shiftTimelinePage(dir);
    });
  });
}

function renderKpis(rows) {
  const laudos = new Set(rows.map((r) => r.id).filter(Boolean)).size;
  const total = rows.length;
  const resolvidas = rows.filter((r) => isResolvida(r.status)).length;
  const abertas = total - resolvidas;
  const pct = total ? (resolvidas / total) * 100 : 0;
  const criticos = rows.filter((r) => Number(r.prioridade) === 1).length;
  const criticosAbertos = rows.filter(
    (r) => Number(r.prioridade) === 1 && !isResolvida(r.status)
  ).length;
  const comum = rows.filter((r) => r.localPublico === "Área comum").length;
  const unidade = rows.filter((r) => r.localPublico === "Unidade").length;

  el("kpiLaudos").textContent = laudos;
  el("kpiLaudosMeta").textContent = `${total} itens`;
  el("kpiTotal").textContent = total;
  el("kpiAbertas").textContent = `${abertas} abertas`;
  el("kpiResolvidas").textContent = `${resolvidas} resolvidas`;
  el("kpiPct").textContent = `${pct.toFixed(1).replace(".", ",")}%`;
  el("kpiPctMeta").textContent = resolvidas ? `${resolvidas} concluídas` : "sem conclusões";
  el("kpiCriticos").textContent = criticos;
  el("kpiCriticosMeta").textContent = `+ ${criticosAbertos} em aberto`;
  el("cntComum").textContent = comum;
  el("cntUnidade").textContent = unidade;
  el("periodoLabel").textContent = periodoTexto(rows);

  const insight =
    `No período, <strong>${resolvidas}</strong> inconformidades foram resolvidas.`;
  el("insightBox").innerHTML = insight;
  el("cardNote").innerHTML = insight;

  el("btnComum").classList.toggle("active", state.filters.local === "Área comum");
  el("btnUnidade").classList.toggle("active", state.filters.local === "Unidade");

  document.querySelectorAll(".kpi.interactive").forEach((card) => {
    const kind = card.dataset.kpi;
    let active = false;
    if (kind === "abertas") active = state.filters.status === "Aberto";
    if (kind === "criticos") active = state.filters.prioridade === "1";
    if (kind === "resolvidas") active = !!(state.filters.status && isResolvida(state.filters.status));
    card.classList.toggle("active", active);
  });
}

function renderCharts(rows) {
  const total = rows.length || 1;
  const theme = chartTheme();
  const mensalFull = buildTimeline(rows);
  const cumulFull = cumulativeTimeline(rows);
  const timelineWindow = getTimelineWindow(cumulFull);
  const cumul = timelineWindow.items;
  const mensal = mensalFull.slice(timelineWindow.start, timelineWindow.end);
  updateTimelinePagers(timelineWindow);

  makeChart("linha", "chartLinha", {
    type: "line",
    data: {
      labels: cumul.map((p) => p.label),
      datasets: [
        {
          label: "Aberta",
          data: cumul.map((p) => p.abertas),
          borderColor: "#d64545",
          tension: 0.35,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: "#d64545",
          borderWidth: 2.5,
        },
        {
          label: "Concluída",
          data: cumul.map((p) => p.concluidas),
          borderColor: "#2f9e6b",
          tension: 0.35,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: "#2f9e6b",
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipBase(null),
          callbacks: {
            label(ctx) { return `${ctx.dataset.label}: ${ctx.parsed.y}`; },
            footer() { return "Clique para filtrar o mês"; },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: theme.tick,
            maxRotation: 45,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: TIMELINE_PAGE_SIZE,
          },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: theme.tick },
          grid: { color: theme.grid },
        },
      },
    },
  });
  onChartClick("linha", (hit) => applyPeriodFromPoint(cumul[hit.index]));

  const sistemaEntries = groupCountSistemas(rows);
  const sistemaLabels = sistemaEntries.map(([k]) => k);
  const sistemaColors = dimColors(
    sistemaEntries.map(([k], i) =>
      SISTEMA_COLORS[k] || ["#2f5d8a", "#d64545", "#3d8f84", "#e6a817", "#8b5cf6"][i % 5]
    ),
    state.filters.sistema,
    sistemaLabels
  );

  const legendEl = el("donutLegend");
  if (legendEl) {
    legendEl.innerHTML = sistemaEntries.map(([label, value], i) => {
      const pct = ((value / total) * 100).toFixed(1).replace(".", ",");
      const active = state.filters.sistema === label;
      const dim = state.filters.sistema && !active;
      return `
        <button type="button"
          class="donut-legend-item${active ? " active" : ""}${dim ? " dim" : ""}"
          data-sistema="${label.replace(/"/g, "&quot;")}">
          <span class="donut-legend-swatch" style="background:${sistemaColors[i]}"></span>
          <span class="donut-legend-name">${label}</span>
          <span class="donut-legend-pct">${pct}%</span>
        </button>`;
    }).join("");
    legendEl.querySelectorAll("[data-sistema]").forEach((btn) => {
      btn.addEventListener("click", () => toggleFilter("sistema", btn.getAttribute("data-sistema")));
    });
  }

  makeChart("donut", "chartDonut", {
    type: "doughnut",
    data: {
      labels: sistemaLabels,
      datasets: [{
        data: sistemaEntries.map(([, v]) => v),
        backgroundColor: sistemaColors,
        borderWidth: 3,
        borderColor: theme.border,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipBase(total),
          callbacks: {
            label(ctx) {
              const value = ctx.parsed;
              const pct = total ? ((value / total) * 100).toFixed(1).replace(".", ",") : "0";
              return `${ctx.label}: ${value} (${pct}%)`;
            },
            footer() { return "Clique para filtrar o sistema"; },
          },
        },
      },
    },
  });
  onChartClick("donut", (hit) => toggleFilter("sistema", sistemaLabels[hit.index]));

  // Barras empilhadas por sistema (como no modelo)
  const sistemasTop = groupCountSistemas(state.data).slice(0, 5).map(([k]) => k);
  const barLabels = mensal.map((p) => p.label);
  const barDatasets = sistemasTop.map((sistema, i) => {
    const color = SISTEMA_COLORS[sistema] || ["#2f5d8a", "#d64545", "#3d8f84", "#e6a817", "#8b5cf6"][i % 5];
    return {
      label: sistema,
      data: mensal.map((p) =>
        rows.filter((r) =>
          String(r.ano) === p.ano && r.mes === p.mes && r.sistema === sistema
        ).length
      ),
      backgroundColor: state.filters.sistema && state.filters.sistema !== sistema
        ? hexAlpha(color, 0.28)
        : color,
      borderRadius: 3,
      maxBarThickness: 28,
      stack: "s",
    };
  });

  makeChart("barras", "chartBarras", {
    type: "bar",
    data: { labels: barLabels, datasets: barDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: true },
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 10, font: { size: 10 }, color: theme.tick },
          onClick: (_e, item) => toggleFilter("sistema", item.text),
        },
        tooltip: {
          ...tooltipBase(null),
          callbacks: {
            label(ctx) {
              return `${ctx.dataset.label}: ${ctx.parsed.y}`;
            },
            footer() { return "Clique para filtrar o mês"; },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: theme.tick },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0, color: theme.tick },
          grid: { color: theme.grid },
        },
      },
    },
  });
  onChartClick("barras", (hit) => {
    const point = mensal[hit.index];
    const sistema = barDatasets[hit.datasetIndex]?.label;
    if (sistema) {
      // clique: filtra mês + sistema (comportamento BI)
      if (
        state.filters.ano === point.ano &&
        state.filters.mes === point.mes &&
        state.filters.sistema === sistema
      ) {
        state.filters.ano = "";
        state.filters.mes = "";
        state.filters.sistema = "";
      } else {
        state.filters.ano = point.ano;
        state.filters.mes = point.mes;
        state.filters.sistema = sistema;
      }
      state.timelinePage = null;
      syncSelectsFromState();
      render();
      return;
    }
    applyPeriodFromPoint(point);
  });

  renderCriticidade(rows);
}

function renderCriticidade(rows) {
  const total = rows.length || 1;
  const groups = [
    {
      key: "Alto",
      prio: "1",
      cls: "alto",
      icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="#d64545"><path d="M12 2c1.2 3.2-.2 5-1.5 6.4C8.8 10 7.5 11.4 7.5 14a4.5 4.5 0 009 0c0-2.8-1.5-4.4-2.8-5.8C12.3 6.7 11 5.2 12 2z"/></svg>`,
    },
    {
      key: "Médio",
      prio: "2",
      cls: "medio",
      icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="#e6a817"><path d="M12 3.2L22 20.5H2L12 3.2z"/><rect x="11.1" y="9" width="1.8" height="6" rx="0.6" fill="#fff"/><circle cx="12" cy="17.2" r="1.1" fill="#fff"/></svg>`,
    },
    {
      key: "Baixo",
      prio: "3",
      cls: "baixo",
      icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2f9e6b" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.6 2.6L16.2 9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
  ];

  el("critList").innerHTML = groups.map((g) => {
    const count = rows.filter((r) => String(r.prioridade) === g.prio).length;
    const pct = (count / total) * 100;
    const active = state.filters.prioridade === g.prio ? "active" : "";
    return `
      <div class="crit-row ${active}" data-prio="${g.prio}" role="button" tabindex="0">
        <div class="crit-label"><span class="crit-ico">${g.icon}</span>${g.key}</div>
        <div class="crit-bar"><div class="crit-fill ${g.cls}" style="width:${pct}%"></div></div>
        <div class="crit-pct">${pct.toFixed(1).replace(".", ",")}%</div>
        <div class="crit-total">Total: ${count}</div>
      </div>
    `;
  }).join("");

  el("critList").querySelectorAll(".crit-row").forEach((row) => {
    row.addEventListener("click", () => toggleFilter("prioridade", row.dataset.prio));
  });
}

function prioClass(p) {
  if (Number(p) === 1) return "prio-1";
  if (Number(p) === 2) return "prio-2";
  if (Number(p) === 3) return "prio-3";
  return "";
}

function renderTable(rows) {
  const privacidade = el("fPrivacidade").checked;
  el("tableCount").textContent = `(${rows.length})`;
  const tbody = el("tbody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="muted">Nenhum registro com os filtros atuais.</td></tr>`;
    return;
  }

  const sorted = [...rows].sort((a, b) => {
    const pa = a.prioridade ?? 99;
    const pb = b.prioridade ?? 99;
    if (pa !== pb) return pa - pb;
    return (b.gut ?? -1) - (a.gut ?? -1);
  });

  tbody.innerHTML = sorted.map((r) => {
    const periodo = r.mes ? `${r.mes}/${r.ano}` : String(r.ano ?? "—");
    const isUnidade = r.localPublico === "Unidade";
    let descricao = r.descricao || "—";
    let localCell = r.localPublico;
    if (privacidade && isUnidade) {
      localCell = `Unidade <span class="restricted">(detalhe restrito)</span>`;
      descricao = descricao.replace(/\b\d{2,4}-?[A-Za-z]?\b/g, "•••");
    } else if (!privacidade && r.detalheUnidade) {
      localCell = `${r.localPublico}<div class="muted">${r.detalheUnidade}</div>`;
    }
    return `
      <tr>
        <td><strong>${r.id || "—"}</strong><div class="muted">${periodo}</div></td>
        <td>${r.sistema || "—"}<div class="muted">${r.subsistema || r.sistemaOriginal || ""}</div></td>
        <td class="desc-cell">${descricao}</td>
        <td>${r.tipoFalha || "—"}</td>
        <td>${r.gut ?? "—"}</td>
        <td><span class="prio ${prioClass(r.prioridade)}">${r.prioridade ?? "—"}</span></td>
        <td>${r.responsavel || "—"}</td>
        <td>${localCell}</td>
        <td><span class="status-pill">${r.status || "—"}</span></td>
      </tr>
    `;
  }).join("");
}

function render() {
  const rows = getFiltered();
  renderChips();
  renderKpis(rows);
  renderCharts(rows);
  renderTable(rows);
}

function setFiltersOpen(open) {
  document.body.classList.toggle("filters-open", open);
  const btn = el("btnToggleFiltros");
  const backdrop = el("filtersBackdrop");
  if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  if (backdrop) backdrop.hidden = true;
}

function setupMobileFilters() {
  const open = () => setFiltersOpen(true);
  const close = () => setFiltersOpen(false);
  const toggle = () => setFiltersOpen(!document.body.classList.contains("filters-open"));

  el("btnToggleFiltros")?.addEventListener("click", toggle);
  el("btnCloseFiltros")?.addEventListener("click", close);
  el("filtersBackdrop")?.addEventListener("click", close);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) close();
    Object.values(state.charts).forEach((c) => c?.resize?.());
  });
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 900px)").matches;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    setupThemeToggle();
    setupMobileFilters();
    setupTimelinePagers();

    const raw = await carregarBase();
    state.data = enriquecer(raw);

    const countEl = el("dataCount");
    if (countEl) countEl.textContent = `${state.data.length} registros`;

    if (!state.data.length) {
      showBootError(
        "Nenhum dado carregado. Abra pelo servidor local (serve.ps1 → http://localhost:5500) e confira data.js / data/inconformidades.json."
      );
      return;
    }

    if (typeof Chart === "undefined") {
      showBootError("Chart.js não encontrado. Verifique a pasta vendor/.");
    }

    setupFilters();
    render();
  } catch (err) {
    console.error(err);
    showBootError(`Erro ao iniciar o dashboard: ${err.message || err}`);
  }
});
