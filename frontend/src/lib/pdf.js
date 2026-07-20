import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { computeGoalStatus } from "@/lib/goalStatus";
import { rwBand, soma8Band, percMMBand, mmMgBand, imcBand } from "@/lib/formulas";
import logoUrl from "@/assets/cdt-logo-small.png";

// Cores institucionais do CD Trofense (RGB) — sincronizadas com index.css.
const CLUB_RED = [220, 25, 40];
const CLUB_NAVY = [27, 44, 90];
const CLUB_YELLOW = [255, 210, 0];

// Cache do emblema como data URL (evita recarregar em cada exportação).
let _logoDataUrl = null;
async function getLogoDataUrl() {
  if (_logoDataUrl) return _logoDataUrl;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    _logoDataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch (e) {
    _logoDataUrl = null;
  }
  return _logoDataUrl;
}

/** Cabeçalho comum em todas as páginas do PDF (com emblema oficial). */
function drawHeader(doc, subtitle, logoData) {
  const pageW = doc.internal.pageSize.getWidth();
  // Faixa vermelha institucional
  doc.setFillColor(...CLUB_RED);
  doc.rect(0, 0, pageW, 22, "F");
  // Faixa amarela fina abaixo
  doc.setFillColor(...CLUB_YELLOW);
  doc.rect(0, 22, pageW, 1.2, "F");
  // Emblema no canto (se disponível)
  if (logoData) {
    try { doc.addImage(logoData, "PNG", 8, 3.5, 15, 15); } catch { /* ignore */ }
  }
  // Título
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CLUBE DESPORTIVO TROFENSE", 27, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Departamento Médico · Composição Corporal", 27, 15.5);
  // Data topo direito
  doc.setFontSize(8.5);
  const now = new Date().toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });
  doc.text(now, pageW - 8, 12, { align: "right" });
  // Subtítulo
  doc.setTextColor(...CLUB_NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(subtitle, 14, 33);
  // Linha decorativa navy
  doc.setDrawColor(...CLUB_NAVY);
  doc.setLineWidth(0.4);
  doc.line(14, 36, pageW - 14, 36);
}

