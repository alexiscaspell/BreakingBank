"""Parse bank/wallet Android notification title+body into normalized fields."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone

from app.constants.integration_presets import PACKAGE_TO_SOURCE

AMOUNT_RE = re.compile(
    r"(?:\$|ARS)\s*(-?\d{1,3}(?:\.\d{3})*(?:,\d{2})?|-?\d+(?:,\d{2})?)",
    re.IGNORECASE,
)
AMOUNT_FALLBACK_RE = re.compile(
    r"(-?\d{1,3}(?:\.\d{3})+,\d{2}|-?\d+,\d{2}|-?\d{1,3}(?:\.\d{3})+)",
)

OUT_VERBS = (
    "transferiste",
    "transferencia enviada",
    "enviaste",
    "pagaste",
    "pago realizado",
    "compraste",
    "débito",
    "debito",
    "consumiste",
    "extracción",
    "extraccion",
)
IN_VERBS = (
    "recibiste",
    "recibido",
    "te acreditaron",
    "ingreso",
    "depósito",
    "deposito",
    "transferencia recibida",
)


@dataclass
class ParsedNotification:
    source: str
    amount: float | None
    direction: str
    alias: str | None
    name: str | None
    cbu: str | None
    cvu: str | None
    cuit: str | None


def parse_ars_amount(text: str) -> float | None:
    cleaned = text.replace("\xa0", " ")
    matches = list(AMOUNT_RE.finditer(cleaned))
    if not matches:
        matches = list(AMOUNT_FALLBACK_RE.finditer(cleaned))
    if not matches:
        return None
    raw = matches[-1].group(1).strip()
    if "," in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"-?\d{1,3}(?:\.\d{3})+", raw):
        raw = raw.replace(".", "")
    try:
        return abs(float(raw))
    except ValueError:
        return None


def infer_direction(text: str) -> str:
    lower = text.lower()
    for verb in IN_VERBS:
        if verb in lower:
            return "in"
    for verb in OUT_VERBS:
        if verb in lower:
            return "out"
    return "out"


def extract_alias(text: str) -> str | None:
    patterns = [
        r"(?:a|a favor de|hacia|para)\s+([a-z0-9._-]{3,}\.[a-z0-9._-]{2,})",
        r"alias[:\s]+([a-z0-9._-]{3,})",
        r"@([a-z0-9._-]{3,})",
    ]
    lower = text.lower()
    for pat in patterns:
        m = re.search(pat, lower, re.IGNORECASE)
        if m:
            return m.group(1).strip().lower()
    return None


def extract_name(text: str) -> str | None:
    patterns = [
        r"(?:transferiste a|pagaste a|enviaste a|a favor de|recibiste de)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .'-]{3,60})",
        r"(?:comercio|en)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .'-]{3,60})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip(" .,-")
            # stop at amount / currency fragments
            name = re.split(r"\s+\$|\s+ARS|\s+por\s+", name, maxsplit=1)[0].strip()
            if name and not re.fullmatch(r"[\d.,\s$]+", name):
                return name[:200]
    return None


def extract_cbu_cvu(text: str) -> tuple[str | None, str | None]:
    digits = re.sub(r"\D", " ", text)
    for token in digits.split():
        if len(token) == 22:
            # CVU often starts with 000
            if token.startswith("000"):
                return None, token
            return token, None
    return None, None


def extract_cuit(text: str) -> str | None:
    m = re.search(r"\b(\d{2}-?\d{8}-?\d)\b", text)
    if not m:
        return None
    return re.sub(r"\D", "", m.group(1))


def parse_notification(*, android_package: str, title: str | None, text: str | None) -> ParsedNotification | None:
    source = PACKAGE_TO_SOURCE.get(android_package)
    if not source:
        return None
    blob = f"{title or ''} {text or ''}".strip()
    if not blob:
        return ParsedNotification(
            source=source,
            amount=None,
            direction="out",
            alias=None,
            name=None,
            cbu=None,
            cvu=None,
            cuit=None,
        )
    cbu, cvu = extract_cbu_cvu(blob)
    return ParsedNotification(
        source=source,
        amount=parse_ars_amount(blob),
        direction=infer_direction(blob),
        alias=extract_alias(blob),
        name=extract_name(blob),
        cbu=cbu,
        cvu=cvu,
        cuit=extract_cuit(blob),
    )


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
