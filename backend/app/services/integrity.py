"""Helpers for turning DB IntegrityErrors into meaningful domain errors.

We let the INSERT/UPDATE hit the database and catch the IntegrityError instead of
pre-checking uniqueness, which would leave a check-then-insert race between two
concurrent requests. The constraint name in the error tells us what conflicted.
"""

from sqlalchemy.exc import IntegrityError


def constraint_name(error: IntegrityError) -> str:
    """Best-effort extraction of the violated constraint name.

    psycopg exposes it on diag.constraint_name; fall back to the message text so
    this still works under other drivers/databases (e.g. SQLite in a pinch).
    """
    orig = getattr(error, "orig", None)
    diag = getattr(orig, "diag", None)
    name = getattr(diag, "constraint_name", None)
    if name:
        return name
    return str(orig)
