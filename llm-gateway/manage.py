"""Local administrator CLI. No remote admin endpoints or hard-coded master key."""
import argparse
import json
import re
from pathlib import Path
from store import Store


def main():
    parser = argparse.ArgumentParser(description="Manage access to the local LLM gateway")
    commands = parser.add_subparsers(dest="command", required=True)
    for command in ("add", "rotate"):
        sub = commands.add_parser(command)
        sub.add_argument("user")
        sub.add_argument("--key-file", required=True, help="Private file for the new key; never printed")
        sub.add_argument("--days", type=int, default=30)
        if command == "add":
            sub.add_argument("--models", nargs="+", default=["qwen2.5:0.5b"])
            sub.add_argument("--rpm", type=int, default=10)
            sub.add_argument("--daily-limit", type=int, default=100)
    for command in ("enable", "disable"):
        commands.add_parser(command).add_argument("user")
    commands.add_parser("list")
    commands.add_parser("audit")
    args = parser.parse_args()
    store = Store()
    if args.command in ("add", "rotate"):
        if not re.fullmatch(r"[a-zA-Z0-9_.-]{1,64}", args.user) or not 1 <= args.days <= 365:
            parser.error("Use a simple user ID and an expiry between 1 and 365 days.")
        if args.command == "add" and (not 1 <= args.rpm <= 100 or not 1 <= args.daily_limit <= 10000 or any(not re.fullmatch(r"[a-zA-Z0-9_.:/-]{1,100}", m) for m in args.models)):
            parser.error("Invalid model or request limit.")
        path = Path(args.key_file).resolve()
        if path.exists():
            parser.error("Choose a new key file; existing credential files are never overwritten.")
        path.parent.mkdir(parents=True, exist_ok=True)
        token = store.add_user(args.user, args.models, args.rpm, args.daily_limit, args.days) if args.command == "add" else store.rotate(args.user, args.days)
        with path.open("x", encoding="utf-8") as handle:
            handle.write(token)
        print(f"Access key written to {path}. Keep it private.")
    elif args.command in ("enable", "disable"):
        store.set_enabled(args.user, args.command == "enable")
        print(f"{args.user}: {args.command}d")
    else:
        with store.connect() as db:
            query = "SELECT id,enabled,models,rpm,daily_limit,expires_at FROM users" if args.command == "list" else "SELECT * FROM requests ORDER BY created DESC LIMIT 50"
            print(json.dumps([dict(row) for row in db.execute(query)], indent=2))


if __name__ == "__main__":
    main()
