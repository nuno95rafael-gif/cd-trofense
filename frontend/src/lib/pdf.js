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

// Re-export computeGoalStatus for convenience if needed by callers
export { computeGoalStatus };
