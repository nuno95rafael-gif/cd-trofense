import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GoalStatusPill } from "@/components/GoalStatusPill";
import { computeGoalStatus, STATUS_STYLES } from "@/lib/goalStatus";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { toast } from "sonner";

export function GoalsPanel({ athlete, evaluations, onSaved, isEditor }) {
  const goal = athlete.goal;
  const [target, setTarget] = useState(goal?.bf_target_pct ?? "");
  const [saving, setSaving] = useState(false);

  const last = evaluations[evaluations.length - 1];
  const currentBf = last?.metrics?.rw;
  const currentWeight = last?.peso_kg;

  const info = computeGoalStatus({ currentWeight, currentBf, goal });
  const targetWeight = info.targetWeight;
  const style = STATUS_STYLES[info.status] || STATUS_STYLES.sem_dados;

  const progress = (() => {
    if (!goal || currentBf == null) return 0;
    const start = evaluations[0]?.metrics?.rw ?? currentBf;
    if (start <= goal.bf_target_pct) return 100;
    const p = ((start - currentBf) / (start - goal.bf_target_pct)) * 100;
    return Math.max(0, Math.min(100, p));
  })();

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/athletes/${athlete.id}/goal`, { bf_target_pct: Number(target) });
      toast.success("Objetivo guardado");
      onSaved();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-xl font-bold">Objetivo de % Massa Gorda</h3>
          <GoalStatusPill status={info.status} label={info.label} testid="goal-status-pill" />
        </div>
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="text-xs">% MG alvo</Label>
            <Input type="number" step="0.1" data-testid="goal-target" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!isEditor} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Atual</div>
            <div className="num text-3xl font-bold">{currentBf ?? "—"}%</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Peso atual</div>
            <div className="num text-3xl font-bold">{currentWeight ?? "—"} kg</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Peso alvo</div>
            <div className="num text-3xl font-bold text-primary">{targetWeight ?? "—"} kg</div>
          </div>
        </div>
        {info.delta != null && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Diferença:</span>
            <span className={`num font-semibold inline-flex items-center gap-1 ${info.direction === "perder" ? "text-red-500" : info.direction === "ganhar" ? "text-blue-500" : "text-emerald-500"}`}>
              {info.direction === "perder" ? <ArrowDown className="w-3.5 h-3.5" /> : info.direction === "ganhar" ? <ArrowUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {info.absDelta} kg {info.direction === "perder" ? "a perder" : info.direction === "ganhar" ? "a ganhar" : "no alvo"}
            </span>
          </div>
        )}
        {isEditor && (
          <Button className="mt-4" onClick={save} disabled={saving || !target} data-testid="save-goal-btn">
            {saving ? "A guardar..." : "Guardar objetivo"}
          </Button>
        )}
      </Card>

      {goal && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Progresso · % MG</div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                Da 1.ª avaliação até à mais recente
              </div>
            </div>
            <div className="num font-semibold">{evaluations.length < 2 ? "N/A" : `${progress.toFixed(0)}%`}</div>
          </div>
          {evaluations.length < 2 ? (
            <div className="text-xs text-muted-foreground bg-secondary/40 border border-dashed rounded-md p-3">
              O progresso mede a redução de % MG entre a primeira e a última avaliação em relação à % MG alvo.
              Este atleta só tem <b>1 avaliação registada</b> — regista uma nova avaliação para começar a acompanhar a evolução.
            </div>
          ) : (
            <Progress value={progress} className="h-3" />
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Objetivo definido em {new Date(goal.updated_at).toLocaleDateString("pt-PT")}
          </p>
        </Card>
      )}
    </div>
  );
}
