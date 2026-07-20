// Helpers para o objetivo de peso (baseado em % MG alvo → peso alvo).
// Um status granular por atleta: Atingido / Quase lá / Em progresso / Prioritário / Sem objetivo.

/**
 * Calcula peso alvo a partir do peso atual, % MG atual e % MG alvo.
 * Fórmula fisiológica: preserva a massa magra, altera apenas a massa gorda.
 *   peso_alvo = peso_atual * (100 - bf_atual) / (100 - bf_alvo)
 * Retorna null se algum input estiver em falta.
 */
export function computeTargetWeight(currentWeight, currentBf, targetBf) {
  if (currentWeight == null || currentBf == null || targetBf == null) return null;
  if (targetBf >= 100 || currentBf >= 100) return null;
  return +(currentWeight * (100 - currentBf) / (100 - targetBf)).toFixed(1);
}

/**
 * Regras de estado granular (aplicadas ao |Δ| entre peso atual e peso alvo):
 *   ≤ 0.5 kg  → Atingido       (verde)
 *   ≤ 2.0 kg  → Quase lá       (verde claro)
 *   ≤ 5.0 kg  → Em progresso   (amarelo)
 *   > 5.0 kg  → Prioritário    (vermelho)
 * Se o atleta ainda não tem objetivo definido → 'sem_objetivo' (cinza).
 * Direção (perder / ganhar) é indicada em separado (delta com sinal).
 */
export function computeGoalStatus({ currentWeight, currentBf, goal }) {
  const targetBf = goal?.bf_target_pct;
  if (targetBf == null) {
    return {
      status: "sem_objetivo",
      label: "Sem objetivo",
      targetWeight: null,
      delta: null,
      absDelta: null,
      direction: null,
      color: "muted",
    };
  }
  const targetWeight = computeTargetWeight(currentWeight, currentBf, targetBf);
  if (targetWeight == null) {
    return {
      status: "sem_dados",
      label: "Sem avaliação recente",
      targetWeight: null,
      delta: null,
      absDelta: null,
      direction: null,
      color: "muted",
    };
  }
  const delta = +(currentWeight - targetWeight).toFixed(1); // positivo = precisa de perder
  const abs = Math.abs(delta);
  const direction = delta > 0.1 ? "perder" : delta < -0.1 ? "ganhar" : "manter";

  let status, label, color;
  if (abs <= 0.5) {
    status = "atingido"; label = "Atingido"; color = "green";
  } else if (abs <= 2) {
    status = "quase_la"; label = "Quase lá"; color = "green-soft";
  } else if (abs <= 5) {
    status = "em_progresso"; label = "Em progresso"; color = "amber";
  } else {
    status = "prioritario"; label = "Prioritário"; color = "red";
  }
  return { status, label, targetWeight, delta, absDelta: abs, direction, color };
}

// Ordem de prioridade para ordenação decrescente (mais urgente primeiro)
export const STATUS_PRIORITY = {
  prioritario: 4,
  em_progresso: 3,
  quase_la: 2,
  atingido: 1,
  sem_dados: 0,
  sem_objetivo: -1,
};

// Classes Tailwind por estado — usadas na pill e nas barras.
export const STATUS_STYLES = {
  atingido: {
    pill: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  quase_la: {
    pill: "bg-lime-500/15 text-lime-500 border border-lime-500/30",
    bar: "bg-lime-500",
    dot: "bg-lime-500",
  },
  em_progresso: {
    pill: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  prioritario: {
    pill: "bg-red-500/15 text-red-500 border border-red-500/30",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  sem_dados: {
    pill: "bg-muted text-muted-foreground border border-border",
    bar: "bg-muted-foreground/30",
    dot: "bg-muted-foreground/50",
  },
  sem_objetivo: {
    pill: "bg-muted text-muted-foreground border border-border",
    bar: "bg-muted-foreground/20",
    dot: "bg-muted-foreground/40",
  },
};
