// Mirror EXATO do ficheiro Trofense_APP.jsx original para cálculo em tempo real
const PI_EXCEL = 3.1415;

const num = (p, ...keys) => {
  const out = [];
  for (const k of keys) {
    const v = p?.[k];
    if (v == null || v === "") return null;
    out.push(Number(v));
  }
  return out;
};

export function sumPregas8(p) {
  const v = num(p, "peito", "tricipital", "subescapular", "axilar", "suprailiaca", "abdominal", "coxa", "gemeo");
  return v ? +v.reduce((a, b) => a + b, 0).toFixed(2) : null;
}
export function sumPregas7(p) {
  const v = num(p, "peito", "tricipital", "subescapular", "axilar", "suprailiaca", "abdominal", "coxa");
  return v ? +v.reduce((a, b) => a + b, 0).toFixed(2) : null;
}

export function bmi(w, hCm) {
  if (!w || !hCm) return null;
  const h = hCm / 100;
  return +(w / (h * h)).toFixed(2);
}

export function bfReillyWallace(p) {
  const v = num(p, "coxa", "abdominal", "gemeo");
  if (!v) return null;
  const [coxa, abdom, gemeo] = v;
  return +(5.174 + 0.124 * coxa + 0.147 * abdom + 0.13 * gemeo).toFixed(2);
}

export function bfEvans7(p, sexNum, ethNum) {
  const v = num(p, "peito", "tricipital", "bicipital", "axilar", "suprailiaca", "abdominal", "coxa");
  if (!v) return null;
  const s = v.reduce((a, b) => a + b, 0);
  return +(10.566 + 0.12077 * s - 8.057 * sexNum - 2.545 * ethNum).toFixed(2);
}

export function bfEvans3(p, sexNum, ethNum) {
  const v = num(p, "abdominal", "coxa", "tricipital");
  if (!v) return null;
  const s = v.reduce((a, b) => a + b, 0);
  return +(8.997 + 0.24658 * s - 6.343 * sexNum - 1.998 * ethNum).toFixed(2);
}

export function bfJacksonPollock(p, age) {
  const v = num(p, "peito", "tricipital", "bicipital", "subescapular", "abdominal", "coxa", "suprailiaca");
  if (!v || !age) return null;
  const s = v.reduce((a, b) => a + b, 0);
  const d = 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age;
  if (d <= 0) return null;
  return +((4.95 / d - 4.5) * 100).toFixed(2);
}

export function bfWithers(p) {
  const v = num(p, "tricipital", "bicipital", "subescapular", "abdominal", "supraespinhal", "coxa", "gemeo");
  if (!v) return null;
  const s = v.reduce((a, b) => a + b, 0);
  const d = 1.0988 - 0.0004 * s;
  if (d <= 0) return null;
  return +(495 / d - 450).toFixed(2);
}

export function muscleMassLee(alturaCm, p, per, sexNum, ethNum, age) {
  if (!alturaCm || age == null) return null;
  const braco = per?.braco, coxaD = per?.coxaD ?? per?.coxaE, gemPer = per?.gemeo;
  const tri = p?.tricipital, sup = p?.supraespinhal, gemPreg = p?.gemeo;
  for (const v of [braco, coxaD, gemPer, tri, sup, gemPreg]) if (v == null || v === "") return null;
  const alturaM = alturaCm / 100;
  const mm =
    alturaM *
      (0.00744 * Math.pow(braco - (PI_EXCEL * tri) / 10, 2) +
        0.00088 * Math.pow(coxaD - (PI_EXCEL * sup) / 10, 2) +
        0.00441 * Math.pow(gemPer - (PI_EXCEL * gemPreg) / 10, 2)) +
    2.4 * sexNum -
    0.048 * age +
    ethNum +
    7.8;
  return +mm.toFixed(2);
}

// ---------- Bandas (pontos de corte do original) ----------
export function rwBand(rw) {
  if (rw == null) return { label: "—", color: "muted" };
  if (rw < 9) return { label: "Ótimo", color: "otimo" };
  if (rw <= 10) return { label: "Atenção", color: "atencao" };
  return { label: "Alto", color: "alto" };
}
export function soma8Band(s8) {
  if (s8 == null) return { label: "—", color: "muted" };
  if (s8 < 65) return { label: "Baixo", color: "otimo" };
  if (s8 <= 75) return { label: "Médio", color: "atencao" };
  return { label: "Alto", color: "alto" };
}
export function percMMBand(pm) {
  if (pm == null) return { label: "—", color: "muted" };
  if (pm >= 45) return { label: "Ótimo", color: "otimo" };
  if (pm >= 40) return { label: "Atenção", color: "atencao" };
  return { label: "Baixo", color: "alto" };
}
export function mmMgBand(r, sexNum) {
  if (r == null) return { label: "—", color: "muted" };
  const min = sexNum === 1 ? 4 : 2;
  return r >= min ? { label: "Normal", color: "otimo" } : { label: "Baixo", color: "alto" };
}
export function imcBand(imc) {
  if (imc == null) return { label: "—", color: "muted" };
  if (imc < 18.5) return { label: "Baixo peso", color: "alto" };
  if (imc < 25) return { label: "Normal", color: "otimo" };
  if (imc < 30) return { label: "Sobrepeso", color: "atencao" };
  return { label: "Obesidade", color: "alto" };
}

export function computeAll(evaluation, athlete) {
  const p = evaluation?.pregas || {};
  const per = evaluation?.perimetros || {};
  const sexNum = athlete?.sexo === "M" ? 1 : 0;
  const eth = (athlete?.etnia || "caucasiano").toLowerCase();
  const ethNum = eth.startsWith("afr") ? 1 : 0;
  const alturaCm = athlete?.altura_cm;
  const age = evaluation?.age_at_eval ?? athlete?.idade;
  const w = evaluation?.peso_kg;

  const rw = bfReillyWallace(p);
  const evans7 = bfEvans7(p, sexNum, ethNum);
  const evans3 = bfEvans3(p, sexNum, ethNum);
  const jp7 = age ? bfJacksonPollock(p, age) : null;
  const withers = bfWithers(p);
  const bfs = [rw, evans7, evans3, jp7, withers].filter((v) => v != null);
  const bf_average = bfs.length ? +(bfs.reduce((a, b) => a + b, 0) / bfs.length).toFixed(2) : null;
  const mm = muscleMassLee(alturaCm, p, per, sexNum, ethNum, age);
  const imc = bmi(w, alturaCm);
  const s8 = sumPregas8(p);
  const s7 = sumPregas7(p);
  const mg_kg = w && rw != null ? +((w * rw) / 100).toFixed(2) : null;
  const lean = w && mg_kg != null ? +(w - mg_kg).toFixed(2) : null;
  const mm_mg = mm && mg_kg ? +(mm / mg_kg).toFixed(2) : null;
  const perc_mm = mm && w ? +((mm / w) * 100).toFixed(2) : null;

  return {
    rw, evans7, evans3, jp7, withers,
    bf_average, muscle_mass_kg: mm, perc_mm,
    fat_mass_kg: mg_kg, lean_mass_kg: lean,
    mm_mg_ratio: mm_mg, imc,
    soma7: s7, soma8: s8,
    // legacy aliases
    bf_reilly_wallace: rw, bf_evans: evans3, bf_jackson_pollock: jp7, bf_withers: withers,
    status: rwBand(rw).label,
  };
}
