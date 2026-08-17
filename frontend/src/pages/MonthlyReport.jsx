import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { exportMonthlyReportPdf } from "@/lib/pdf";

const thisMonth = () => new Date().toISOString().slice(0, 7);
const prevMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

// Época desportiva atual (ex.: 26/27) — arranca em julho
function currentSeason() {
  const d = new Date();
  const y = d.getFullYear() % 100;
  const startYear = d.getMonth() >= 6 ? y : y - 1;
  return `${startYear}/${startYear + 1}`;
}

const fmt = (v, suffix = "") => (v == null ? "—" : `${v}${suffix}`);
const fmtDelta = (v, suffix = "", positiveIsGood = false) => {
  if (v == null) return { text: "—", cls: "text-muted-foreground" };
  const sign = v > 0 ? "+" : "";
  let cls = "text-muted-foreground";
  if (Math.abs(v) > 0.05) {
    const good = positiveIsGood ? v > 0 : v < 0;
    cls = good ? "text-emerald-500" : "text-red-500";
  }
  return { text: `${sign}${v}${suffix}`, cls };
};

export default function MonthlyReport() {
  const [a, setA] = useState(prevMonth());
  const [b, setB] = useState(thisMonth());
  const [season, setSeason] = useState(currentSeason());
  const [doctor, setDoctor] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/monthly", { params: { month_a: a, month_b: b } });
      setData(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setLoading(false); }
  };

  const download = async () => {
    if (!data) return;
    setPdfBusy(true);
    try {
      await exportMonthlyReportPdf(data, { season, doctor });
      toast.success("PDF gerado");
    } catch (e) {
      toast.error("Falha a gerar PDF");
    } finally { setPdfBusy(false); }
  };

  const monthLabel = (m) => new Date(m + "-01").toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Análise</div>
          <h1 className="font-display text-4xl font-bold tracking-tighter mt-1">Relatório mensal comparativo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Snapshot da última avaliação de cada mês selecionado.
          </p>
        </div>
        {data && (
          <Button onClick={download} disabled={pdfBusy} data-testid="download-monthly-pdf" className="gap-2">
            <Download className="w-4 h-4" /> {pdfBusy ? "A gerar PDF..." : "Descarregar PDF"}
          </Button>
        )}
      </div>

      <Card className="p-6 mb-6">
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Mês anterior</Label>
            <Input type="month" data-testid="report-month-a" value={a} onChange={(e) => setA(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Mês atual</Label>
            <Input type="month" data-testid="report-month-b" value={b} onChange={(e) => setB(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Época</Label>
            <Input placeholder="ex: 26/27" value={season} onChange={(e) => setSeason(e.target.value)} data-testid="report-season" />
          </div>
          <div>
            <Label className="text-xs">Assinado por</Label>
            <Input placeholder="Nome do médico" value={doctor} onChange={(e) => setDoctor(e.target.value)} data-testid="report-doctor" />
          </div>
          <Button onClick={run} data-testid="run-report-btn" disabled={loading}>
            {loading ? "A gerar..." : "Gerar relatório"}
          </Button>
        </div>
      </Card>

      {data && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b bg-secondary/40 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold capitalize">{monthLabel(data.month_a)}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold capitalize">{monthLabel(data.month_b)}</span>
            <span className="text-muted-foreground ml-auto">{data.rows.length} atletas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                <tr>
                  <th rowSpan={2} className="text-left px-3 py-2 min-w-[160px] align-bottom">Nome</th>
                  <th rowSpan={2} className="text-center px-2 py-2 align-bottom">Alt.</th>
                  <th colSpan={3} className="text-center px-2 py-1 border-l">Peso (kg)</th>
                  <th colSpan={2} className="text-center px-2 py-1 border-l">Σ Pregas (mm)</th>
                  <th colSpan={2} className="text-center px-2 py-1 border-l">% Massa Gorda</th>
                  <th colSpan={2} className="text-center px-2 py-1 border-l">Massa Muscular (kg)</th>
                  <th colSpan={2} className="text-center px-2 py-1 border-l">PMC (cm)</th>
                </tr>
                <tr>
                  <th className="text-center px-2 py-1 border-l">Ant.</th>
                  <th className="text-center px-2 py-1">Atual</th>
                  <th className="text-center px-2 py-1">Δ</th>
                  <th className="text-center px-2 py-1 border-l">Ant.</th>
                  <th className="text-center px-2 py-1">Atual</th>
                  <th className="text-center px-2 py-1 border-l">Ant.</th>
                  <th className="text-center px-2 py-1">Atual</th>
                  <th className="text-center px-2 py-1 border-l">Ant.</th>
                  <th className="text-center px-2 py-1">Atual</th>
                  <th className="text-center px-2 py-1 border-l">Ant.</th>
                  <th className="text-center px-2 py-1">Atual</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.filter((r) => r.month_a.has_eval || r.month_b.has_eval).map((r) => {
                  const dp = fmtDelta(r.delta.peso, "", true);  // peso descer = bom
                  return (
                    <tr key={r.athlete_id} className="border-t hover:bg-secondary/40 num">
                      <td className="px-3 py-2 font-semibold text-foreground/90">{r.nome}</td>
                      <td className="text-center px-2 py-2">{r.altura_cm ? (r.altura_cm / 100).toFixed(2) : "—"}</td>
                      <td className="text-center px-2 py-2 border-l">{fmt(r.month_a.peso)}</td>
                      <td className="text-center px-2 py-2 font-semibold">{fmt(r.month_b.peso)}</td>
                      <td className={`text-center px-2 py-2 font-bold ${r.delta.peso == null ? "text-muted-foreground" : (r.delta.peso > 0.5 ? "text-red-500" : r.delta.peso < -0.5 ? "text-emerald-500" : "text-muted-foreground")}`}>{dp.text}</td>
                      <td className="text-center px-2 py-2 border-l">{fmt(r.month_a.soma8)}</td>
                      <td className="text-center px-2 py-2 font-semibold">{fmt(r.month_b.soma8)}</td>
                      <td className="text-center px-2 py-2 border-l">{fmt(r.month_a.bf, "%")}</td>
                      <td className="text-center px-2 py-2 font-semibold">{fmt(r.month_b.bf, "%")}</td>
                      <td className="text-center px-2 py-2 border-l">{fmt(r.month_a.muscle_mass_kg)}</td>
                      <td className="text-center px-2 py-2 font-semibold">{fmt(r.month_b.muscle_mass_kg)}</td>
                      <td className="text-center px-2 py-2 border-l">{fmt(r.month_a.pmc)}</td>
                      <td className="text-center px-2 py-2 font-semibold">{fmt(r.month_b.pmc)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
