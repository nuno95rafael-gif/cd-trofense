import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const thisMonth = () => new Date().toISOString().slice(0, 7);
const prevMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

export default function MonthlyReport() {
  const [a, setA] = useState(prevMonth());
  const [b, setB] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/monthly", { params: { month_a: a, month_b: b } });
      setData(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Análise</div>
        <h1 className="font-display text-4xl font-bold tracking-tighter mt-1">Relatório mensal comparativo</h1>
      </div>

      <Card className="p-6 mb-6">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div><Label className="text-xs">Mês A</Label><Input type="month" data-testid="report-month-a" value={a} onChange={(e) => setA(e.target.value)} /></div>
          <div><Label className="text-xs">Mês B</Label><Input type="month" data-testid="report-month-b" value={b} onChange={(e) => setB(e.target.value)} /></div>
          <Button onClick={run} data-testid="run-report-btn" disabled={loading}>{loading ? "A gerar..." : "Gerar relatório"}</Button>
        </div>
      </Card>

      {data && (
        <Card className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atleta</TableHead>
                <TableHead>Peso {data.month_a}</TableHead>
                <TableHead>Peso {data.month_b}</TableHead>
                <TableHead>Δ Peso</TableHead>
                <TableHead>MG {data.month_a}</TableHead>
                <TableHead>MG {data.month_b}</TableHead>
                <TableHead>Δ MG</TableHead>
                <TableHead>Δ IMC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((r) => (
                <TableRow key={r.athlete_id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="num">{r.month_a.peso ?? "—"}</TableCell>
                  <TableCell className="num">{r.month_b.peso ?? "—"}</TableCell>
                  <TableCell className={`num font-semibold ${(r.delta.peso ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {r.delta.peso ?? "—"}
                  </TableCell>
                  <TableCell className="num">{r.month_a.bf ?? "—"}</TableCell>
                  <TableCell className="num">{r.month_b.bf ?? "—"}</TableCell>
                  <TableCell className={`num font-semibold ${(r.delta.bf ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {r.delta.bf ?? "—"}
                  </TableCell>
                  <TableCell className="num">{r.delta.imc ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
