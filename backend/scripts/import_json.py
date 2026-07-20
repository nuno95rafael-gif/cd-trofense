"""Import legacy Trofense backup JSON into the new database.

Uso:
    python3 /app/backend/scripts/import_json.py /tmp/import/backup.json [--wipe]

- Mapeia sexo 1→M, 0→F; etnia 0→caucasiano, 1→africano.
- Converte altura (m) → cm.
- Cria atletas, avaliações (com métricas calculadas) e faz upload das
  3 fotos (frente/perfil/costas) por avaliação para o object storage.
- Se targetMg está no JSON, define goal.bf_target_pct = targetMg * 100.
"""
import asyncio
import base64
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
import json

from formulas import compute_all
from storage import put_object, APP_NAME

ETH_MAP = {0: "caucasiano", 1: "africano", 2: "asiatico", 3: "hispanico"}
SEX_MAP = {1: "M", 0: "F"}
KIND_MAP = {"frente": "frontal", "perfil": "perfil", "costas": "costas"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def decode_data_url(s: str) -> tuple[bytes, str, str]:
    # returns (bytes, content_type, ext)
    if not s.startswith("data:"):
        return b"", "application/octet-stream", "bin"
    header, b64 = s.split(",", 1)
    ctype = header.split(";")[0].removeprefix("data:") or "image/jpeg"
    ext = "jpg" if "jpeg" in ctype or "jpg" in ctype else ctype.split("/")[-1]
    return base64.b64decode(b64), ctype, ext


async def run(path: str, wipe: bool, admin_email: str):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = mongo[os.environ["DB_NAME"]]

    admin = await db.users.find_one({"email": admin_email})
    admin_id = admin["id"] if admin else "import"

    if wipe:
        print("--wipe: removing athletes, evaluations, weighins, photos")
        await db.athletes.delete_many({})
        await db.evaluations.delete_many({})
        await db.weighins.delete_many({})
        await db.photos.delete_many({})

    target_mg = data.get("mainData", {}).get("targetMg")
    target_pct = round(target_mg * 100, 2) if target_mg else None

    athletes = data["mainData"]["athletes"]
    photos_by_athlete = data.get("photos", {})

    stats = {"athletes": 0, "evaluations": 0, "photos": 0, "skipped": []}

    for a in athletes:
        old_id = a["id"]
        # skip if athlete with same name already exists
        exists = await db.athletes.find_one({"nome": a["nome"]})
        if exists:
            print(f"skip: {a['nome']} já existe")
            stats["skipped"].append(a["nome"])
            continue

        obs = a.get("observacoes", {}) or {}
        athlete_doc = {
            "id": new_id(),
            "nome": a["nome"],
            "posicao": None,
            "sexo": SEX_MAP.get(a.get("sexo", 1), "M"),
            "etnia": ETH_MAP.get(a.get("etnia", 0), "caucasiano"),
            "altura_cm": round(float(a["altura"]) * 100, 1) if a.get("altura") else None,
            "idade": a.get("idade"),
            "peso_normal_kg": _parse_first_num(obs.get("peso_normal")),
            "dieta": obs.get("dieta") or None,
            "agua_l": _parse_first_num(obs.get("agua")),
            "suplementacao": obs.get("suplementacao") or None,
            "cafeina": obs.get("cafeina") or None,
            "preferencia_jogo": obs.get("pref_dia_jogo") or None,
            "sono_h": _parse_first_num(obs.get("sono")),
            "notas": _build_notes(obs),
            "goal": {"bf_target_pct": target_pct, "updated_at": now_iso()} if target_pct else None,
            "created_at": now_iso(),
            "created_by": admin_id,
        }
        await db.athletes.insert_one(dict(athlete_doc))
        stats["athletes"] += 1
        print(f"+ atleta: {athlete_doc['nome']}")

        # evaluations
        for ev in a.get("evaluations", []):
            ev_doc = {
                "id": new_id(),
                "athlete_id": athlete_doc["id"],
                "date": ev.get("date"),
                "peso_kg": ev.get("peso"),
                "age_at_eval": ev.get("idade"),
                "pregas": ev.get("pregas", {}) or {},
                "perimetros": ev.get("perimetros", {}) or {},
                "notas": None,
                "created_at": now_iso(),
                "created_by": admin_id,
            }
            ev_doc["metrics"] = compute_all(ev_doc, athlete_doc)
            await db.evaluations.insert_one(dict(ev_doc))
            stats["evaluations"] += 1

            # photos for this eval
            eval_photos = photos_by_athlete.get(old_id, {}).get(ev["id"], {})
            if isinstance(eval_photos, dict):
                for old_kind, data_url in eval_photos.items():
                    if not data_url:
                        continue
                    new_kind = KIND_MAP.get(old_kind, old_kind)
                    if new_kind not in ("frontal", "perfil", "costas"):
                        continue
                    try:
                        payload, ctype, ext = decode_data_url(data_url)
                        if not payload:
                            continue
                        photo_id = new_id()
                        path_ = f"{APP_NAME}/photos/{athlete_doc['id']}/{photo_id}.{ext}"
                        result = put_object(path_, payload, ctype)
                        await db.photos.insert_one({
                            "id": photo_id,
                            "athlete_id": athlete_doc["id"],
                            "date": ev_doc["date"],
                            "kind": new_kind,
                            "storage_path": result["path"],
                            "content_type": ctype,
                            "size": result.get("size", len(payload)),
                            "is_deleted": False,
                            "created_at": now_iso(),
                            "created_by": admin_id,
                        })
                        stats["photos"] += 1
                    except Exception as e:
                        print(f"  ! foto {old_kind} falhou: {e}")

    print("\n== RESULTADO ==")
    print(f"Atletas importados: {stats['athletes']}")
    print(f"Avaliações: {stats['evaluations']}")
    print(f"Fotos: {stats['photos']}")
    if stats["skipped"]:
        print(f"Ignorados (já existiam): {', '.join(stats['skipped'])}")
    mongo.close()


def _parse_first_num(s):
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    import re
    m = re.search(r"(\d+(?:[.,]\d+)?)", str(s))
    return float(m.group(1).replace(",", ".")) if m else None


def _build_notes(obs: dict) -> str | None:
    parts = []
    for k in ("nao_gosta", "intervalo", "sabor_batido"):
        v = obs.get(k)
        if v:
            parts.append(f"{k.replace('_', ' ').capitalize()}: {v}")
    return " | ".join(parts) if parts else None


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path")
    ap.add_argument("--wipe", action="store_true")
    ap.add_argument("--admin-email", default=os.environ.get("ADMIN_EMAIL", "admin@trofense.pt"))
    args = ap.parse_args()
    asyncio.run(run(args.json_path, args.wipe, args.admin_email))
