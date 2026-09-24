"""Explicit live test: one small generation; never print access keys."""
from pathlib import Path
import httpx

root = Path(__file__).parent
allowed = (root / "private/demo-allowed.key").read_text().strip()
blocked = (root / "private/demo-blocked.key").read_text().strip()
body = {"model": "qwen2.5:0.5b", "messages": [{"role": "user", "content": "Say hello in one short sentence."}], "max_tokens": 32}

with httpx.Client(base_url="http://127.0.0.1:8000", timeout=130, trust_env=False) as client:
    assert client.get("/health").status_code == 200
    print("PASS: gateway health")
    for name, token, status in [("missing key", None, 401), ("invalid key", "invalid", 401), ("blocked user", blocked, 403)]:
        response = client.post("/v1/chat/completions", json=body, headers={"Authorization": f"Bearer {token}"} if token else {})
        assert response.status_code == status, f"{name}: expected {status}, got {response.status_code}"
        print(f"PASS: {name} rejected ({status})")
    auth = {"Authorization": f"Bearer {allowed}"}
    response = client.post("/v1/chat/completions", json=body, headers=auth)
    assert response.status_code == 200, f"Generation failed: {response.status_code} {response.text}"
    print("PASS: real model response:", response.json()["choices"][0]["message"]["content"])
    print("Token usage:", response.json()["usage"])
    response = client.get("/v1/me", headers=auth)
    assert response.status_code == 200
    print("Requests left today:", response.json()["requests_left_today"])
