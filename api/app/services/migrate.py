from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


GROUP_SCOPED_TABLES = (
    "accounts",
    "categories",
    "labels",
    "transactions",
    "transfers",
    "recurring_payments",
    "reminders",
)


async def _column_exists(conn: AsyncConnection, table: str, column: str) -> bool:
    result = await conn.execute(text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result.fetchall())


async def _table_exists(conn: AsyncConnection, table: str) -> bool:
    result = await conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table},
    )
    return result.scalar_one_or_none() is not None


async def migrate_schema(conn: AsyncConnection) -> None:
    if not await _table_exists(conn, "users"):
        return

    for table in GROUP_SCOPED_TABLES:
        if not await _table_exists(conn, table):
            continue
        if not await _column_exists(conn, table, "group_id"):
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN group_id VARCHAR(36)"))

    if not await _column_exists(conn, "users", "active_group_id"):
        await conn.execute(text("ALTER TABLE users ADD COLUMN active_group_id VARCHAR(36)"))

    recurring_columns = (
        ("type", "VARCHAR(20) DEFAULT 'expense'"),
        ("comment", "TEXT"),
        ("label_ids", "VARCHAR(500)"),
    )
    if await _table_exists(conn, "recurring_payments"):
        for column, ddl in recurring_columns:
            if not await _column_exists(conn, "recurring_payments", column):
                await conn.execute(text(f"ALTER TABLE recurring_payments ADD COLUMN {column} {ddl}"))

    reminder_columns = (
        ("recurring_payment_id", "VARCHAR(36)"),
        ("payload", "TEXT"),
    )
    if await _table_exists(conn, "reminders"):
        for column, ddl in reminder_columns:
            if not await _column_exists(conn, "reminders", column):
                await conn.execute(text(f"ALTER TABLE reminders ADD COLUMN {column} {ddl}"))

    # Personal group per user that still has rows without group_id.
    users = await conn.execute(text("SELECT id, username FROM users"))
    for user_id, username in users.fetchall():
        personal = await conn.execute(
            text("SELECT id FROM groups WHERE created_by = :uid AND name LIKE :pat LIMIT 1"),
            {"uid": user_id, "pat": f"{username}'s group"},
        )
        group_id = personal.scalar_one_or_none()
        if not group_id:
            group_id = str(__import__("uuid").uuid4())
            await conn.execute(
                text("INSERT INTO groups (id, name, created_by) VALUES (:id, :name, :uid)"),
                {"id": group_id, "name": f"{username}'s group", "uid": user_id},
            )
            await conn.execute(
                text(
                    "INSERT OR IGNORE INTO group_members (id, group_id, user_id, role) "
                    "VALUES (:id, :gid, :uid, 'owner')"
                ),
                {"id": str(__import__("uuid").uuid4()), "gid": group_id, "uid": user_id},
            )

        for table in GROUP_SCOPED_TABLES:
            if not await _table_exists(conn, table):
                continue
            await conn.execute(
                text(f"UPDATE {table} SET group_id = :gid WHERE user_id = :uid AND group_id IS NULL"),
                {"gid": group_id, "uid": user_id},
            )

        await conn.execute(
            text("UPDATE users SET active_group_id = :gid WHERE id = :uid AND active_group_id IS NULL"),
            {"gid": group_id, "uid": user_id},
        )
