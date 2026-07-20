from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form, Query, Header
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from formulas import compute_all
from storage import put_object, get_object, init_storage, APP_NAME

# ---------- Setup ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="CD Trofense API")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TTL_MIN = 60 * 12  # 12 horas

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trofense")


# ---------- Helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user or not user.get("active", True):
        raise HTTPException(status_code=401, detail="Utilizador inválido")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user


async def require_editor(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "editor":
        raise HTTPException(status_code=403, detail="Apenas editores podem executar esta ação")
    return user


def strip_id(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


# ---------- Models ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserCreateIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "viewer"  # editor | viewer


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    active: bool = True
    created_at: str


class AthleteIn(BaseModel):
    nome: str
    posicao: Optional[str] = None
    sexo: str = "M"  # M | F
    etnia: str = "caucasiano"
    altura_cm: Optional[float] = None
    idade: Optional[float] = None
    peso_normal_kg: Optional[float] = None
    peso_atual_kg: Optional[float] = None
    dieta: Optional[str] = None
    agua_l: Optional[float] = None
    suplementacao: Optional[str] = None
    cafeina: Optional[str] = None
    preferencia_jogo: Optional[str] = None
    sabor_batido: Optional[str] = None
    intervalo: Optional[str] = None
    nao_gosta: Optional[str] = None
    sono_h: Optional[float] = None
    notas: Optional[str] = None


class EvaluationIn(BaseModel):
    date: str  # ISO
    peso_kg: Optional[float] = None
    age_at_eval: Optional[float] = None
    pregas: dict = Field(default_factory=dict)
    perimetros: dict = Field(default_factory=dict)
    notas: Optional[str] = None


class WeighinIn(BaseModel):
    date: str
    peso_kg: float


class GoalIn(BaseModel):
    bf_target_pct: float


# ---------- Auth ----------
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Conta desativada")
    token = create_token(user["id"], user["role"])
    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TTL_MIN * 60,
        path="/",
    )
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}


