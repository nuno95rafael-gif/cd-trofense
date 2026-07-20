"""Body composition formulas — FIÉIS ao Trofense_APP.jsx original.

Todas as fórmulas devolvem % MG diretamente em % (0-100) — não em fração.
"""
from math import pow

PI_EXCEL = 3.1415  # constante literal usada no ficheiro original (não Math.PI)


def _get(p, *keys):
    """Devolve lista de valores; None se algum faltar."""
    out = []
    for k in keys:
        v = p.get(k)
        if v is None or v == "":
            return None
        out.append(float(v))
    return out


def sum_pregas_8(p):
    """Σ 8 pregas (idêntico ao original): tricipital + bicipital + axilar +
    suprailiaca + subescapular + abdominal + coxa + gemeo (sem peito)."""
    v = _get(p, "tricipital", "bicipital", "axilar", "suprailiaca",
             "subescapular", "abdominal", "coxa", "gemeo")
    return round(sum(v), 2) if v else None


def sum_pregas_7(p):
    """Σ 7 pregas standard (peito, tricipital, subescapular, axilar,
    suprailiaca, abdominal, coxa)."""
    v = _get(p, "peito", "tricipital", "subescapular", "axilar",
             "suprailiaca", "abdominal", "coxa")
    return round(sum(v), 2) if v else None


def bmi(weight_kg, height_cm):
    if not weight_kg or not height_cm:
        return None
    h = height_cm / 100.0
    return round(weight_kg / (h * h), 2)


# --------- Reilly & Wallace (4 dobras, para futebolistas) ---------
def bf_reilly_wallace(p):
    """rw = 5.174 + 0.124·coxa + 0.147·abdominal + 0.196·tricipital + 0.13·gémeo (%)"""
    v = _get(p, "coxa", "abdominal", "tricipital", "gemeo")
    if not v:
        return None
    coxa, abdom, tri, gemeo = v
    return round(5.174 + 0.124 * coxa + 0.147 * abdom + 0.196 * tri + 0.13 * gemeo, 2)


# --------- Evans 7 dobras ---------
def bf_evans7(p, sex_num, ethnicity_num):
    """evans7 = 10.566 + 0.12077*Σ7 - 8.057*sexo - 2.545*etnia
    sexo=1 se M, 0 se F; etnia=0 ou 1.
    Pregas: peito+tricipital+bicipital+axilar+suprailiaca+abdominal+coxa
    """
    v = _get(p, "peito", "tricipital", "bicipital", "axilar",
             "suprailiaca", "abdominal", "coxa")
    if not v:
        return None
    s = sum(v)
    return round(10.566 + 0.12077 * s - 8.057 * sex_num - 2.545 * ethnicity_num, 2)


# --------- Evans 3 dobras ---------
def bf_evans3(p, sex_num, ethnicity_num):
    """evans3 = 8.997 + 0.24658*(abdominal+coxa+tricipital) - 6.343*sexo - 1.998*etnia"""
    v = _get(p, "abdominal", "coxa", "tricipital")
    if not v:
        return None
    s = sum(v)
    return round(8.997 + 0.24658 * s - 6.343 * sex_num - 1.998 * ethnicity_num, 2)


# --------- Jackson-Pollock 7 dobras ---------
def bf_jackson_pollock(p, age):
    """jp7 = 4.95/(1.112 - 0.00043499*Σ + 0.00000055*Σ² - 0.00028826*idade) - 4.5
    Retorna em fração; multiplica-se por 100 para %.
    Pregas: peito+tricipital+bicipital+subescapular+abdominal+coxa+suprailiaca"""
    v = _get(p, "peito", "tricipital", "bicipital", "subescapular",
             "abdominal", "coxa", "suprailiaca")
    if not v or not age:
        return None
    s = sum(v)
    d = 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age
    if d <= 0:
        return None
    frac = 4.95 / d - 4.5
    return round(frac * 100, 2)


# --------- Withers ---------
def bf_withers(p):
    """withers = (495/(1.0988 - 0.0004*Σ7w) - 450)/100 * 100  = 495/D - 450
    Pregas: tricipital+bicipital+subescapular+abdominal+supraespinhal+coxa+gemeo"""
    v = _get(p, "tricipital", "bicipital", "subescapular", "abdominal",
             "supraespinhal", "coxa", "gemeo")
    if not v:
        return None
    s = sum(v)
    d = 1.0988 - 0.0004 * s
    if d <= 0:
        return None
    return round(495 / d - 450, 2)


# --------- Massa Muscular Lee 2000 (corrigido: perímetros - PI*preg/10) ---------
def muscle_mass_lee(altura_cm, p, per, sex_num, ethnicity_num, age):
    """MM (kg) = altura_m * (0.00744*(braco - PI*tri/10)² +
                             0.00088*(coxaD - PI*supraespinhal/10)² +
                             0.00441*(gemeo_per - PI*gemeo_preg/10)²)
                + 2.4*sexo - 0.048*idade + etnia + 7.8
    """
    if not altura_cm or age is None:
        return None
    braco = per.get("braco")
    coxaD = per.get("coxaD") or per.get("coxaE")
    gemeo_per = per.get("gemeo")
    tri = p.get("tricipital")
    sup = p.get("supraespinhal")
    gem_preg = p.get("gemeo")
    for v in (braco, coxaD, gemeo_per, tri, sup, gem_preg):
        if v is None or v == "":
            return None
    altura_m = altura_cm / 100.0
    mm = (
        altura_m * (
            0.00744 * pow(float(braco) - PI_EXCEL * float(tri) / 10.0, 2) +
            0.00088 * pow(float(coxaD) - PI_EXCEL * float(sup) / 10.0, 2) +
            0.00441 * pow(float(gemeo_per) - PI_EXCEL * float(gem_preg) / 10.0, 2)
        )
        + 2.4 * sex_num
        - 0.048 * age
        + ethnicity_num
        + 7.8
    )
    return round(mm, 2)


