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

/** Cabeçalho comum em todas as páginas do PDF (com emblema oficial).
 *  Design: faixa navy sólida + linha fina vermelha + linha fina amarela como accent
 *  (o navy é a cor institucional predominante da app; vermelho e amarelo funcionam como acentos).
 */
function drawHeader(doc, subtitle, logoData) {
  const pageW = doc.internal.pageSize.getWidth();
  // Faixa navy sólida (cor principal do cabeçalho)
  doc.setFillColor(...CLUB_NAVY);
  doc.rect(0, 0, pageW, 24, "F");
  // Linha vermelha fina (accent)
  doc.setFillColor(...CLUB_RED);
  doc.rect(0, 24, pageW, 1.2, "F");
  // Linha amarela ultra-fina abaixo (assinatura visual do clube)
  doc.setFillColor(...CLUB_YELLOW);
  doc.rect(0, 25.2, pageW, 0.6, "F");

  // Emblema no canto (se disponível)
  if (logoData) {
    try { doc.addImage(logoData, "PNG", 10, 4, 16, 16); } catch { /* ignore */ }
  }
  // Título
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CLUBE DESPORTIVO TROFENSE", 30, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Departamento Médico · Composição Corporal", 30, 17);
  // Data topo direito
  doc.setFontSize(8);
  const now = new Date().toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });
  doc.text(now, pageW - 10, 13, { align: "right" });

  // Subtítulo (fora da faixa, com respiração)
  doc.setTextColor(...CLUB_NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(subtitle, 14, 38);
}

