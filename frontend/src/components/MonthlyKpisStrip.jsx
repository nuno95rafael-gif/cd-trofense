import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, TrendingDown, TrendingUp, Minus, AlertTriangle, ChevronRight } from "lucide-react";

const thisMonth = () => new Date().toISOString().slice(0, 7);
const prevMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};
const monthLabel = (m) => new Date(m + "-01").toLocaleDateString("pt-PT", { month: "long", year: "2-digit" });

export function MonthlyKpisStrip() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const a = prevMonth(), b = thisMonth();
    api.get("/reports/monthly", { params: { month_a: a, month_b: b } })
      .then((r) => setData(r.data))
      .catch(() => setErr(true));
  }, []);

  if (err) return null;
  if (!data) {
    return <Card className="p-5 mb-6"><Skeleton className="h-16 w-full" /></Card>;
  }

  const rowsWithBoth = data.rows.filter((r) => r.month_a.has_eval && r.month_b.has_eval);
  const N = rowsWithBoth.length;

  const nums = (getter) => rowsWithBoth.map(getter).filter((v) => v != null && !isNaN(v));
  const avg = (arr) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null);

  const deltaPesoAvg = avg(nums((r) => r.delta.peso));
  const deltaSoma8Avg = avg(nums((r) => r.delta.soma8));
  const reduzMG = rowsWithBoth.filter((r) => r.delta.bf != null && r.delta.bf < -0.1).length;
  const ganhaMM = rowsWithBoth.filter((r) => r.delta.muscle_mass_kg != null && r.delta.muscle_mass_kg > 0.1).length;
  const alertas = rowsWithBoth.filter(
    (r) => (r.delta.peso != null && r.delta.peso > 1) || (r.delta.bf != null && r.delta.bf > 0.5)
  ).length;

  if (N === 0) {
    return (
      <Card className="p-5 mb-6 border-dashed" data-testid="monthly-strip-empty">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
              {monthLabel(data.month_a)} → {monthLabel(data.month_b)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Sem atletas com avaliações nos dois meses ainda. Regista avaliações em <b className="text-foreground">{monthLabel(data.month_b)}</b> para ver a evolução.
            </div>
          </div>
          <Link to="/relatorio" className="text-sm font-semibold text-primary hover:underline whitespace-nowrap inline-flex items-center gap-1">
            Ver relatório <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 mb-6" data-testid="monthly-strip">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b">
        <div>
          <div className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
            Evolução do plantel
          </div>
          <div className="text-sm font-semibold mt-0.5 capitalize">
            {monthLabel(data.month_a)}
            <ArrowRight className="inline-block w-3.5 h-3.5 mx-2 -mt-0.5 text-muted-foreground" />
            {monthLabel(data.month_b)}
            <span className="text-muted-foreground font-normal ml-2">· {N} atleta{N === 1 ? "" : "s"} com dados nos dois meses</span>
          </div>
        </div>
        <Link
          to="/relatorio"
          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap inline-flex items-center gap-1"
          data-testid="monthly-strip-link"
        >
          Ver relatório completo <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniKpi
          label="Dif. Peso médio"
          value={deltaPesoAvg == null ? "—" : `${deltaPesoAvg > 0 ? "+" : ""}${deltaPesoAvg} kg`}
          tone={deltaPesoAvg == null ? "neutral" : deltaPesoAvg < -0.1 ? "good" : deltaPesoAvg > 0.1 ? "bad" : "neutral"}
        />
        <MiniKpi
          label="Reduziram %MG"
          value={`${reduzMG} / ${N}`}
          tone="good"
        />
        <MiniKpi
          label="Ganharam MM"
          value={`${ganhaMM} / ${N}`}
          tone="good"
        />
        <MiniKpi
          label="Dif. Soma Pregas"
          value={deltaSoma8Avg == null ? "—" : `${deltaSoma8Avg > 0 ? "+" : ""}${deltaSoma8Avg} mm`}
          tone={deltaSoma8Avg == null ? "neutral" : deltaSoma8Avg < 0 ? "good" : "bad"}
        />
        <MiniKpi
          label="Alertas"
          value={alertas}
          tone={alertas > 0 ? "bad" : "good"}
          icon={alertas > 0 ? AlertTriangle : null}
          testid="monthly-alerts-kpi"
        />
      </div>
    </Card>
  );
}

function MiniKpi({ label, value, tone = "neutral", icon: Icon, testid }) {
  const toneCls = tone === "good"
    ? "text-emerald-500"
    : tone === "bad"
    ? "text-red-500"
    : "text-foreground";
  const arrow = tone === "good" ? TrendingDown : tone === "bad" ? TrendingUp : Minus;
  const ArrowIcon = Icon || arrow;
  return (
    <div data-testid={testid}>
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{label}</div>
      <div className={`inline-flex items-center gap-1.5 num text-2xl font-bold mt-1 ${toneCls}`}>
        {ArrowIcon && <ArrowIcon className="w-5 h-5" />}
        {value}
      </div>
    </div>
  );
}
