"""Body composition formulas — fiéis às referências originais.

Todas as fórmulas recebem dicionário `p` com pregas (mm) e outros dados.
Devolvem valores em % ou kg. Se dados insuficientes -> None.
"""
from math import log10


def sum_pregas_7(p: dict) -> float | None:
    """Somatório 7 pregas: peito, tricipital, subescapular, axilar,
    suprailiaca, abdominal, coxa."""
    keys = ["peito", "tricipital", "subescapular", "axilar",
            "suprailiaca", "abdominal", "coxa"]
    vals = [p.get(k) for k in keys]
    if any(v is None for v in vals):
        return None
    return float(sum(vals))


def sum_pregas_8(p: dict) -> float | None:
    """Somatório 8 pregas: adiciona 'supraespinhal' ao 7-pregas."""
    keys = ["peito", "tricipital", "subescapular", "axilar",
            "suprailiaca", "abdominal", "coxa", "supraespinhal"]
    vals = [p.get(k) for k in keys]
    if any(v is None for v in vals):
        return None
    return float(sum(vals))


def bmi(weight_kg: float | None, height_cm: float | None) -> float | None:
    if not weight_kg or not height_cm:
        return None
    h = height_cm / 100.0
    if h <= 0:
        return None
    return round(weight_kg / (h * h), 2)


# ---------- Jackson-Pollock (7 skinfolds) ----------
def bf_jackson_pollock(p: dict, sex: str, age: float) -> float | None:
    """Jackson & Pollock 7 pregas — % MG.
    Densidade -> Siri para % MG.
    """
    s = sum_pregas_7(p)
    if s is None or age is None:
        return None
    if sex == "M":
        density = 1.112 - 0.00043499 * s + 0.00000055 * (s * s) - 0.00028826 * age
    else:
        density = 1.097 - 0.00046971 * s + 0.00000056 * (s * s) - 0.00012828 * age
    if density <= 0:
        return None
    bf = (495.0 / density) - 450.0
    return round(bf, 2)


# ---------- Withers (males 7 pregas) ----------
def bf_withers(p: dict, sex: str) -> float | None:
    """Withers et al. 1987 — 7 pregas (atletas).
    Homens: D = 1.0988 - 0.0004 * S7
    Mulheres: D = 1.17484 - 0.07229 * log10(S7)
    """
    s = sum_pregas_7(p)
    if s is None or s <= 0:
        return None
    if sex == "M":
        density = 1.0988 - 0.0004 * s
    else:
        density = 1.17484 - 0.07229 * log10(s)
    if density <= 0:
        return None
    bf = (495.0 / density) - 450.0
    return round(bf, 2)


# ---------- Reilly & Wallace (soccer players) ----------
def bf_reilly_wallace(p: dict) -> float | None:
    """Reilly et al. 2009 — jogadores de futebol.
    %MG = 5.174 + 0.124*(abdominal) + 0.147*(coxa) + 0.196*(tricipital)
          + 0.130*(gemeo)
    (mm de pregas)
    """
    keys = ["abdominal", "coxa", "tricipital", "gemeo"]
    vals = {k: p.get(k) for k in keys}
    if any(v is None for v in vals.values()):
        return None
    bf = (5.174
          + 0.124 * vals["abdominal"]
          + 0.147 * vals["coxa"]
          + 0.196 * vals["tricipital"]
          + 0.130 * vals["gemeo"])
    return round(bf, 2)


# ---------- Evans 2005 (athletes 3-site) ----------
def bf_evans(p: dict, sex: str, ethnicity: str = "caucasiano") -> float | None:
    """Evans et al. 2005 — atletas.
    Homens: %MG = 8.997 + 0.24658*(S3) - 6.343*(1 se afro) - 1.998*(1 se branco)
    Onde S3 = abdominal + coxa + tricipital
    Simplificação usada no JSX: coefs por etnia.
    """
    s = 0.0
    for k in ("abdominal", "coxa", "tricipital"):
        v = p.get(k)
        if v is None:
            return None
        s += v
    is_afro = (ethnicity or "").lower().startswith("afr")
    if sex == "M":
        bf = 8.997 + 0.24658 * s - (6.343 if is_afro else 0.0) - (1.998 if not is_afro else 0.0)
    else:
        # Fórmula geral para mulheres (Evans 2005)
        bf = 10.566 + 0.20345 * s - (6.343 if is_afro else 0.0) - (1.998 if not is_afro else 0.0)
    return round(bf, 2)


