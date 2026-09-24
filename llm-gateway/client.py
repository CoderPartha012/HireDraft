"""Call the secured API without putting credentials in command-line arguments."""
import argparse
import os
from pathlib import Path
import httpx

parser = argparse.ArgumentParser()
parser.add_argument("--key-file", type=Path, help="Read your private access key from this file")
parser.add_argument("--model", default="qwen2.5:0.5b")
parser.add_argument("--prompt", default="Write one short professional email greeting for a QA engineer application.")
parser.add_argument("--me", action="store_true")
args = parser.parse_args()
token = args.key_file.read_text(encoding="utf-8").strip() if args.key_file else os.environ.get("LLM_ACCESS_KEY", "")
if not token:
    parser.error("Provide --key-file or set LLM_ACCESS_KEY.")
with httpx.Client(base_url="http://127.0.0.1:8000", timeout=130, trust_env=False) as client:
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/v1/me", headers=headers) if args.me else client.post("/v1/chat/completions", headers=headers,
        json={"model": args.model, "messages": [{"role": "user", "content": args.prompt}], "max_tokens": 128})
    if not response.is_success:
        print(f"Request blocked or failed ({response.status_code}): {response.json().get('detail', 'Request failed')}")
        raise SystemExit(1)
    result = response.json()
    print(result if args.me else result["choices"][0]["message"]["content"])
