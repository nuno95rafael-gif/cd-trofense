import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GoalStatusPill } from "@/components/GoalStatusPill";
import { computeGoalStatus } from "@/lib/goalStatus";
import { ArrowDown, ArrowUp, Minus, Percent, Scale } from "lucide-react";
import { toast } from "sonner";

export function GoalsPanel({ athlete, evaluations, onSaved, isEditor }) {
  const goal = athlete.goal;
  const [targetBf, setTargetBf] = useState(goal?.bf_target_pct ?? "");
  const [targetImc, setTargetImc] = useState(goal?.imc_target ?? "");
  const [primary, setPrimary] = useState(goal?.primary_metric === "imc" ? "imc" : "bf");
  const [saving, setSaving] = useState(false);

  const last = evaluations[evaluations.length - 1];
  const currentBf = last?.metrics?.rw;
  const currentImc = last?.metrics?.imc;
  const currentWeight = last?.peso_kg;

  const info = computeGoalStatus({ currentWeight, currentBf, currentImc, goal, athlete });
  const targetWeight = info.targetWeight;

  // Barra de progresso: usa a métrica primária efetiva
  const progress = (() => {
    if (!goal || evaluations.length < 2) return null;
    const first = evaluations[0]?.metrics;
    if (info.primary === "imc") {
      const startImc = first?.imc;
      if (startImc == null || currentImc == null || goal.imc_target == null) return null;
      if (Math.abs(startImc - goal.imc_target) < 0.01) return 100;
      const p = ((startImc - currentImc) / (startImc - goal.imc_target)) * 100;
      return Math.max(0, Math.min(100, p));
    }
    const startBf = first?.rw;
    if (startBf == null || currentBf == null || goal.bf_target_pct == null) return null;
    if (startBf <= goal.bf_target_pct) return 100;
    const p = ((startBf - currentBf) / (startBf - goal.bf_target_pct)) * 100;
    return Math.max(0, Math.min(100, p));
  })();

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        bf_target_pct: targetBf !== "" ? Number(targetBf) : null,
        imc_target: targetImc !== "" ? Number(targetImc) : null,
        primary_metric: primary,
      };
      if (payload.bf_target_pct == null && payload.imc_target == null) {
        toast.error("Define pelo menos um objetivo (% MG ou IMC).");
        setSaving(false);
        return;
      }
      await api.put(`/athletes/${athlete.id}/goal`, payload);
      toast.success("Objetivo guardado");
      onSaved();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const secondaryTargetWeight =
    info.primary === "imc" ? info.targetWeightBf : info.targetWeightImc;
  const secondaryLabel = info.primary === "imc" ? "Pelo % MG" : "Pelo IMC";

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-xl font-bold">Objetivos do atleta</h3>
          <GoalStatusPill status={info.status} label={info.label} testid="goal-status-pill" />
        </div>

        {/* Seletor de métrica primária */}
        <div className="mb-5">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
            Métrica de referência
          </Label>
          <div className="inline-flex rounded-md border bg-secondary/40 p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={primary === "bf"}
              disabled={!isEditor}
              onClick={() => setPrimary("bf")}
              data-testid="primary-metric-bf"
              className={`px-4 py-2 rounded gap-2 inline-flex items-center text-sm font-semibold transition ${
                primary === "bf"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Percent className="w-4 h-4" /> % Massa Gorda
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={primary === "imc"}
              disabled={!isEditor}
              onClick={() => setPrimary("imc")}
              data-testid="primary-metric-imc"
              className={`px-4 py-2 rounded gap-2 inline-flex items-center text-sm font-semibold transition ${
                primary === "imc"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scale className="w-4 h-4" /> IMC
            </button>
          </div>
        </div>

        {/* Inputs dos dois objetivos */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-md border ${primary === "bf" ? "border-primary/60 bg-primary/5" : "border-border bg-secondary/30"}`}>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-widest font-semibold">Objetivo · % MG</Label>
              {primary === "bf" && (
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Ref.</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <Input
                type="number"
                step="0.1"
                data-testid="goal-target-bf"
                value={targetBf}
                onChange={(e) => setTargetBf(e.target.value)}
                disabled={!isEditor}
                placeholder="—"
                className="max-w-[120px]"
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Atual: <span className="num font-semibold">{currentBf != null ? `${currentBf}%` : "—"}</span>
              {info.targetWeightBf != null && (
                <> · Peso alvo: <span className="num font-semibold">{info.targetWeightBf} kg</span></>
              )}
            </div>
          </div>

          <div className={`p-4 rounded-md border ${primary === "imc" ? "border-primary/60 bg-primary/5" : "border-border bg-secondary/30"}`}>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-widest font-semibold">Objetivo · IMC</Label>
              {primary === "imc" && (
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Ref.</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <Input
                type="number"
                step="0.1"
                data-testid="goal-target-imc"
                value={targetImc}
                onChange={(e) => setTargetImc(e.target.value)}
                disabled={!isEditor}
                placeholder="—"
                className="max-w-[120px]"
              />
              <span className="text-muted-foreground text-sm">kg/m²</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Atual: <span className="num font-semibold">{currentImc != null ? currentImc : "—"}</span>
              {info.targetWeightImc != null && (
                <> · Peso alvo: <span className="num font-semibold">{info.targetWeightImc} kg</span></>
              )}
            </div>
          </div>
        </div>

        {/* Peso alvo em destaque + Δ */}
        <div className="grid md:grid-cols-3 gap-4 items-end pt-4 border-t">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Peso atual</div>
            <div className="num text-3xl font-bold">{currentWeight != null ? `${currentWeight} kg` : "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Peso alvo <span className="normal-case text-[10px] font-normal">({info.primary === "imc" ? "por IMC" : "por % MG"})</span>
            </div>
            <div className="num text-3xl font-bold text-primary">{targetWeight != null ? `${targetWeight} kg` : "—"}</div>
            {secondaryTargetWeight != null && (
              <div className="text-[11px] text-muted-foreground mt-1">
                {secondaryLabel}: <span className="num font-semibold">{secondaryTargetWeight} kg</span>
              </div>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Diferença</div>
            {info.delta != null ? (
              <div className={`inline-flex items-center gap-1 num text-3xl font-bold ${info.direction === "perder" ? "text-red-500" : info.direction === "ganhar" ? "text-blue-500" : "text-emerald-500"}`}>
                {info.direction === "perder" ? <ArrowDown className="w-6 h-6" /> : info.direction === "ganhar" ? <ArrowUp className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                {info.absDelta} kg
              </div>
            ) : (
              <div className="num text-3xl font-bold text-muted-foreground">—</div>
            )}
            {info.delta != null && (
              <div className="text-[11px] text-muted-foreground mt-1">
                {info.direction === "perder" ? "a perder" : info.direction === "ganhar" ? "a ganhar" : "no alvo"}
              </div>
            )}
          </div>
        </div>

        {isEditor && (
          <Button className="mt-6" onClick={save} disabled={saving} data-testid="save-goal-btn">
            {saving ? "A guardar..." : "Guardar objetivo"}
          </Button>
        )}
      </Card>

      {goal && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Progresso · {info.primary === "imc" ? "IMC" : "% MG"}
              </div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                Da 1.ª avaliação até à mais recente
              </div>
            </div>
            <div className="num font-semibold">
              {progress == null ? "N/A" : `${progress.toFixed(0)}%`}
            </div>
          </div>
          {progress == null ? (
            <div className="text-xs text-muted-foreground bg-secondary/40 border border-dashed rounded-md p-3">
              O progresso mede a redução da métrica escolhida entre a primeira e a última avaliação.
              Este atleta só tem <b>{evaluations.length} avaliação{evaluations.length === 1 ? "" : "s"} registada{evaluations.length === 1 ? "" : "s"}</b> — regista uma nova avaliação para começar a acompanhar a evolução.
            </div>
          ) : (
            <Progress value={progress} className="h-3" />
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Objetivo definido em {goal.updated_at ? new Date(goal.updated_at).toLocaleDateString("pt-PT") : "—"}
          </p>
        </Card>
      )}
    </div>
  );
}
