import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const PREGAS = [
  ["peito", "Peito"],
  ["tricipital", "Tricipital"],
  ["bicipital", "Bicipital"],
  ["axilar", "Axilar"],
  ["subescapular", "Subescapular"],
  ["suprailiaca", "Suprailíaca"],
  ["abdominal", "Abdominal"],
  ["supraespinhal", "Supraespinhal"],
  ["coxa", "Coxa"],
  ["gemeo", "Gémeo"],
];
const PER = [
  ["braco", "Braço"],
  ["coxaD", "Coxa D"],
  ["coxaE", "Coxa E"],
  ["gemeo", "Gémeo"],
  ["cintura", "Cintura"],
  ["anca", "Anca"],
];

export function EvaluationHistoryRow({ evaluation, isEditor, onDelete }) {
  const [open, setOpen] = useState(false);
  const e = evaluation;
  const m = e.metrics || {};

  return (
    <div className="border rounded-md" data-testid={`eval-row-${e.id}`}>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium hover:text-primary flex-1 min-w-[180px] text-left"
          onClick={() => setOpen((o) => !o)}
          data-testid={`toggle-eval-${e.id}`}
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>{new Date(e.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}</span>
          <span className="text-muted-foreground text-xs">{e.peso_kg ? `· ${e.peso_kg} kg` : ""}</span>
        </button>
        <div className="flex items-center gap-4 num text-sm">
          <span>MG(R&W) <b>{m.rw ?? "—"}%</b></span>
          <span>MM <b>{m.muscle_mass_kg ?? "—"} kg</b></span>
          <span>IMC <b>{m.imc ?? "—"}</b></span>
          <span>Σ8 <b>{m.soma8 != null ? Math.round(m.soma8) : "—"}</b></span>
          <StatusPill status={m.status_rw ?? m.status} />
          {isEditor && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(e.id)} data-testid={`delete-eval-${e.id}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t px-4 py-4 bg-secondary/30 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">% MG por método</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-md overflow-hidden">
                <thead className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  <tr>
                    <th className="text-left px-3 py-2">Método</th>
                    <th className="text-right px-3 py-2">% MG</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { l: "Reilly & Wallace", v: m.rw, hi: true },
                    { l: "Jackson-Pollock 7", v: m.jp7 },
                    { l: "Evans 7", v: m.evans7 },
                    { l: "Evans 3", v: m.evans3 },
                    { l: "Withers", v: m.withers },
                  ].map((r) => (
                    <tr key={r.l} className={`border-t ${r.hi ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-1.5">
                        <span className={`${r.hi ? "text-primary font-semibold" : ""}`}>{r.l}</span>
                        {r.hi && <span className="ml-2 text-[9px] uppercase tracking-wider text-primary font-bold">Ref.</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right num font-semibold">{r.v ?? "—"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Pregas cutâneas (mm)</div>
              <div className="grid grid-cols-1 gap-y-1 text-sm max-w-md">
                {PREGAS.map(([k, l]) => (
                  <div key={k} className="flex justify-between border-b border-dashed border-border/50 py-1">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="num font-medium">{e.pregas?.[k] ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Perímetros (cm)</div>
              <div className="grid grid-cols-1 gap-y-1 text-sm max-w-md">
                {PER.map(([k, l]) => (
                  <div key={k} className="flex justify-between border-b border-dashed border-border/50 py-1">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="num font-medium">{e.perimetros?.[k] ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Indicadores</div>
              <div className="grid grid-cols-1 gap-y-1 text-sm max-w-md">
                <Row label="Massa Gorda (kg)" v={m.fat_mass_kg} />
                <Row label="Massa Magra (kg)" v={m.lean_mass_kg} />
                <Row label="Massa Muscular (Lee)" v={m.muscle_mass_kg} unit="kg" />
                <Row label="% Massa Muscular" v={m.perc_mm} unit="%" />
                <Row label="MM / MG" v={m.mm_mg_ratio} />
                <Row label="IMC" v={m.imc} />
                <Row label="Σ 8 pregas" v={m.soma8 != null ? Math.round(m.soma8) : null} />
                {m.ratio_ca != null && <Row label="Rácio cintura/anca" v={m.ratio_ca} />}
              </div>
            </div>
          </div>

          {e.notas && (
            <div className="text-sm">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Notas</div>
              <div className="text-muted-foreground">{e.notas}</div>
            </div>
          )}

          {(e.created_by_name || e.created_at) && (
            <div className="text-xs text-muted-foreground pt-3 mt-2 border-t border-dashed flex flex-wrap gap-x-4 gap-y-1" data-testid={`eval-audit-${e.id}`}>
              {e.created_by_name && <span>Registado por <b className="text-foreground/80">{e.created_by_name}</b></span>}
              {e.created_at && (
                <span>
                  em <b className="text-foreground/80">{new Date(e.created_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</b>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MethodCard({ label, v, highlight }) {
  return (
    <div className={`p-3 rounded-md border bg-card ${highlight ? "border-primary/40" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="num font-display text-2xl font-bold">
        {v ?? "—"}
        <span className="text-sm text-muted-foreground ml-0.5">%</span>
      </div>
    </div>
  );
}

function Row({ label, v, unit }) {
  return (
    <div className="flex justify-between border-b border-dashed border-border/50 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="num font-medium">{v ?? "—"}{v != null && unit ? ` ${unit}` : ""}</span>
    </div>
  );
}
