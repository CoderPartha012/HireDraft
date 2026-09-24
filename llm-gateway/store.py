"""Local access policy and metadata-only audit records. Never store prompts or raw keys."""
import hashlib
import json
import os
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

DEFAULT_DB = Path(__file__).parent / "private" / "gateway.sqlite3"


class AccessError(Exception):
    def __init__(self, status: int, message: str):
        self.status, self.message = status, message


class Store:
    def __init__(self, path=None):
        self.path = Path(path or os.environ.get("GATEWAY_DB", DEFAULT_DB))
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                  id TEXT PRIMARY KEY, key_hash TEXT UNIQUE NOT NULL,
                  enabled INTEGER NOT NULL, models TEXT NOT NULL,
                  rpm INTEGER NOT NULL, daily_limit INTEGER NOT NULL,
                  expires_at REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS requests (
                  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, model TEXT NOT NULL,
                  created REAL NOT NULL, status TEXT NOT NULL,
                  input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0);
                CREATE INDEX IF NOT EXISTS request_user_time ON requests(user_id, created);
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def digest(token):
        return hashlib.sha256(token.encode()).hexdigest()

    def add_user(self, user_id, models, rpm=10, daily_limit=100, days=30):
        token = "hd_" + secrets.token_urlsafe(32)
        with self.connect() as db:
            db.execute("INSERT INTO users VALUES (?, ?, 1, ?, ?, ?, ?)",
                       (user_id, self.digest(token), json.dumps(models), rpm, daily_limit, time.time() + days * 86400))
        return token

    def set_enabled(self, user_id, enabled):
        with self.connect() as db:
            if not db.execute("UPDATE users SET enabled=? WHERE id=?", (int(enabled), user_id)).rowcount:
                raise ValueError("User not found")

    def rotate(self, user_id, days=30):
        token = "hd_" + secrets.token_urlsafe(32)
        with self.connect() as db:
            if not db.execute("UPDATE users SET key_hash=?, expires_at=? WHERE id=?",
                              (self.digest(token), time.time() + days * 86400, user_id)).rowcount:
                raise ValueError("User not found")
        return token

    def authorize(self, token, db=None):
        if db is None:
            with self.connect() as connection:
                return self.authorize(token, connection)
        user = db.execute("SELECT * FROM users WHERE key_hash=?", (self.digest(token),)).fetchone()
        if user is None or user["expires_at"] <= time.time():
            raise AccessError(401, "Invalid or expired access key.")
        if not user["enabled"]:
            raise AccessError(403, "Your LLM access is disabled.")
        return dict(user)

    def admit(self, token, model):
        now = time.time()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            user = self.authorize(token, db)
            if model not in json.loads(user["models"]):
                raise AccessError(403, "This model is not permitted for your user.")
            # Requests have a 120-second total timeout; expired leases survive restarts safely.
            db.execute("UPDATE requests SET status='expired' WHERE status='pending' AND created<?", (now - 150,))
            recent = db.execute("SELECT COUNT(*) FROM requests WHERE user_id=? AND created>?", (user["id"], now - 60)).fetchone()[0]
            today = db.execute("SELECT COUNT(*) FROM requests WHERE user_id=? AND created>=?", (user["id"], now - now % 86400)).fetchone()[0]
            if recent >= user["rpm"] or today >= user["daily_limit"]:
                raise AccessError(429, "Your request limit has been reached.")
            busy = db.execute("SELECT user_id FROM requests WHERE status='pending'").fetchall()
            if len(busy) >= 2 or any(row["user_id"] == user["id"] for row in busy):
                raise AccessError(429, "An LLM request is already running. Try again after it finishes.")
            request_id = str(uuid.uuid4())
            db.execute("INSERT INTO requests(id,user_id,model,created,status) VALUES(?,?,?,?,'pending')",
                       (request_id, user["id"], model, now))
            return request_id, user["id"]

    def finish(self, request_id, status, input_tokens=0, output_tokens=0):
        with self.connect() as db:
            db.execute("UPDATE requests SET status=?,input_tokens=?,output_tokens=? WHERE id=?",
                       (status, input_tokens, output_tokens, request_id))

    def usage(self, user_id):
        now = time.time()
        with self.connect() as db:
            row = db.execute("SELECT COUNT(*) requests,COALESCE(SUM(input_tokens),0) input_tokens,COALESCE(SUM(output_tokens),0) output_tokens FROM requests WHERE user_id=? AND created>=?",
                             (user_id, now - now % 86400)).fetchone()
            return dict(row)
