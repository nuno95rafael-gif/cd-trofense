import { useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { computeAll } from "@/lib/formulas";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/StatusPill";
import { toast } from "sonner";

const PREGAS = [
  { k: "peito", l: "Peito" },
  { k: "tricipital", l: "Tricipital" },
  { k: "bicipital", l: "Bicipital" },
  { k: "axilar", l: "Axilar" },
  { k: "subescapular", l: "Subescapular" },
  { k: "suprailiaca", l: "Suprailíaca" },
  { k: "abdominal", l: "Abdominal" },
  { k: "supraespinhal", l: "Supraespinhal" },
  { k: "coxa", l: "Coxa" },
  { k: "gemeo", l: "Gémeo" },
];
const PERIM = [
  { k: "braco", l: "Braço" },
  { k: "coxaD", l: "Coxa D" },
  { k: "coxaE", l: "Coxa E" },
  { k: "gemeo", l: "Gémeo" },
  { k: "cintura", l: "Cintura" },
  { k: "anca", l: "Anca" },
];

export function EvaluationForm({ athlete, onSaved }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [peso, setPeso] = useState("");
  const [age, setAge] = useState(athlete.idade || "");
  const [p, setP] = useState({});
  const [per, setPer] = useState({});
  const [saving, setSaving] = useState(false);

  const setPregVal = (k) => (e) => setP((s) => ({ ...s, [k]: e.target.value === "" ? "" : Number(e.target.value) }));
  const setPerVal = (k) => (e) => setPer((s) => ({ ...s, [k]: e.target.value === "" ? "" : Number(e.target.value) }));

  const metrics = useMemo(() => {
    return computeAll(
      { pregas: p, perimetros: per, peso_kg: peso ? Number(peso) : null, age_at_eval: age ? Number(age) : null },
      athlete
    );
  }, [p, per, peso, age, athlete]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/athletes/${athlete.id}/evaluations`, {
        date,
        peso_kg: peso ? Number(peso) : null,
        age_at_eval: age ? Number(age) : null,
        pregas: p,
        perimetros: per,
      });
      toast.success("Avaliação guardada");
      setP({}); setPer({}); setPeso("");
      onSaved && onSaved();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Data"><Input type="date" data-testid="eval-date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
        <Field label="Peso (kg)"><Input type="number" step="0.1" data-testid="eval-weight" value={peso} onChange={(e) => setPeso(e.target.value)} /></Field>
        <Field label="Idade à avaliação"><Input type="number" step="0.1" data-testid="eval-age" value={age} onChange={(e) => setAge(e.target.value)} /></Field>
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3">Pregas cutâneas (mm)</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PREGAS.map((f) => (
            <Field key={f.k} label={f.l}>
              <Input type="number" step="0.1" data-testid={`preg-${f.k}`} value={p[f.k] ?? ""} onChange={setPregVal(f.k)} />
            </Field>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3">Perímetros (cm)</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {PERIM.map((f) => (
            <Field key={f.k} label={f.l}>
              <Input type="number" step="0.1" data-testid={`per-${f.k}`} value={per[f.k] ?? ""} onChange={setPerVal(f.k)} />
            </Field>
          ))}
        </div>
      </div>

      <Card className="p-5 bg-secondary/40">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Resultados (em tempo real)</div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric label="Reilly & Wallace" value={metrics.bf_reilly_wallace} unit="%" />
              <Metric label="Evans 2005" value={metrics.bf_evans} unit="%" />
              <Metric label="Jackson-Pollock" value={metrics.bf_jackson_pollock} unit="%" />
              <Metric label="Withers" value={metrics.bf_withers} unit="%" />
              <Metric label="Média % MG" value={metrics.bf_average} unit="%" strong />
              <Metric label="MM (Lee)" value={metrics.muscle_mass_kg} unit="kg" strong />
              <Metric label="IMC" value={metrics.imc} strong />
              <Metric label="Rácio MM/MG" value={metrics.mm_mg_ratio} strong />
            </div>
          </div>
          <StatusPill status={metrics.status} testid="preview-status" />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} data-testid="save-eval-btn" className="min-w-36">
          {saving ? "A guardar..." : "Guardar avaliação"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function Metric({ label, value, unit, strong }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num tracking-tight ${strong ? "text-2xl font-bold" : "text-lg font-semibold"}`}>
        {value ?? "—"}{value != null && unit ? <span className="text-sm text-muted-foreground ml-0.5">{unit}</span> : null}
      </div>
    </div>
  );
}
