import calendar
from datetime import datetime, timedelta, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def add_months(dt: datetime, months: int) -> datetime:
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def advance_next_run(current: datetime, frequency: str) -> datetime:
    current = ensure_aware(current)
    if frequency == "daily":
        return current + timedelta(days=1)
    if frequency == "weekly":
        return current + timedelta(weeks=1)
    if frequency == "monthly":
        return add_months(current, 1)
    if frequency == "yearly":
        return add_months(current, 12)
    raise ValueError(f"Unknown frequency: {frequency}")


def compute_initial_next_run(anchor: datetime, frequency: str, *, now: datetime | None = None) -> datetime:
    candidate = ensure_aware(anchor)
    reference = ensure_aware(now or utcnow())
    while candidate <= reference:
        candidate = advance_next_run(candidate, frequency)
    return candidate