@api.post("/auth/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Users (editor only) ----------
@api.get("/users")
async def list_users(_: dict = Depends(require_editor)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return docs


@api.post("/users")
async def create_user(body: UserCreateIn, _: dict = Depends(require_editor)):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email já existe")
    if body.role not in ("editor", "viewer"):
        raise HTTPException(status_code=400, detail="Papel inválido")
    doc = {
        "id": new_id(),
        "email": email,
        "name": body.name,
        "role": body.role,
        "active": True,
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash")
    doc.pop("_id", None)
    return doc


@api.patch("/users/{user_id}")
async def toggle_user(user_id: str, active: bool = Query(...), current: dict = Depends(require_editor)):
    if user_id == current["id"] and not active:
        raise HTTPException(status_code=400, detail="Não pode desativar-se a si próprio")
    r = await db.users.update_one({"id": user_id}, {"$set": {"active": active}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    return {"ok": True}


# ---------- Athletes ----------
@api.get("/athletes")
async def list_athletes(_: dict = Depends(get_current_user)):
    docs = await db.athletes.find({}, {"_id": 0}).sort("nome", 1).to_list(1000)
    # anexar métricas da última avaliação
    for a in docs:
        last = await db.evaluations.find_one(
            {"athlete_id": a["id"]}, {"_id": 0}, sort=[("date", -1)]
        )
        if last:
            a["last_metrics"] = last.get("metrics")
            a["last_evaluation_date"] = last.get("date")
            a["last_eval_weight"] = last.get("peso_kg")
        # última pesagem
        lw = await db.weighins.find_one({"athlete_id": a["id"]}, {"_id": 0}, sort=[("date", -1)])
        if lw:
            a["last_weight"] = lw.get("peso_kg")
            a["last_weight_date"] = lw.get("date")
        # peso a mostrar: pesagem > avaliação > peso_atual_kg
        a["display_weight"] = (
            a.get("last_weight")
            or a.get("last_eval_weight")
            or a.get("peso_atual_kg")
        )
    return docs


@api.post("/athletes")
async def create_athlete(body: AthleteIn, user: dict = Depends(require_editor)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    doc["created_by"] = user["id"]
    doc["goal"] = None
    await db.athletes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/athletes/{aid}")
async def get_athlete(aid: str, _: dict = Depends(get_current_user)):
    a = await db.athletes.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    return a


@api.put("/athletes/{aid}")
async def update_athlete(aid: str, body: AthleteIn, _: dict = Depends(require_editor)):
    r = await db.athletes.update_one({"id": aid}, {"$set": body.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    a = await db.athletes.find_one({"id": aid}, {"_id": 0})
    return a


@api.delete("/athletes/{aid}")
async def delete_athlete(aid: str, _: dict = Depends(require_editor)):
    await db.athletes.delete_one({"id": aid})
    await db.evaluations.delete_many({"athlete_id": aid})
    await db.weighins.delete_many({"athlete_id": aid})
    await db.photos.delete_many({"athlete_id": aid})
    return {"ok": True}


@api.put("/athletes/{aid}/goal")
async def set_goal(aid: str, body: GoalIn, _: dict = Depends(require_editor)):
    r = await db.athletes.update_one({"id": aid}, {"$set": {"goal": {"bf_target_pct": body.bf_target_pct, "updated_at": now_iso()}}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    return {"ok": True}


@api.post("/athletes/{aid}/recompute")
async def recompute_metrics(aid: str, _: dict = Depends(require_editor)):
    a = await db.athletes.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    evs = await db.evaluations.find({"athlete_id": aid}, {"_id": 0}).to_list(500)
    for e in evs:
        m = compute_all(e, a)
        await db.evaluations.update_one({"id": e["id"]}, {"$set": {"metrics": m}})
    return {"ok": True, "updated": len(evs)}


@api.post("/admin/recompute-all")
async def recompute_all(_: dict = Depends(require_editor)):
    total = 0
    async for a in db.athletes.find({}, {"_id": 0}):
        evs = await db.evaluations.find({"athlete_id": a["id"]}, {"_id": 0}).to_list(500)
        for e in evs:
            m = compute_all(e, a)
            await db.evaluations.update_one({"id": e["id"]}, {"$set": {"metrics": m}})
            total += 1
    return {"ok": True, "updated": total}


# ---------- Evaluations ----------
@api.get("/athletes/{aid}/evaluations")
async def list_evaluations(aid: str, _: dict = Depends(get_current_user)):
    docs = await db.evaluations.find({"athlete_id": aid}, {"_id": 0}).sort("date", 1).to_list(500)
    return docs


@api.post("/athletes/{aid}/evaluations")
async def create_evaluation(aid: str, body: EvaluationIn, user: dict = Depends(require_editor)):
    athlete = await db.athletes.find_one({"id": aid}, {"_id": 0})
    if not athlete:
        raise HTTPException(status_code=404, detail="Atleta não encontrado")
    ev = body.model_dump()
    ev["id"] = new_id()
    ev["athlete_id"] = aid
    ev["created_at"] = now_iso()
    ev["created_by"] = user["id"]
    ev["metrics"] = compute_all(ev, athlete)
    await db.evaluations.insert_one(ev)
    ev.pop("_id", None)
    return ev


@api.delete("/evaluations/{eid}")
async def delete_evaluation(eid: str, _: dict = Depends(require_editor)):
    await db.evaluations.delete_one({"id": eid})
    return {"ok": True}


@api.post("/preview-metrics")
async def preview_metrics(body: dict, _: dict = Depends(get_current_user)):
    """Cálculo rápido do lado do servidor (útil se cliente não quiser calcular).
    Body: {athlete: {...}, evaluation: {...}}
    """
    return compute_all(body.get("evaluation", {}), body.get("athlete", {}))


# ---------- Weighins ----------
@api.get("/athletes/{aid}/weighins")
async def list_weighins(aid: str, _: dict = Depends(get_current_user)):
    docs = await db.weighins.find({"athlete_id": aid}, {"_id": 0}).sort("date", 1).to_list(2000)
    return docs


@api.post("/athletes/{aid}/weighins")
async def create_weighin(aid: str, body: WeighinIn, user: dict = Depends(require_editor)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["athlete_id"] = aid
    doc["created_at"] = now_iso()
    doc["created_by"] = user["id"]
    await db.weighins.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/weighins/{wid}")
async def delete_weighin(wid: str, _: dict = Depends(require_editor)):
    await db.weighins.delete_one({"id": wid})
    return {"ok": True}


@api.post("/weighins/import")
async def import_weighins(
    file: UploadFile = File(...),
    user: dict = Depends(require_editor),
):
    """Import Excel/CSV com colunas: Nome, Data, Peso (opcional: Nota).
    Cria pesagens automaticamente. Retorna resumo.
    """
    import io
    import pandas as pd
    content = await file.read()
    ext = (file.filename or "").lower().split(".")[-1]
    try:
        if ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Não consegui ler o ficheiro: {e}")

    # normalizar nomes de colunas
    cols = {str(c).strip().lower(): c for c in df.columns}
    def col(*aliases):
        for a in aliases:
            if a in cols:
                return cols[a]
        return None
    c_nome = col("nome", "atleta", "name")
    c_data = col("data", "date")
    c_peso = col("peso", "peso (kg)", "kg", "weight")
    if not (c_nome and c_data and c_peso):
        raise HTTPException(status_code=400, detail="O ficheiro precisa das colunas: Nome, Data, Peso")

    # index de nome → id
    athletes = await db.athletes.find({}, {"_id": 0, "id": 1, "nome": 1}).to_list(2000)
    name_to_id = {a["nome"].strip().lower(): a["id"] for a in athletes}

    created = 0
    skipped = []
    for _, row in df.iterrows():
        try:
            nome = str(row[c_nome]).strip()
            if not nome or nome.lower() == "nan":
                continue
            aid = name_to_id.get(nome.lower())
            if not aid:
                skipped.append(f"{nome}: atleta não existe")
                continue
            raw_date = row[c_data]
            if hasattr(raw_date, "strftime"):
                date_str = raw_date.strftime("%Y-%m-%d")
            else:
                date_str = str(raw_date).strip()[:10]
            peso = float(row[c_peso])
            if peso <= 0 or peso > 300:
                skipped.append(f"{nome} {date_str}: peso inválido ({peso})")
                continue
            await db.weighins.insert_one({
                "id": new_id(),
                "athlete_id": aid,
                "date": date_str,
                "peso_kg": round(peso, 2),
                "created_at": now_iso(),
                "created_by": user["id"],
                "imported": True,
            })
            created += 1
        except Exception as e:
            skipped.append(f"linha inválida: {e}")

    return {"created": created, "skipped": skipped}


# ---------- Photos ----------
@api.get("/athletes/{aid}/photos")
async def list_photos(aid: str, _: dict = Depends(get_current_user)):
    docs = await db.photos.find({"athlete_id": aid, "is_deleted": {"$ne": True}}, {"_id": 0}).sort("date", 1).to_list(1000)
    return docs


@api.post("/athletes/{aid}/photos")
async def upload_photo(
    aid: str,
    file: UploadFile = File(...),
    date: str = Form(...),
    kind: str = Form(...),  # frontal | perfil | costas
    user: dict = Depends(require_editor),
):
    if kind not in ("frontal", "perfil", "costas"):
        raise HTTPException(status_code=400, detail="Tipo de foto inválido")
    data = await file.read()
    ext = (file.filename or "").split(".")[-1].lower() or "jpg"
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    ctype = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[ext]
    photo_id = new_id()
    path = f"{APP_NAME}/photos/{aid}/{photo_id}.{ext}"
    result = put_object(path, data, ctype)
    doc = {
        "id": photo_id,
        "athlete_id": aid,
        "date": date,
        "kind": kind,
        "storage_path": result["path"],
        "content_type": ctype,
        "size": result.get("size"),
        "is_deleted": False,
        "created_at": now_iso(),
        "created_by": user["id"],
    }
    await db.photos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/photos/{pid}/download")
async def download_photo(pid: str, request: Request, auth: Optional[str] = Query(None)):
    # Support token via query param for <img src>
    if auth and "access_token" not in request.cookies:
        request.cookies.__dict__["_dict"] if False else None  # no-op
    # Manual auth
    token = request.cookies.get("access_token") or auth
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    doc = await db.photos.find_one({"id": pid, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Foto não encontrada")
    data, ctype = get_object(doc["storage_path"])
    return FastAPIResponse(content=data, media_type=doc.get("content_type", ctype))


@api.delete("/photos/{pid}")
async def delete_photo(pid: str, _: dict = Depends(require_editor)):
    await db.photos.update_one({"id": pid}, {"$set": {"is_deleted": True}})
    return {"ok": True}


# ---------- Monthly report ----------
@api.get("/reports/monthly")
async def monthly_report(month_a: str, month_b: str, _: dict = Depends(get_current_user)):
    """month format YYYY-MM. Compara médias de peso, MG, IMC entre 2 meses."""
    athletes = await db.athletes.find({}, {"_id": 0}).to_list(1000)
    rows = []
    for a in athletes:
        eva = await _month_avg(a["id"], month_a)
        evb = await _month_avg(a["id"], month_b)
        rows.append({
            "athlete_id": a["id"],
            "nome": a["nome"],
            "sexo": a["sexo"],
            "month_a": eva,
            "month_b": evb,
            "delta": {
                "peso": _delta(eva.get("peso"), evb.get("peso")),
                "bf": _delta(eva.get("bf"), evb.get("bf")),
                "imc": _delta(eva.get("imc"), evb.get("imc")),
            },
        })
    return {"month_a": month_a, "month_b": month_b, "rows": rows}


def _delta(a: Any, b: Any):
    if a is None or b is None:
        return None
    return round(b - a, 2)


async def _month_avg(aid: str, month: str) -> dict:
    # month like "2026-01"
    start = f"{month}-01"
    end_year, end_month = map(int, month.split("-"))
    end_month += 1
    if end_month > 12:
        end_month = 1
        end_year += 1
    end = f"{end_year:04d}-{end_month:02d}-01"
    evs = await db.evaluations.find({
        "athlete_id": aid, "date": {"$gte": start, "$lt": end}
    }, {"_id": 0}).to_list(200)
    weighins = await db.weighins.find({
        "athlete_id": aid, "date": {"$gte": start, "$lt": end}
    }, {"_id": 0}).to_list(500)

    def avg(vals):
        vals = [v for v in vals if v is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    bf = avg([e.get("metrics", {}).get("rw") for e in evs])
    imc = avg([e.get("metrics", {}).get("imc") for e in evs])
    peso_ev = [e.get("peso_kg") for e in evs]
    peso_w = [w.get("peso_kg") for w in weighins]
    peso = avg(peso_ev + peso_w)
    return {"bf": bf, "imc": imc, "peso": peso, "n_eval": len(evs), "n_weighins": len(weighins)}


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.athletes.create_index("nome")
    await db.evaluations.create_index([("athlete_id", 1), ("date", -1)])
    await db.weighins.create_index([("athlete_id", 1), ("date", -1)])
    await db.photos.create_index([("athlete_id", 1), ("date", -1)])

    # Seed admin (editor)
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pwd = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "name": "Admin CD Trofense",
            "role": "editor",
            "active": True,
            "password_hash": hash_password(admin_pwd),
            "created_at": now_iso(),
        })
        logger.info("Admin seeded: %s", admin_email)
    elif not verify_password(admin_pwd, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_pwd), "active": True}},
        )
        logger.info("Admin password refreshed for %s", admin_email)

    # Init storage
    try:
        init_storage()
    except Exception as e:
        logger.warning("Storage init failed: %s", e)


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
