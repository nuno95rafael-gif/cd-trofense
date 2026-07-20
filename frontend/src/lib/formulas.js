// Client-side mirror of backend formulas — para preview em tempo real.

export function sumPregas7(p) {
  const keys = ["peito", "tricipital", "subescapular", "axilar", "suprailiaca", "abdominal", "coxa"];
  const vals = keys.map((k) => p?.[k]);
  if (vals.some((v) => v == null || v === "")) return null;
  return vals.reduce((a, b) => a + Number(b), 0);
}

export function sumPregas8(p) {
  const s7 = sumPregas7(p);
  if (s7 == null || p?.supraespinhal == null || p?.supraespinhal === "") return null;
  return s7 + Number(p.supraespinhal);
}

export function bmi(w, hCm) {
  if (!w || !hCm) return null;
  const h = hCm / 100;
  return +(w / (h * h)).toFixed(2);
}

export function bfJacksonPollock(p, sex, age) {
  const s = sumPregas7(p);
  if (s == null || !age) return null;
  let d;
  if (sex === "M") d = 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age;
  else d = 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * age;
  if (d <= 0) return null;
  return +(495 / d - 450).toFixed(2);
}

export function bfWithers(p, sex) {
  const s = sumPregas7(p);
  if (s == null || s <= 0) return null;
  let d;
  if (sex === "M") d = 1.0988 - 0.0004 * s;
  else d = 1.17484 - 0.07229 * Math.log10(s);
  if (d <= 0) return null;
  return +(495 / d - 450).toFixed(2);
}

export function bfReillyWallace(p) {
  const need = ["abdominal", "coxa", "tricipital", "gemeo"];
  const v = {};
  for (const k of need) {
    if (p?.[k] == null || p?.[k] === "") return null;
    v[k] = Number(p[k]);
  }
  return +(5.174 + 0.124 * v.abdominal + 0.147 * v.coxa + 0.196 * v.tricipital + 0.13 * v.gemeo).toFixed(2);
}

export function bfEvans(p, sex, ethnicity = "caucasiano") {
  let s = 0;
  for (const k of ["abdominal", "coxa", "tricipital"]) {
    if (p?.[k] == null || p?.[k] === "") return null;
    s += Number(p[k]);
  }
  const isAfro = (ethnicity || "").toLowerCase().startsWith("afr");
  let bf;
  if (sex === "M") bf = 8.997 + 0.24658 * s - (isAfro ? 6.343 : 0) - (!isAfro ? 1.998 : 0);
  else bf = 10.566 + 0.20345 * s - (isAfro ? 6.343 : 0) - (!isAfro ? 1.998 : 0);
  return +bf.toFixed(2);
}

export function muscleMassLee(heightCm, per, sex, age, ethnicity = "caucasiano") {
  if (!heightCm || !age) return null;
  const cag = per?.braco;
  const coxa = per?.coxaD ?? per?.coxaE;
  const ccg = per?.gemeo;
  if (cag == null || coxa == null || ccg == null || cag === "" || coxa === "" || ccg === "") return null;
  const ht = heightCm / 100;
  const sexV = sex === "M" ? 1 : 0;
  const eth = (ethnicity || "").toLowerCase();
  const race = eth.startsWith("asi") ? 1.1 : eth.startsWith("afr") ? 1.4 : 0;
  const smm =
    ht * (0.00744 * cag * cag + 0.00088 * coxa * coxa + 0.00441 * ccg * ccg) +
    2.4 * sexV -
    0.048 * age +
    race +
    7.8;
  return +smm.toFixed(2);
}

export function statusFromBf(bf, sex) {
  if (bf == null) return "—";
  if (sex === "M") return bf < 12 ? "Ótimo" : bf < 18 ? "Atenção" : "Alto";
  return bf < 20 ? "Ótimo" : bf < 26 ? "Atenção" : "Alto";
}

export function computeAll(evaluation, athlete) {
  const p = evaluation?.pregas || {};
  const per = evaluation?.perimetros || {};
  const sex = athlete?.sexo || "M";
  const eth = athlete?.etnia || "caucasiano";
  const h = athlete?.altura_cm;
  const age = evaluation?.age_at_eval ?? athlete?.idade;
  const w = evaluation?.peso_kg;

  const reilly = bfReillyWallace(p);
  const evans = bfEvans(p, sex, eth);
  const jp = age ? bfJacksonPollock(p, sex, age) : null;
  const withers = bfWithers(p, sex);
  const bfs = [reilly, evans, jp, withers].filter((v) => v != null);
  const bf_average = bfs.length ? +(bfs.reduce((a, b) => a + b, 0) / bfs.length).toFixed(2) : null;
  const smm = muscleMassLee(h, per, sex, age, eth);
  const imc = bmi(w, h);
  const mg_kg = w && bf_average != null ? +((w * bf_average) / 100).toFixed(2) : null;
  const ratio = smm && mg_kg ? +(smm / mg_kg).toFixed(2) : null;

  return {
    bf_reilly_wallace: reilly,
    bf_evans: evans,
    bf_jackson_pollock: jp,
    bf_withers: withers,
    bf_average,
    muscle_mass_kg: smm,
    fat_mass_kg: mg_kg,
    mm_mg_ratio: ratio,
    imc,
    sum_pregas_7: sumPregas7(p),
    sum_pregas_8: sumPregas8(p),
    status: statusFromBf(bf_average, sex),
  };
}
