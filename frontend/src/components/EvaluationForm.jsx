import { useMemo, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { computeAll } from "@/lib/formulas";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/StatusPill";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { Upload, X, Crop } from "lucide-react";
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
  const [photoBlobs, setPhotoBlobs] = useState({ frontal: null, perfil: null, costas: null });
  const [photoPreviews, setPhotoPreviews] = useState({ frontal: null, perfil: null, costas: null });
  const [cropState, setCropState] = useState(null); // { src, kind }
  const fileRefs = useRef({});

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
      const { data: newEval } = await api.post(`/athletes/${athlete.id}/evaluations`, {
        date,
        peso_kg: peso ? Number(peso) : null,
        age_at_eval: age ? Number(age) : null,
        pregas: p,
        perimetros: per,
      });
      // Upload optional photos linked to this evaluation
      for (const kind of ["frontal", "perfil", "costas"]) {
        const blob = photoBlobs[kind];
        if (!blob) continue;
        const fd = new FormData();
        fd.append("file", new File([blob], `${kind}.jpg`, { type: "image/jpeg" }));
        fd.append("date", date);
        fd.append("kind", kind);
        fd.append("evaluation_id", newEval.id);
        try {
          await api.post(`/athletes/${athlete.id}/photos`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (err) {
          toast.error(`Foto ${kind}: ${formatApiError(err.response?.data?.detail)}`);
        }
      }
      toast.success("Avaliação guardada");
      setP({}); setPer({}); setPeso("");
      Object.values(photoPreviews).forEach((u) => u && URL.revokeObjectURL(u));
      setPhotoBlobs({ frontal: null, perfil: null, costas: null });
      setPhotoPreviews({ frontal: null, perfil: null, costas: null });
      onSaved && onSaved();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const pickFile = (kind) => fileRefs.current[kind]?.click();
  const onFileSelected = (kind) => (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setCropState({ src: URL.createObjectURL(file), kind });
    ev.target.value = "";
  };
  const onCropped = (blob) => {
    if (!cropState) return;
    URL.revokeObjectURL(cropState.src);
    setPhotoBlobs((prev) => ({ ...prev, [cropState.kind]: blob }));
    setPhotoPreviews((prev) => {
      if (prev[cropState.kind]) URL.revokeObjectURL(prev[cropState.kind]);
      return { ...prev, [cropState.kind]: URL.createObjectURL(blob) };
    });
    setCropState(null);
  };

  const removePhoto = (kind) => {
    setPhotoPreviews((prev) => {
      if (prev[kind]) URL.revokeObjectURL(prev[kind]);
      return { ...prev, [kind]: null };
    });
    setPhotoBlobs((prev) => ({ ...prev, [kind]: null }));
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

      <div>
        <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3">Fotos (opcional · ficam associadas a esta avaliação)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { k: "frontal", l: "Frente" },
            { k: "perfil", l: "Perfil" },
            { k: "costas", l: "Costas" },
          ].map(({ k, l }) => (
            <div key={k} className="space-y-2">
              <div className="text-sm font-semibold">{l}</div>
              <div
                className="relative bg-secondary rounded-md overflow-hidden border cursor-pointer hover:border-primary/60 transition"
                style={{ aspectRatio: "3 / 4" }}
                onClick={() => !photoPreviews[k] && pickFile(k)}
                data-testid={`eval-photo-slot-${k}`}
              >
                {photoPreviews[k] ? (
                  <>
                    <img src={photoPreviews[k]} alt={l} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button type="button" size="icon" variant="secondary" onClick={(e) => { e.stopPropagation(); pickFile(k); }} title="Substituir" data-testid={`eval-photo-replace-${k}`}>
                        <Crop className="w-4 h-4" />
                      </Button>
                      <Button type="button" size="icon" variant="destructive" onClick={(e) => { e.stopPropagation(); removePhoto(k); }} title="Remover" data-testid={`eval-photo-remove-${k}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                    <Upload className="w-8 h-8 opacity-50" />
                    <span>Carregar foto</span>
                  </div>
                )}
              </div>
              <input
                ref={(el) => (fileRefs.current[k] = el)}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileSelected(k)}
                data-testid={`eval-photo-input-${k}`}
              />
            </div>
          ))}
        </div>
      </div>

      <Card className="p-5 bg-secondary/40">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Resultados (em tempo real)</div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-4">
              <Metric label="R & W" value={metrics.rw} unit="%" strong />
              <Metric label="Jackson-Pollock 7" value={metrics.jp7} unit="%" />
              <Metric label="Evans 7" value={metrics.evans7} unit="%" />
              <Metric label="Evans 3" value={metrics.evans3} unit="%" />
              <Metric label="Withers" value={metrics.withers} unit="%" />
              <Metric label="Massa Muscular (Lee)" value={metrics.muscle_mass_kg} unit="kg" strong />
              <Metric label="Massa Gorda" value={metrics.fat_mass_kg} unit="kg" />
              <Metric label="Massa Magra" value={metrics.lean_mass_kg} unit="kg" />
              <Metric label="MM/MG" value={metrics.mm_mg_ratio} strong />
              <Metric label="IMC" value={metrics.imc} strong />
              <Metric label="Σ 8 pregas" value={metrics.soma8 != null ? Math.round(metrics.soma8) : null} />
              <Metric label="% MM" value={metrics.perc_mm} unit="%" />
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

      <PhotoCropDialog
        open={!!cropState}
        src={cropState?.src}
        onCancel={() => {
          if (cropState?.src) URL.revokeObjectURL(cropState.src);
          setCropState(null);
        }}
        onCropped={onCropped}
      />
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