/** Rodapé com paginação + assinatura do clube. Fino e discreto. */
function drawFooter(doc) {
  const pages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    // Linha navy suave no rodapé
    doc.setDrawColor(...CLUB_NAVY);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 12, pageW - 14, pageH - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(140);
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
    startY: 44,
    theme: "plain",
    head: [kpis.map((k) => k[0])],
    body: [kpis.map((k) => k[1])],
    styles: { halign: "center", fontSize: 8, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.1 },
    headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 7.5, cellPadding: 2.5 },
    bodyStyles: { fontStyle: "bold", fontSize: 13, textColor: CLUB_NAVY, cellPadding: 4 },
  });

  // Tabela do plantel — cabeçalho navy, respiração generosa, alternância suave
  const head = [["Nome", "Posição", "Idade", "Alt. (cm)", "Peso (kg)", "% MG (R&W)", "Soma 8 (mm)", "% MM", "MM/MG", "IMC"]];
  const body = athletes.map((a) => {
    const m = a.last_metrics || {};
    return [
      a.nome,
      a.posicao || "—",
      a.idade != null ? String(a.idade) : "—",
      a.altura_cm != null ? String(a.altura_cm) : "—",
      a.display_weight != null ? String(a.display_weight) : "—",
      { content: m.rw != null ? `${m.rw}%` : "—", band: rwBand(m.rw).color },
      { content: m.soma8 != null ? `${Math.round(m.soma8)} mm` : "—", band: soma8Band(m.soma8).color },
      { content: m.perc_mm != null ? `${m.perc_mm}%` : "—", band: percMMBand(m.perc_mm).color },
      { content: m.mm_mg_ratio != null ? String(m.mm_mg_ratio) : "—", band: mmMgBand(m.mm_mg_ratio, a.sexo === "M" ? 1 : 0).color },
      { content: m.imc != null ? String(m.imc) : "—", band: imcBand(m.imc).color },
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: doc.lastAutoTable.finalY + 8,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, lineColor: [235, 235, 235], lineWidth: 0.15 },
    headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45, textColor: CLUB_NAVY },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
      7: { halign: "center" },
      8: { halign: "center" },
      9: { halign: "center" },
    },
    // Colorir células com base na banda (só o texto — evita blocos de cor)
    didParseCell: (data) => {
      const cell = data.cell.raw;
      if (data.section === "body" && cell && typeof cell === "object" && cell.band) {
        const [r, g, b] = bandRgb(cell.band);
        data.cell.styles.textColor = [r, g, b];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  drawFooter(doc);
  const filename = `trofense_dashboard_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/** PDF dos Objetivos de Equipa: réplica da tabela do ecrã (sem sumário separado). */
export async function exportTeamGoalsPdf(rows, counts) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await getLogoDataUrl();
  drawHeader(doc, "Objetivos de Equipa · Ajustes de peso", logo);

  const pageW = doc.internal.pageSize.getWidth();

  // Tabela — mesmas colunas que aparecem no ecrã da app (símbolos Σ/Δ substituídos por texto por incompatibilidade da fonte Helvetica)
  const head = [["Atleta", "Posição", "Estado", "Peso atual", "% MG atual", "% MG alvo", "Peso alvo", "Dif. peso", "Direção"]];
  const body = rows.map((r) => [
    r.nome,
    r.posicao || "—",
    { content: r.label, status: r.status },
    r.currentWeight != null ? `${r.currentWeight} kg` : "—",
    r.currentBf != null ? `${r.currentBf}%` : "—",
    r.targetBf != null ? `${r.targetBf}%` : "—",
    r.targetWeight != null ? `${r.targetWeight} kg` : "—",
    r.absDelta != null ? `${r.absDelta} kg` : "—",
    r.direction === "perder" ? "A perder peso" : r.direction === "ganhar" ? "A ganhar peso" : r.direction === "manter" ? "No alvo" : "—",
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 44,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, lineColor: [235, 235, 235], lineWidth: 0.15 },
    headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 48, textColor: CLUB_NAVY },
      1: { cellWidth: 22 },
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
        data.cell.styles.textColor = [r, g, b];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Nota final compacta com faixas
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    "Faixas: Atingido ≤0.5 kg · Quase lá ≤2 kg · Em progresso ≤5 kg · Prioritário >5 kg. " +
    "Peso alvo calculado a partir do peso atual, % MG atual (Reilly & Wallace) e % MG alvo, preservando a massa magra.",
    14, finalY, { maxWidth: pageW - 28 }
  );

  drawFooter(doc);
  const filename = `trofense_objetivos_equipa_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// -------------------------------------------------------------------
// PDF INDIVIDUAL POR ATLETA
// -------------------------------------------------------------------

/** Descarrega uma foto autenticada e devolve como data URL (para embed em PDF).
 *  Aplica automaticamente a rotação EXIF ('from-image') via createImageBitmap para que
 *  as fotos apareçam com a orientação correta (o jsPDF não respeita o flag EXIF).
 */
async function fetchPhotoAsDataUrl(photoId) {
  try {
    const token = localStorage.getItem("trofense_token");
    const base = process.env.REACT_APP_BACKEND_URL;
    const res = await fetch(`${base}/api/photos/${photoId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await normalizeToDataUrl(blob);
  } catch { return null; }
}

/** Descodifica o blob respeitando a orientação EXIF e devolve um dataURL JPEG normalizado. */
async function normalizeToDataUrl(blob) {
  // Tenta primeiro com createImageBitmap (respeita EXIF nativamente em navegadores modernos).
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    bmp.close?.();
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    // Fallback: devolve o data URL raw (sem correção EXIF)
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }
}

/** Devolve {w, h} naturais de uma imagem a partir de um data URL. */
async function getImageSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = dataUrl;
  });
}

/** Ajusta a imagem à caixa (contain), preservando aspect ratio. Devolve x/y/w/h para o addImage. */
function fitContain(imgW, imgH, boxX, boxY, boxW, boxH) {
  if (!imgW || !imgH) return { x: boxX, y: boxY, w: boxW, h: boxH };
  const boxAspect = boxW / boxH;
  const imgAspect = imgW / imgH;
  let w, h;
  if (imgAspect > boxAspect) {
    // limitado pela largura
    w = boxW;
    h = boxW / imgAspect;
  } else {
    // limitado pela altura
    h = boxH;
    w = boxH * imgAspect;
  }
  const x = boxX + (boxW - w) / 2;
  const y = boxY + (boxH - h) / 2;
  return { x, y, w, h };
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
 * Se `saveFile=false`, devolve o `doc` sem gravar (útil para envio por email).
 */
export async function exportAthletePdf(athlete, evals, weighins, saveFile = true) {
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
  const cardY = 46;
  const cardH = 46;
  // Rectângulo com borda subtil e canto superior esquerdo com acento vermelho
  doc.setDrawColor(230);
  doc.setLineWidth(0.3);
  doc.rect(14, cardY, pageW - 28, cardH);
  doc.setFillColor(...CLUB_RED);
  doc.rect(14, cardY, 3, cardH, "F"); // barra vermelha vertical à esquerda
  // Avatar (com anel navy)
  const avX = 22, avY = cardY + 4, avSize = 38;
  if (profileDataUrl) {
    try {
      const s = await getImageSize(profileDataUrl);
      const fit = fitContain(s.w, s.h, avX, avY, avSize, avSize);
      // Fundo cinza claro para preencher zonas laterais quando aspect ≠ 1:1
      doc.setFillColor(230, 232, 236);
      doc.rect(avX, avY, avSize, avSize, "F");
      doc.addImage(profileDataUrl, "JPEG", fit.x, fit.y, fit.w, fit.h);
    } catch { /* ignore */ }
  } else {
    doc.setFillColor(230, 232, 236);
    doc.rect(avX, avY, avSize, avSize, "F");
    doc.setTextColor(...CLUB_NAVY);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    const initials = (athlete.nome || "").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
    doc.text(initials || "?", avX + avSize / 2, avY + avSize / 2 + 3, { align: "center" });
  }
  // Dados à direita do avatar
  const infoX = avX + avSize + 8;
  doc.setTextColor(...CLUB_NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(athlete.nome || "—", infoX, cardY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  const meta = [
    athlete.posicao || null,
    athlete.sexo === "M" ? "Masculino" : "Feminino",
    athlete.idade != null ? `${athlete.idade} anos` : null,
    athlete.altura_cm != null ? `${athlete.altura_cm} cm` : null,
    athlete.etnia ? athlete.etnia : null,
  ].filter(Boolean).join("  ·  ");
  doc.text(meta, infoX, cardY + 21);

  const last = evals[evals.length - 1];
  const first = evals[0];
  if (last) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...CLUB_RED);
    doc.text("ÚLTIMA AVALIAÇÃO", infoX, cardY + 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(new Date(last.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" }), infoX, cardY + 38);
  }

  // Título da secção KPIs
  const kpiY = cardY + cardH + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CLUB_NAVY);
  doc.text("INDICADORES · Última avaliação", 14, kpiY - 3);
  doc.setDrawColor(...CLUB_NAVY);
  doc.setLineWidth(0.4);
  doc.line(14, kpiY - 1.5, 70, kpiY - 1.5);
  // KPIs (grelha 4x2 abaixo)
  const kpis = last ? [
    ["Peso", `${last.peso_kg} kg`],
    ["% MG (R&W)", `${last.metrics?.rw ?? "—"}%`],
    ["Massa Gorda", `${last.metrics?.fat_mass_kg ?? "—"} kg`],
    ["Massa Magra", `${last.metrics?.lean_mass_kg ?? "—"} kg`],
    ["Massa Muscular", `${last.metrics?.muscle_mass_kg ?? "—"} kg`],
    ["MM/MG", `${last.metrics?.mm_mg_ratio ?? "—"}`],
    ["IMC", `${last.metrics?.imc ?? "—"}`],
    ["Soma 8 pregas", `${last.metrics?.soma8 != null ? `${Math.round(last.metrics.soma8)} mm` : "—"}`],
  ] : [];
  if (kpis.length) {
    autoTable(doc, {
      startY: kpiY,
      theme: "plain",
      head: [kpis.map((k) => k[0])],
      body: [kpis.map((k) => k[1])],
      styles: { halign: "center", fontSize: 7.5, cellPadding: 3, lineColor: [235, 235, 235], lineWidth: 0.15 },
      headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontStyle: "bold", fontSize: 11, cellPadding: 4, textColor: CLUB_NAVY },
      margin: { left: 14, right: 14 },
    });
  }

  // Título da secção métodos
  const methY = (doc.lastAutoTable?.finalY ?? kpiY) + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CLUB_NAVY);
  doc.text("MÉTODOS DE CÁLCULO · % Massa Gorda", 14, methY - 3);
  doc.setDrawColor(...CLUB_NAVY);
  doc.line(14, methY - 1.5, 80, methY - 1.5);
  // Comparativo entre métodos
  if (last?.metrics) {
    autoTable(doc, {
      startY: methY,
      theme: "plain",
      head: [["Reilly & Wallace", "Jackson-Pollock 7", "Evans 7", "Evans 3", "Withers"]],
      body: [[
        `${last.metrics.rw ?? "—"}%`,
        `${last.metrics.jp7 ?? "—"}%`,
        `${last.metrics.evans7 ?? "—"}%`,
        `${last.metrics.evans3 ?? "—"}%`,
        `${last.metrics.withers ?? "—"}%`,
      ]],
      styles: { halign: "center", fontSize: 8, cellPadding: 3, lineColor: [235, 235, 235], lineWidth: 0.15 },
      headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 7.5, cellPadding: 2 },
      bodyStyles: { fontStyle: "bold", fontSize: 11, cellPadding: 4, textColor: CLUB_NAVY },
      margin: { left: 14, right: 14 },
      // Destaca R&W como referência
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          data.cell.styles.textColor = CLUB_RED;
        }
      },
    });
  }

  // Título da secção evolução — deslocado mais acima para não colidir com os títulos internos dos gráficos
  const chartY = (doc.lastAutoTable?.finalY ?? kpiY) + 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CLUB_NAVY);
  doc.text("EVOLUÇÃO", 14, chartY - 6);
  doc.setDrawColor(...CLUB_NAVY);
  doc.line(14, chartY - 4.5, 30, chartY - 4.5);
  const halfW = (pageW - 28 - 6) / 2;
  const chartH = 36;
  const pesoPoints = [
    ...(evals.map((e) => ({ v: e.peso_kg, d: new Date(e.date).toLocaleDateString("pt-PT") })).filter((p) => p.v != null)),
    ...(weighins || []).map((w) => ({ v: w.peso_kg, d: new Date(w.date).toLocaleDateString("pt-PT") })).filter((p) => p.v != null),
  ].sort((a, b) => a.d.localeCompare(b.d));
  const bfPoints = evals.map((e) => ({ v: e.metrics?.rw, d: new Date(e.date).toLocaleDateString("pt-PT") })).filter((p) => p.v != null);
  drawLineChart(doc, "Peso (kg)", pesoPoints, 14, chartY, halfW, chartH, " kg");
  drawLineChart(doc, "% MG · Reilly & Wallace", bfPoints, 14 + halfW + 6, chartY, halfW, chartH, "%");

  // Objetivo (se definido) — usa Y dinâmico depois dos gráficos + labels (+3 abaixo do gráfico)
  const goalY = chartY + chartH + 14; // chart + labels + respiração
  if (athlete.goal?.bf_target_pct != null && last?.metrics?.rw != null) {
    const targetBf = athlete.goal.bf_target_pct;
    const currentBf = last.metrics.rw;
    const currentWeight = last.peso_kg;
    const targetWeight = +(currentWeight * (100 - currentBf) / (100 - targetBf)).toFixed(1);
    const delta = +(currentWeight - targetWeight).toFixed(1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CLUB_NAVY);
    doc.text("OBJETIVO", 14, goalY - 3);
    doc.setDrawColor(...CLUB_NAVY);
    doc.line(14, goalY - 1.5, 28, goalY - 1.5);
    autoTable(doc, {
      startY: goalY,
      theme: "plain",
      head: [["% MG atual", "% MG alvo", "Peso atual", "Peso alvo", "Dif. peso"]],
      body: [[
        `${currentBf}%`,
        `${targetBf}%`,
        `${currentWeight} kg`,
        `${targetWeight} kg`,
        `${Math.abs(delta)} kg ${delta > 0.1 ? "a perder" : delta < -0.1 ? "a ganhar" : "no alvo"}`,
      ]],
      styles: { halign: "center", fontSize: 8, cellPadding: 3, lineColor: [235, 235, 235], lineWidth: 0.15 },
      headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 7.5, cellPadding: 2 },
      bodyStyles: { fontStyle: "bold", fontSize: 11, cellPadding: 4, textColor: CLUB_NAVY },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          data.cell.styles.textColor = CLUB_RED;
        }
      },
    });
  }

  // Nova página: histórico completo
  doc.addPage();
  drawHeader(doc, `Histórico · ${athlete.nome}`, logo);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CLUB_NAVY);
  doc.text("REGISTO DE AVALIAÇÕES", 14, 46);
  doc.setDrawColor(...CLUB_NAVY);
  doc.line(14, 47.5, 65, 47.5);
  const histHead = [["Data", "Peso (kg)", "% MG (R&W)", "% MG (JP7)", "MG kg", "MM kg", "MM/MG", "IMC", "Soma 8 (mm)"]];
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
    startY: 50,
    head: histHead,
    body: histBody,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 3, halign: "center", lineColor: [235, 235, 235], lineWidth: 0.15 },
    headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 7.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: { 0: { fontStyle: "bold", halign: "left", textColor: CLUB_NAVY } },
    margin: { left: 14, right: 14 },
  });

  // Delta primeira vs última (se houver ≥ 2 avaliações)
  if (first && last && first !== last) {
    const y = (doc.lastAutoTable?.finalY ?? 60) + 12;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CLUB_NAVY);
    doc.text("PROGRESSO GLOBAL", 14, y - 3);
    doc.setDrawColor(...CLUB_NAVY);
    doc.line(14, y - 1.5, 42, y - 1.5);
    const deltaPeso = last.peso_kg - first.peso_kg;
    const deltaBf = (last.metrics?.rw ?? 0) - (first.metrics?.rw ?? 0);
    const deltaImc = (last.metrics?.imc ?? 0) - (first.metrics?.imc ?? 0);
    autoTable(doc, {
      startY: y,
      theme: "plain",
      head: [["Da 1.ª avaliação", "Até à última", "Dif. Peso", "Dif. % MG", "Dif. IMC"]],
      body: [[
        new Date(first.date).toLocaleDateString("pt-PT"),
        new Date(last.date).toLocaleDateString("pt-PT"),
        `${deltaPeso > 0 ? "+" : ""}${deltaPeso.toFixed(1)} kg`,
        `${deltaBf > 0 ? "+" : ""}${deltaBf.toFixed(1)}%`,
        `${deltaImc > 0 ? "+" : ""}${deltaImc.toFixed(1)}`,
      ]],
      styles: { halign: "center", fontSize: 8, cellPadding: 3, lineColor: [235, 235, 235], lineWidth: 0.15 },
      headStyles: { fillColor: CLUB_NAVY, textColor: 255, fontSize: 7.5, cellPadding: 2 },
      bodyStyles: { fontStyle: "bold", fontSize: 11, cellPadding: 4, textColor: CLUB_NAVY },
      margin: { left: 14, right: 14 },
    });
  }

  // Auditoria: registado por / atualizado por
  if (last?.created_by_name || last?.created_at) {
    const y = (doc.lastAutoTable?.finalY ?? 100) + 8;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(140);
    const parts = [];
    if (last.created_by_name) parts.push(`Última avaliação registada por ${last.created_by_name}`);
    if (last.created_at) parts.push(`em ${new Date(last.created_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}`);
    doc.text(parts.join(" "), 14, y);
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
      // Escolhe, para cada tipo, a foto ligada à última avaliação; se não houver, cai para a mais recente sem evaluation_id.
      const pickPhoto = (kind) => {
        const cands = (list || []).filter((p) => p.kind === kind && (p.evaluation_id === last.id || p.evaluation_id == null));
        cands.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        return cands[0] || null;
      };
      const evPhotos = ["frontal", "perfil", "costas"].map(pickPhoto);
      if (evPhotos.some(Boolean)) {
        // Página em LANDSCAPE para dar espaço às 3 fotos lado a lado
        doc.addPage("a4", "landscape");
        drawHeader(doc, `Fotografias · Última avaliação`, logo);
        const lPageW = doc.internal.pageSize.getWidth();  // 297mm em landscape
        const lPageH = doc.internal.pageSize.getHeight(); // 210mm em landscape

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...CLUB_NAVY);
        doc.text("REGISTO FOTOGRÁFICO", 14, 46);
        doc.setDrawColor(...CLUB_NAVY);
        doc.line(14, 47.5, 60, 47.5);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text(`Data: ${new Date(last.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}`, 14, 52);

        const marginX = 12;
        const gap = 8;
        const boxW = (lPageW - marginX * 2 - gap * 2) / 3;
        // Altura disponível: entre y=58 e footer (bottom - 15) → 210 - 58 - 20 = 132mm
        const availH = lPageH - 58 - 22;
        // Aspect natural de fotos corporais: 3:4 → h = w * 1.33. Se a caixa for maior, respeitamos o menor.
        const boxH = Math.min(availH, boxW * 1.33);
        const y = 60;
        const labels = { frontal: "Frente", perfil: "Perfil", costas: "Costas" };
        const order = ["frontal", "perfil", "costas"];
        for (let i = 0; i < order.length; i++) {
          const p = evPhotos[i];
          const x = marginX + (boxW + gap) * i;
          doc.setFillColor(245, 246, 249);
          doc.setDrawColor(...CLUB_NAVY);
          doc.setLineWidth(0.4);
          doc.rect(x, y, boxW, boxH, "FD");
          if (p) {
            const data = await fetchPhotoAsDataUrl(p.id);
            if (data) {
              try {
                const size = await getImageSize(data);
                const fit = fitContain(size.w, size.h, x + 1, y + 1, boxW - 2, boxH - 2);
                doc.addImage(data, "JPEG", fit.x, fit.y, fit.w, fit.h);
              } catch { /* ignore */ }
            }
          } else {
            doc.setTextColor(160);
            doc.setFontSize(11);
            doc.setFont("helvetica", "italic");
            doc.text("Sem foto", x + boxW / 2, y + boxH / 2, { align: "center" });
          }
          // Legenda por baixo
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...CLUB_NAVY);
          doc.text(labels[order[i]], x + boxW / 2, y + boxH + 8, { align: "center" });
        }
      }
    }
  } catch { /* ignore */ }

  drawFooter(doc);
  const safe = (athlete.nome || "atleta").replace(/[^\w-]+/g, "_");
  const filename = `trofense_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (saveFile) {
    doc.save(filename);
    return { doc, filename };
  }
  return { doc, filename };
}

/** Gera o PDF individual do atleta e devolve-o como base64 (para envio por email). */
export async function exportAthletePdfAsBase64(athlete, evals, weighins) {
  const { doc, filename } = await exportAthletePdf(athlete, evals, weighins, false);
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1];
  return { base64, filename };
}

// Re-export computeGoalStatus for convenience if needed by callers
export { computeGoalStatus };
