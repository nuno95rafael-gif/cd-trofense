"""Legacy object storage helper (kept only for one-time migration).

Photos are now stored as base64 directly in MongoDB (`photos.data_base64`).
This module still exposes `get_object` so that the startup migration can
fetch legacy photos out of Emergent Object Storage and inline them into
the DB. Once every photo has been migrated it stops being used.
"""
import os
import requests
import logging

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "trofense")

_storage_key: str | None = None


def init_storage() -> str | None:
    """Initialize storage. Returns key on success, None on failure (non-fatal)."""
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        return None
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=15,
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Legacy object storage initialized (for migration)")
        return _storage_key
    except Exception as e:
        logger.warning("Legacy storage unavailable: %s", e)
        return None


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key:
        raise RuntimeError("Legacy storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def content_type_for(ext: str) -> str:
    ext = (ext or "").lower().lstrip(".")
    return {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
    }.get(ext, "image/jpeg")
