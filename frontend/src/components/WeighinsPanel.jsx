import { useMemo, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export function WeighinsPanel({ athleteId, weighins, onChange, isEditor }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [peso, setPeso] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const chartData = useMemo(() => {
    const arr = weighins.map((w) => ({ date: w.date, peso: w.peso_kg }));
    // 7-day moving average
    const withMa = arr.map((_, i) => {
      const slice = arr.slice(Math.max(0, i - 6), i + 1);
      const ma = slice.reduce((s, x) => s + x.peso, 0) / slice.length;
      return { ...arr[i], ma: +ma.toFixed(2), label: new Date(arr[i].date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) };
    });
    return withMa;
  }, [weighins]);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/athletes/${athleteId}/weighins`, { date, peso_kg: Number(peso) });
      setPeso("");
      onChange();
      toast.success("Pesagem registada");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    await api.delete(`/weighins/${id}`);
    onChange();
  };

  const importXlsx = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/weighins/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Importadas ${data.created} pesagens${data.skipped?.length ? ` · ${data.skipped.length} ignoradas` : ""}`);
      if (data.skipped?.length) console.warn("Pesagens ignoradas:", data.skipped);
      onChange();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {isEditor && (
        <Card className="p-6">
          <h3 className="font-display text-xl font-bold mb-4">Nova pesagem</h3>
          <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" data-testid="weighin-date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs">Peso (kg)</Label>
              <Input type="number" step="0.1" data-testid="weighin-weight" value={peso} onChange={(e) => setPeso(e.target.value)} required className="w-40" />
            </div>
            <Button type="submit" data-testid="save-weighin-btn" disabled={saving}>Registar</Button>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Evolução de peso · com média móvel 7 dias</h3>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem pesagens registadas.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" name="Peso" dataKey="peso" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" name="Média 7d" dataKey="ma" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Histórico ({weighins.length})</h3>
        {weighins.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem registos.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...weighins].reverse().map((w) => (
              <div key={w.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="text-sm">{new Date(w.date).toLocaleDateString("pt-PT")}</div>
                <div className="flex items-center gap-3">
                  <span className="num font-semibold">{w.peso_kg} kg</span>
                  {isEditor && (
                    <Button size="icon" variant="ghost" onClick={() => del(w.id)} data-testid={`del-weighin-${w.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
