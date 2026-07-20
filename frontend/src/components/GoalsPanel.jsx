import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export function GoalsPanel({ athlete, evaluations, onSaved, isEditor }) {
  const goal = athlete.goal;
  const [target, setTarget] = useState(goal?.bf_target_pct ?? "");
  const [saving, setSaving] = useState(false);

  const last = evaluations[evaluations.length - 1];
  const currentBf = last?.metrics?.bf_average;
  const currentWeight = last?.peso_kg;

  // peso alvo = peso * (100 - bf) / (100 - bf_target)
  let targetWeight = null;
  if (currentWeight && currentBf != null && goal?.bf_target_pct != null) {
    targetWeight = +(currentWeight * (100 - currentBf) / (100 - goal.bf_target_pct)).toFixed(1);
  }

  const progress = (() => {
    if (!goal || currentBf == null) return 0;
    // 0% = starting BF, 100% = target BF (menor)
    const start = evaluations[0]?.metrics?.bf_average ?? currentBf;
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
        <h3 className="font-display text-xl font-bold mb-4">Objetivo de % Massa Gorda</h3>
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
        {isEditor && (
          <Button className="mt-4" onClick={save} disabled={saving || !target} data-testid="save-goal-btn">
            {saving ? "A guardar..." : "Guardar objetivo"}
          </Button>
        )}
      </Card>

      {goal && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Progresso</div>
            <div className="num font-semibold">{progress.toFixed(0)}%</div>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            Objetivo definido em {new Date(goal.updated_at).toLocaleDateString("pt-PT")}
          </p>
        </Card>
      )}
    </div>
  );
}