# --------- Bandas de estado (pontos de corte do ficheiro original) ---------
def rw_band(rw_pct):
    """% MG Reilly&Wallace — futebolistas de elite (não clínicas)."""
    if rw_pct is None:
        return "—"
    if rw_pct < 9:
        return "Ótimo"
    if rw_pct <= 10:
        return "Atenção"
    return "Alto"


def soma8_band(s8):
    if s8 is None:
        return "—"
    if s8 < 65:
        return "Baixo"
    if s8 <= 75:
        return "Médio"
    return "Alto"


def perc_mm_band(perc_mm):
    """% Massa Muscular sobre peso."""
    if perc_mm is None:
        return "—"
    if perc_mm >= 45:
        return "Ótimo"
    if perc_mm >= 40:
        return "Atenção"
    return "Baixo"


def mm_mg_band(ratio, sex_num):
    """M≥4 normal, F≥2 normal (senão baixo)."""
    if ratio is None:
        return "—"
    threshold = 4 if sex_num == 1 else 2
    return "Normal" if ratio >= threshold else "Baixo"


def imc_band(imc):
    if imc is None:
        return "—"
    if imc < 18.5:
        return "Baixo peso"
    if imc < 25:
        return "Peso normal"
    if imc < 30:
        return "Sobrepeso"
    if imc < 35:
        return "Obesidade I"
    if imc < 40:
        return "Obesidade II"
    return "Obesidade III"


def compute_all(evaluation, athlete):
    """Calcula todos os indicadores da avaliação.

    athlete.sexo: string "M"/"F" (é convertida para 1/0)
    athlete.etnia: string ("caucasiano" → 0, "africano" → 1, outros→0)
    """
    p = evaluation.get("pregas", {}) or {}
    per = evaluation.get("perimetros", {}) or {}
    sex = athlete.get("sexo", "M")
    sex_num = 1 if sex == "M" else 0
    eth = (athlete.get("etnia") or "caucasiano").lower()
    eth_num = 1 if eth.startswith("afr") else 0
    altura_cm = athlete.get("altura_cm")
    age = evaluation.get("age_at_eval") or athlete.get("idade")
    weight = evaluation.get("peso_kg")

    rw = bf_reilly_wallace(p)
    ev7 = bf_evans7(p, sex_num, eth_num)
    ev3 = bf_evans3(p, sex_num, eth_num)
    jp = bf_jackson_pollock(p, age) if age else None
    wt = bf_withers(p)

    bfs = [x for x in (rw, ev7, ev3, jp, wt) if x is not None]
    bf_avg = round(sum(bfs) / len(bfs), 2) if bfs else None

    mm = muscle_mass_lee(altura_cm, p, per, sex_num, eth_num, age)
    imc = bmi(weight, altura_cm)
    s7 = sum_pregas_7(p)
    s8 = sum_pregas_8(p)

    # Original usa Evans 7 para a massa gorda em kg (não R&W)
    mg_kg = round(weight * ev7 / 100.0, 2) if (weight and ev7 is not None) else None
    massa_magra = round(weight - mg_kg, 2) if (weight and mg_kg is not None) else None
    mm_mg = round(mm / mg_kg, 2) if (mm and mg_kg and mg_kg > 0) else None
    perc_mm = round(mm / weight * 100, 2) if (mm and weight) else None
    # Rácio cintura/anca
    cintura = (per or {}).get("cintura")
    anca = (per or {}).get("anca")
    ratio_ca = round(cintura / anca, 2) if (cintura and anca) else None

    return {
        "rw": rw,
        "evans7": ev7,
        "evans3": ev3,
        "jp7": jp,
        "withers": wt,
        "bf_average": bf_avg,
        "muscle_mass_kg": mm,
        "perc_mm": perc_mm,
        "fat_mass_kg": mg_kg,
        "lean_mass_kg": massa_magra,
        "mm_mg_ratio": mm_mg,
        "imc": imc,
        "ratio_ca": ratio_ca,
        "soma7": s7,
        "soma8": s8,
        "status_rw": rw_band(rw),
        "status_soma8": soma8_band(s8),
        "status_perc_mm": perc_mm_band(perc_mm),
        "status_mm_mg": mm_mg_band(mm_mg, sex_num),
        "status_imc": imc_band(imc),
        # legacy aliases used elsewhere
        "status": rw_band(rw),
        "bf_reilly_wallace": rw,
        "bf_evans": ev3,
        "bf_jackson_pollock": jp,
        "bf_withers": wt,
    }
