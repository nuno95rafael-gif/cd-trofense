// Helpers para o objetivo de peso.
// Cada atleta pode ter dois alvos independentes:
//   • bf_target_pct — objetivo de % Massa Gorda
//   • imc_target   — objetivo de IMC
// E escolhe qual dos dois é a "métrica primária" (`primary_metric`: 'bf' | 'imc'),
// que determina qual peso alvo é usado para status/Δ/progresso e mostrado em destaque.

/**
 * Peso alvo pelo % MG — preserva massa magra, altera só massa gorda.
 *   peso_alvo = peso_atual * (100 - bf_atual) / (100 - bf_alvo)
 */
export function computeTargetWeightFromBf(currentWeight, currentBf, targetBf) {
  if (currentWeight == null || currentBf == null || targetBf == null) return null;
  if (targetBf >= 100 || currentBf >= 100) return null;
  return +(currentWeight * (100 - currentBf) / (100 - targetBf)).toFixed(1);
}

/**
 * Peso alvo pelo IMC — peso = IMC × (altura em metros)².
 * `altura_cm` é a altura em cm (guardada no atleta).
 */
export function computeTargetWeightFromImc(targetImc, altura_cm) {
  if (targetImc == null || !altura_cm) return null;
  const h = altura_cm / 100;
  return +(targetImc * h * h).toFixed(1);
}

// Alias mantido para compat com código antigo (usa fórmula do %MG).
export const computeTargetWeight = computeTargetWeightFromBf;

/**
 * Devolve o resumo do estado do objetivo escolhido como primário.
 * Também expõe os dois pesos alvo (bf/imc) para poder mostrar o secundário.
 *
 * Params:
 *   currentWeight  — peso atual (da última avaliação/pesagem)
 *   currentBf      — % MG atual (última avaliação)
 *   currentImc     — IMC atual (última avaliação)
 *   goal           — { bf_target_pct, imc_target, primary_metric }
 *   athlete        — { altura_cm } (necessário para o alvo por IMC)
 */
export function computeGoalStatus({ currentWeight, currentBf, currentImc, goal, athlete }) {
  const targetBf = goal?.bf_target_pct ?? null;
  const targetImc = goal?.imc_target ?? null;
  const primary = goal?.primary_metric === "imc" ? "imc" : "bf";
  const targetWeightBf = computeTargetWeightFromBf(currentWeight, currentBf, targetBf);
  const targetWeightImc = computeTargetWeightFromImc(targetImc, athlete?.altura_cm);

  const hasBf = targetBf != null;
  const hasImc = targetImc != null;

  if (!hasBf && !hasImc) {
    return {
      status: "sem_objetivo",
      label: "Sem objetivo",
      primary,
      targetBf,
      targetImc,
      targetWeight: null,
      targetWeightBf,
      targetWeightImc,
      delta: null,
      absDelta: null,
      direction: null,
      color: "muted",
    };
  }

  // Se a métrica primária escolhida não tem alvo definido, cai para a outra.
  const effectivePrimary = primary === "imc" ? (hasImc ? "imc" : "bf") : (hasBf ? "bf" : "imc");
  const targetWeight = effectivePrimary === "imc" ? targetWeightImc : targetWeightBf;

  if (targetWeight == null || currentWeight == null) {
    return {
      status: "sem_dados",
      label: "Sem avaliação recente",
      primary: effectivePrimary,
      targetBf,
      targetImc,
      targetWeight: null,
      targetWeightBf,
      targetWeightImc,
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
  if (abs <= 0.5) { status = "atingido"; label = "Atingido"; color = "green"; }
  else if (abs <= 2) { status = "quase_la"; label = "Quase lá"; color = "green-soft"; }
  else if (abs <= 5) { status = "em_progresso"; label = "Em progresso"; color = "amber"; }
  else { status = "prioritario"; label = "Prioritário"; color = "red"; }

  return {
    status, label,
    primary: effectivePrimary,
    targetBf, targetImc,
    targetWeight, targetWeightBf, targetWeightImc,
    delta, absDelta: abs, direction, color,
  };
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