# ---------- Lee et al. 2000 — Massa Muscular (SMM em kg) ----------
def muscle_mass_lee(height_cm: float | None,
                    perimeters: dict,
                    sex: str,
                    age: float | None,
                    ethnicity: str = "caucasiano") -> float | None:
    """Lee et al. 2000 — Skeletal Muscle Mass (kg).
    SMM = Ht * (0.00744*CAG^2 + 0.00088*CTG^2 + 0.00441*CCG^2)
          + 2.4*sex - 0.048*age + race + 7.8
    onde:
        CAG = perimetro braço corrigido (cm - preg triciptal em cm)
        CTG = perimetro coxa corrigido (cm - preg coxa em cm)
        CCG = perimetro gémeo corrigido (cm - preg gémeo em cm)
    sex = 1 se M, 0 se F. race = 1.1 (asiático), 1.4 (afro), 0 (caucas.)
    Neste app usamos perímetros medidos (não corrigidos) por simplicidade
    porque não pedimos pregas nos mesmos sítios em cm.
    """
    if not height_cm or age is None:
        return None
    ht = height_cm / 100.0
    cag = perimeters.get("braco")
    coxa_perim = perimeters.get("coxaD") or perimeters.get("coxaE")
    ccg = perimeters.get("gemeo")
    if cag is None or coxa_perim is None or ccg is None:
        return None
    sex_v = 1.0 if sex == "M" else 0.0
    eth = (ethnicity or "").lower()
    if eth.startswith("asi"):
        race = 1.1
    elif eth.startswith("afr"):
        race = 1.4
    else:
        race = 0.0
    smm = (ht * (0.00744 * cag * cag
                 + 0.00088 * coxa_perim * coxa_perim
                 + 0.00441 * ccg * ccg)
           + 2.4 * sex_v - 0.048 * age + race + 7.8)
    return round(smm, 2)


def status_from_bf(bf: float | None, sex: str) -> str:
    """Retorna faixa: Ótimo / Atenção / Alto conforme sexo."""
    if bf is None:
        return "—"
    if sex == "M":
        if bf < 12:
            return "Ótimo"
        if bf < 18:
            return "Atenção"
        return "Alto"
    # F
    if bf < 20:
        return "Ótimo"
    if bf < 26:
        return "Atenção"
    return "Alto"


def compute_all(evaluation: dict, athlete: dict) -> dict:
    """Recebe evaluation (pregas+perimetros+peso+age_at_eval) e athlete
    (sexo, etnia, altura_cm). Devolve dicionário com todos os cálculos."""
    p = evaluation.get("pregas", {}) or {}
    per = evaluation.get("perimetros", {}) or {}
    sex = athlete.get("sexo", "M")
    ethnicity = athlete.get("etnia", "caucasiano")
    height_cm = athlete.get("altura_cm")
    age = evaluation.get("age_at_eval") or athlete.get("idade")
    weight = evaluation.get("peso_kg")

    reilly = bf_reilly_wallace(p)
    evans = bf_evans(p, sex, ethnicity)
    jp = bf_jackson_pollock(p, sex, age) if age else None
    withers = bf_withers(p, sex)

    bfs = [x for x in (reilly, evans, jp, withers) if x is not None]
    bf_avg = round(sum(bfs) / len(bfs), 2) if bfs else None

    smm = muscle_mass_lee(height_cm, per, sex, age, ethnicity)
    imc = bmi(weight, height_cm)
    s7 = sum_pregas_7(p)
    s8 = sum_pregas_8(p)

    mg_kg = round(weight * bf_avg / 100.0, 2) if (weight and bf_avg is not None) else None
    ratio = round(smm / mg_kg, 2) if (smm and mg_kg and mg_kg > 0) else None

    return {
        "bf_reilly_wallace": reilly,
        "bf_evans": evans,
        "bf_jackson_pollock": jp,
        "bf_withers": withers,
        "bf_average": bf_avg,
        "muscle_mass_kg": smm,
        "fat_mass_kg": mg_kg,
        "mm_mg_ratio": ratio,
        "imc": imc,
        "sum_pregas_7": s7,
        "sum_pregas_8": s8,
        "status": status_from_bf(bf_avg, sex),
    }