/** Rodapé com paginação + assinatura do clube. */
function drawFooter(doc) {
  const pages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...CLUB_RED);
    doc.setLineWidth(0.6);
    doc.line(14, pageH - 12, pageW - 14, pageH - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.setFont("helvetica", "italic");
    doc.text("Desde 1930 · história, paixão e glória", 14, pageH - 6);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${i} de ${pages}`, pageW - 14, pageH - 6, { align: "right" });
  }
}

/** Traduz uma cor de banda para RGB usado nas células. */
function bandRgb(color) {
  switch (color) {
    case "otimo": return [16, 185, 129];      // emerald
    case "atencao": return [245, 158, 11];    // amber
    case "alto": return [239, 68, 68];        // red
    default: return [100, 116, 139];          // slate
  }
}

function statusRgb(status) {
  switch (status) {
    case "atingido": return [16, 185, 129];
    case "quase_la": return [132, 204, 22];
    case "em_progresso": return [245, 158, 11];
    case "prioritario": return [239, 68, 68];
    default: return [100, 116, 139];
  }
}

/** PDF do Dashboard: KPIs + Plantel completo por atleta. */
export async function exportDashboardPdf(athletes, stats) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await getLogoDataUrl();
  drawHeader(doc, "Dashboard · Plantel", logo);

  // KPIs em linha
  const kpis = [
    ["Atletas", String(stats?.total ?? "—")],
    ["Peso médio", stats?.avgPeso ? `${stats.avgPeso} kg` : "—"],
    ["% MG média (R&W)", stats?.avgBf ? `${stats.avgBf}%` : "—"],
    ["Em Ótimo (<9%)", String(stats?.otimo ?? "—")],
    ["Atenção / Alto", stats ? `${stats.atencao} / ${stats.alto}` : "—"],
  ];
  autoTable(doc, {
    startY: 40,
    theme: "grid",
    head: [kpis.map((k) => k[0])],
    body: [kpis.map((k) => k[1])],
    styles: { halign: "center", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 8 },
    bodyStyles: { fontStyle: "bold", fontSize: 12 },
  });

  // Tabela do plantel
  const head = [["Nome", "Posição", "Idade", "Alt. (cm)", "Peso (kg)", "% MG (R&W)", "Σ 8 pregas", "% MM", "MM/MG", "IMC"]];
  const body = athletes.map((a) => {
    const m = a.last_metrics || {};
    return [
      a.nome,
      a.posicao || "—",
      a.idade != null ? String(a.idade) : "—",
      a.altura_cm != null ? String(a.altura_cm) : "—",
      a.display_weight != null ? String(a.display_weight) : "—",
      { content: m.rw != null ? `${m.rw}%` : "—", band: rwBand(m.rw).color },
      { content: m.soma8 != null ? String(Math.round(m.soma8)) : "—", band: soma8Band(m.soma8).color },
      { content: m.perc_mm != null ? `${m.perc_mm}%` : "—", band: percMMBand(m.perc_mm).color },
      { content: m.mm_mg_ratio != null ? String(m.mm_mg_ratio) : "—", band: mmMgBand(m.mm_mg_ratio, a.sexo === "M" ? 1 : 0).color },
      { content: m.imc != null ? String(m.imc) : "—", band: imcBand(m.imc).color },
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: doc.lastAutoTable.finalY + 6,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: CLUB_RED, textColor: 255, fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
      7: { halign: "center" },
      8: { halign: "center" },
      9: { halign: "center" },
    },
    // Colorir células com base na banda
    didParseCell: (data) => {
      const cell = data.cell.raw;
      if (data.section === "body" && cell && typeof cell === "object" && cell.band) {
        const [r, g, b] = bandRgb(cell.band);
        data.cell.styles.fillColor = [r, g, b, 0.15];
        data.cell.styles.textColor = [r, g, b];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  drawFooter(doc);
  const filename = `trofense_dashboard_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/** PDF dos Objetivos de Equipa: sumário + tabela priorizada. */
export async function exportTeamGoalsPdf(rows, counts) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await getLogoDataUrl();
  drawHeader(doc, "Objetivos de Equipa · Ajustes de peso", logo);

  // Sumário de estados
  const summary = [
    ["Prioritário", counts.prioritario],
    ["Em progresso", counts.em_progresso],
    ["Quase lá", counts.quase_la],
    ["Atingido", counts.atingido],
    ["Sem objetivo", counts.sem_objetivo],
    ["Total", (counts.prioritario ?? 0) + (counts.em_progresso ?? 0) + (counts.quase_la ?? 0) + (counts.atingido ?? 0) + (counts.sem_objetivo ?? 0) + (counts.sem_dados ?? 0)],
  ];
  autoTable(doc, {
    startY: 40,
    theme: "grid",
    head: [summary.map((k) => k[0])],
    body: [summary.map((k) => String(k[1] ?? 0))],
    styles: { halign: "center", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 8 },
    bodyStyles: { fontStyle: "bold", fontSize: 12 },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const labelRow = summary.map((s) => s[0]);
      const label = labelRow[data.column.index];
      const map = { "Prioritário": "prioritario", "Em progresso": "em_progresso", "Quase lá": "quase_la", "Atingido": "atingido" };
      if (map[label]) {
        const [r, g, b] = statusRgb(map[label]);
        data.cell.styles.textColor = [r, g, b];
      }
    },
  });

  // Tabela priorizada
  const head = [["Atleta", "Posição", "Estado", "Peso atual", "% MG atual", "% MG alvo", "Peso alvo", "Δ peso", "Direção"]];
  const body = rows.map((r) => [
    r.nome,
    r.posicao || "—",
    { content: r.label, status: r.status },
    r.currentWeight != null ? `${r.currentWeight} kg` : "—",
    r.currentBf != null ? `${r.currentBf}%` : "—",
    r.targetBf != null ? `${r.targetBf}%` : "—",
    r.targetWeight != null ? `${r.targetWeight} kg` : "—",
    r.absDelta != null ? `${r.absDelta} kg` : "—",
    r.direction === "perder" ? "↓ Perder" : r.direction === "ganhar" ? "↑ Ganhar" : r.direction === "manter" ? "— No alvo" : "—",
  ]);

  autoTable(doc, {
    head,
    body,
    startY: doc.lastAutoTable.finalY + 6,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: CLUB_RED, textColor: 255, fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: 20 },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right", fontStyle: "bold" },
      8: { halign: "center" },
    },
    didParseCell: (data) => {
      const cell = data.cell.raw;
      if (data.section === "body" && cell && typeof cell === "object" && cell.status) {
        const [r, g, b] = statusRgb(cell.status);
        data.cell.styles.fillColor = [r, g, b, 0.15];
        data.cell.styles.textColor = [r, g, b];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Nota final
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    "Peso alvo calculado com base no peso atual, % MG atual (Reilly & Wallace) e % MG alvo, preservando a massa magra. " +
    "Faixas: Atingido ≤0.5 kg · Quase lá ≤2 kg · Em progresso ≤5 kg · Prioritário >5 kg.",
    14, finalY, { maxWidth: doc.internal.pageSize.getWidth() - 28 }
  );

  drawFooter(doc);
  const filename = `trofense_objetivos_equipa_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// -------------------------------------------------------------------
// PDF INDIVIDUAL POR ATLETA
// -------------------------------------------------------------------

/** Descarrega uma foto autenticada e devolve como data URL (para embed em PDF). */
async function fetchPhotoAsDataUrl(photoId) {
  try {
    const token = localStorage.getItem("trofense_token");
    const base = process.env.REACT_APP_BACKEND_URL;
    const res = await fetch(`${base}/api/photos/${photoId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

/** Desenha um gráfico de linhas simples de evolução de uma métrica. */
function drawLineChart(doc, title, points, x, y, w, h, unit = "") {
  const nav = CLUB_NAVY;
  const red = CLUB_RED;
  // Título
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...nav);
  doc.text(title, x, y - 2);
  // Frame
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  if (!points || points.length < 2) {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Dados insuficientes", x + w / 2, y + h / 2, { align: "center" });
    return;
  }
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  // Gridlines Y (3 linhas)
  doc.setDrawColor(230);
  for (let i = 1; i < 4; i++) {
    const yy = y + pad + (innerH * i) / 4;
    doc.line(x + pad, yy, x + w - pad, yy);
  }
  // Rótulos Y (min / max)
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`${max.toFixed(1)}${unit}`, x + 2, y + pad + 2);
  doc.text(`${min.toFixed(1)}${unit}`, x + 2, y + h - pad - 1);
  // Linha
  doc.setDrawColor(...red);
  doc.setLineWidth(0.6);
  const step = points.length === 1 ? 0 : innerW / (points.length - 1);
  let prev = null;
  points.forEach((p, i) => {
    const px = x + pad + step * i;
    const py = y + pad + innerH - ((p.v - min) / range) * innerH;
    if (prev) doc.line(prev[0], prev[1], px, py);
    prev = [px, py];
  });
  // Pontos
  doc.setFillColor(...red);
  points.forEach((p, i) => {
    const px = x + pad + step * i;
    const py = y + pad + innerH - ((p.v - min) / range) * innerH;
    doc.circle(px, py, 0.9, "F");
  });
  // Rótulos X (primeiro e último)
  doc.setFontSize(6.5);
  doc.setTextColor(120);
  doc.text(points[0].d, x + pad, y + h + 3);
  if (points.length > 1) {
    doc.text(points[points.length - 1].d, x + w - pad, y + h + 3, { align: "right" });
  }
}

/**
 * PDF individual por atleta: capa com foto de perfil + KPIs + histórico + evolução.
 * `athlete`, `evals` (ordenados asc), `weighins` (ordenados asc).
 */
export async function exportAthletePdf(athlete, evals, weighins) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getLogoDataUrl();
  drawHeader(doc, `Relatório · ${athlete.nome}`, logo);

  const pageW = doc.internal.pageSize.getWidth();

  // Descarregar foto de perfil se existir
  let profileDataUrl = null;
  try {
    const token = localStorage.getItem("trofense_token");
    const base = process.env.REACT_APP_BACKEND_URL;
    const listRes = await fetch(`${base}/api/athletes/${athlete.id}/photos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok) {
      const list = await listRes.json();
      const prof = (list || []).find((p) => p.kind === "profile");
      if (prof) profileDataUrl = await fetchPhotoAsDataUrl(prof.id);
    }
  } catch { /* ignore */ }

  // Bloco identificação: avatar + dados
  const cardY = 42;
  const cardH = 44;
  doc.setDrawColor(230);
  doc.setLineWidth(0.3);
  doc.rect(14, cardY, pageW - 28, cardH);
  // Avatar
  if (profileDataUrl) {
    try { doc.addImage(profileDataUrl, "JPEG", 18, cardY + 4, 36, 36); } catch { /* ignore */ }
  } else {
    doc.setFillColor(220);
    doc.circle(36, cardY + 22, 18, "F");
    doc.setTextColor(255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    const initials = (athlete.nome || "").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
    doc.text(initials || "?", 36, cardY + 26, { align: "center" });
  }
  // Dados à direita do avatar
  const infoX = 62;
  doc.setTextColor(...CLUB_NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(athlete.nome || "—", infoX, cardY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const meta = [
    athlete.posicao || null,
    athlete.sexo === "M" ? "Masculino" : "Feminino",
    athlete.idade != null ? `${athlete.idade} anos` : null,
    athlete.altura_cm != null ? `${athlete.altura_cm} cm` : null,
    athlete.etnia ? athlete.etnia : null,
  ].filter(Boolean).join(" · ");
  doc.text(meta, infoX, cardY + 18);

  const last = evals[evals.length - 1];
  const first = evals[0];
  if (last) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CLUB_RED);
    doc.text("ÚLTIMA AVALIAÇÃO", infoX, cardY + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(new Date(last.date).toLocaleDateString("pt-PT"), infoX, cardY + 31);
  }

  // KPIs (grelha 4x2 abaixo)
  const kpiY = cardY + cardH + 6;
  const kpis = last ? [
    ["Peso", `${last.peso_kg} kg`],
    ["% MG (R&W)", `${last.metrics?.rw ?? "—"}%`],
    ["Massa Gorda", `${last.metrics?.fat_mass_kg ?? "—"} kg`],
    ["Massa Magra", `${last.metrics?.lean_mass_kg ?? "—"} kg`],
    ["Massa Muscular", `${last.metrics?.muscle_mass_kg ?? "—"} kg`],
    ["MM/MG", `${last.metrics?.mm_mg_ratio ?? "—"}`],
    ["IMC", `${last.metrics?.imc ?? "—"}`],
    ["Σ 8 pregas", `${last.metrics?.soma8 != null ? Math.round(last.metrics.soma8) : "—"}`],
  ] : [];
  if (kpis.length) {
    autoTable(doc, {
      startY: kpiY,
      theme: "grid",
      head: [kpis.map((k) => k[0])],
      body: [kpis.map((k) => k[1])],
      styles: { halign: "center", fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontStyle: "bold", fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
  }

  // Comparativo entre métodos
  if (last?.metrics) {
    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY ?? kpiY) + 4,
      theme: "grid",
      head: [["Reilly & Wallace", "Jackson-Pollock 7", "Evans 7", "Evans 3", "Withers"]],
      body: [[
        `${last.metrics.rw ?? "—"}%`,
        `${last.metrics.jp7 ?? "—"}%`,
        `${last.metrics.evans7 ?? "—"}%`,
        `${last.metrics.evans3 ?? "—"}%`,
        `${last.metrics.withers ?? "—"}%`,
      ]],
      styles: { halign: "center", fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: CLUB_RED, textColor: 255, fontSize: 8 },
      bodyStyles: { fontStyle: "bold", fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
  }

  // Gráfico evolução (Peso + %MG)
  const chartY = (doc.lastAutoTable?.finalY ?? kpiY) + 8;
  const halfW = (pageW - 28 - 6) / 2;
  const pesoPoints = [
    ...(evals.map((e) => ({ v: e.peso_kg, d: new Date(e.date).toLocaleDateString("pt-PT") })).filter((p) => p.v != null)),
    ...(weighins || []).map((w) => ({ v: w.peso_kg, d: new Date(w.date).toLocaleDateString("pt-PT") })).filter((p) => p.v != null),
  ].sort((a, b) => a.d.localeCompare(b.d));
  const bfPoints = evals.map((e) => ({ v: e.metrics?.rw, d: new Date(e.date).toLocaleDateString("pt-PT") })).filter((p) => p.v != null);
  drawLineChart(doc, "Evolução do peso", pesoPoints, 14, chartY, halfW, 40, " kg");
  drawLineChart(doc, "Evolução da % MG (R&W)", bfPoints, 14 + halfW + 6, chartY, halfW, 40, "%");

  // Objetivo (se definido)
  if (athlete.goal?.bf_target_pct != null && last?.metrics?.rw != null) {
    const targetBf = athlete.goal.bf_target_pct;
    const currentBf = last.metrics.rw;
    const currentWeight = last.peso_kg;
    const targetWeight = +(currentWeight * (100 - currentBf) / (100 - targetBf)).toFixed(1);
    const delta = +(currentWeight - targetWeight).toFixed(1);
    autoTable(doc, {
      startY: chartY + 48,
      theme: "grid",
      head: [["% MG atual", "% MG alvo", "Peso atual", "Peso alvo", "Δ peso"]],
      body: [[
        `${currentBf}%`,
        `${targetBf}%`,
        `${currentWeight} kg`,
        `${targetWeight} kg`,
        `${Math.abs(delta)} kg ${delta > 0.1 ? "a perder" : delta < -0.1 ? "a ganhar" : "no alvo"}`,
      ]],
      styles: { halign: "center", fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 8 },
      bodyStyles: { fontStyle: "bold", fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
  }

  // Nova página: histórico completo
  doc.addPage();
  drawHeader(doc, `Histórico · ${athlete.nome}`, logo);
  const histHead = [["Data", "Peso (kg)", "% MG (R&W)", "% MG (JP7)", "MG kg", "MM kg", "MM/MG", "IMC", "Σ 8"]];
  const histBody = [...evals].reverse().map((e) => {
    const m = e.metrics || {};
    return [
      new Date(e.date).toLocaleDateString("pt-PT"),
      e.peso_kg != null ? String(e.peso_kg) : "—",
      m.rw != null ? `${m.rw}%` : "—",
      m.jp7 != null ? `${m.jp7}%` : "—",
      m.fat_mass_kg != null ? String(m.fat_mass_kg) : "—",
      m.lean_mass_kg != null ? String(m.lean_mass_kg) : "—",
      m.mm_mg_ratio != null ? String(m.mm_mg_ratio) : "—",
      m.imc != null ? String(m.imc) : "—",
      m.soma8 != null ? String(Math.round(m.soma8)) : "—",
    ];
  });
  autoTable(doc, {
    startY: 42,
    head: histHead,
    body: histBody,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 1.8, halign: "center" },
    headStyles: { fillColor: CLUB_RED, textColor: 255, fontSize: 8 },
    columnStyles: { 0: { fontStyle: "bold", halign: "left" } },
    margin: { left: 14, right: 14 },
  });

  // Delta primeira vs última (se houver ≥ 2 avaliações)
  if (first && last && first !== last) {
    const y = (doc.lastAutoTable?.finalY ?? 60) + 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CLUB_NAVY);
    doc.text("Progresso global", 14, y);
    const deltaPeso = last.peso_kg - first.peso_kg;
    const deltaBf = (last.metrics?.rw ?? 0) - (first.metrics?.rw ?? 0);
    const deltaImc = (last.metrics?.imc ?? 0) - (first.metrics?.imc ?? 0);
    autoTable(doc, {
      startY: y + 2,
      theme: "grid",
      head: [["Da 1.ª avaliação", "Até à última", "Δ Peso", "Δ % MG", "Δ IMC"]],
      body: [[
        new Date(first.date).toLocaleDateString("pt-PT"),
        new Date(last.date).toLocaleDateString("pt-PT"),
        `${deltaPeso > 0 ? "+" : ""}${deltaPeso.toFixed(1)} kg`,
        `${deltaBf > 0 ? "+" : ""}${deltaBf.toFixed(1)}%`,
        `${deltaImc > 0 ? "+" : ""}${deltaImc.toFixed(1)}`,
      ]],
      styles: { halign: "center", fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 8 },
      bodyStyles: { fontStyle: "bold", fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
  }

  // Fotos da última avaliação (se existirem)
  try {
    const token = localStorage.getItem("trofense_token");
    const base = process.env.REACT_APP_BACKEND_URL;
    const listRes = await fetch(`${base}/api/athletes/${athlete.id}/photos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok && last) {
      const list = await listRes.json();
      const evPhotos = (list || []).filter((p) => p.evaluation_id === last.id && ["frontal", "perfil", "costas"].includes(p.kind));
      if (evPhotos.length) {
        doc.addPage();
        drawHeader(doc, `Fotografias · Última avaliação`, logo);
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text(`Data: ${new Date(last.date).toLocaleDateString("pt-PT")}`, 14, 42);
        const w = (pageW - 28 - 12) / 3; // 3 slots com 6mm de espaço entre
        const h = w * 1.33; // 3:4
        const y = 48;
        const labels = { frontal: "Frente", perfil: "Perfil", costas: "Costas" };
        const order = ["frontal", "perfil", "costas"];
        for (let i = 0; i < order.length; i++) {
          const p = evPhotos.find((x) => x.kind === order[i]);
          const x = 14 + (w + 6) * i;
          doc.setDrawColor(200);
          doc.rect(x, y, w, h);
          if (p) {
            const data = await fetchPhotoAsDataUrl(p.id);
            if (data) {
              try { doc.addImage(data, "JPEG", x + 1, y + 1, w - 2, h - 2); } catch { /* ignore */ }
            }
          }
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...CLUB_NAVY);
          doc.text(labels[order[i]], x + w / 2, y + h + 5, { align: "center" });
        }
      }
    }
  } catch { /* ignore */ }

  drawFooter(doc);
  const safe = (athlete.nome || "atleta").replace(/[^\w-]+/g, "_");
  const filename = `trofense_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// Re-export computeGoalStatus for convenience if needed by callers
export { computeGoalStatus };
