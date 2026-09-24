import time
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import create_app
from store import AccessError, Store

MODEL = "qwen2.5:0.5b"
BODY = {"model": MODEL, "messages": [{"role": "user", "content": "Hello"}]}


@pytest.fixture
def setup(tmp_path):
    store = Store(tmp_path / "test.sqlite3")
    token = store.add_user("alice", [MODEL])
    calls = []

    def upstream(request):
        calls.append(request)
        return httpx.Response(200, json={"message": {"content": "Hello Alice"}, "done": True,
                                         "prompt_eval_count": 12, "eval_count": 3})

    with TestClient(create_app(store, httpx.MockTransport(upstream))) as client:
        yield store, token, calls, client


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_success_and_usage(setup):
    store, token, calls, client = setup
    response = client.post("/v1/chat/completions", headers=headers(token), json=BODY)
    assert response.status_code == 200
    assert response.json()["choices"][0]["message"]["content"] == "Hello Alice"
    assert response.json()["usage"]["total_tokens"] == 15
    assert len(calls) == 1
    assert calls[0].url.path == "/api/chat"
    me = client.get("/v1/me", headers=headers(token)).json()
    assert me["requests_left_today"] == 99
    assert me["usage_today"]["output_tokens"] == 3
    assert "key_hash" not in me
    assert token not in store.path.read_bytes().decode(errors="ignore")


def test_structured_output_forwarded(setup):
    _, token, calls, client = setup
    schema = {"type": "object", "properties": {"subject": {"type": "string"}}}
    response = client.post("/v1/chat/completions", headers=headers(token), json={**BODY,
        "response_format": {"type": "json_schema", "json_schema": {"name": "email", "schema": schema}}})
    assert response.status_code == 200
    assert json.loads(calls[0].content)["format"] == schema


@pytest.mark.parametrize("case, status", [("missing", 401), ("invalid", 401), ("disabled", 403), ("expired", 401), ("model", 403)])
def test_denied_requests_never_reach_model(setup, case, status):
    store, token, calls, client = setup
    body = dict(BODY)
    auth = headers(token)
    if case == "missing":
        auth = {}
    elif case == "invalid":
        auth = headers("invalid")
    elif case == "disabled":
        store.set_enabled("alice", False)
    elif case == "expired":
        with store.connect() as db:
            db.execute("UPDATE users SET expires_at=?", (time.time() - 1,))
    elif case == "model":
        body["model"] = "unapproved:cloud"
    assert client.post("/v1/chat/completions", headers=auth, json=body).status_code == status
    assert calls == []
    assert store.usage("alice")["requests"] == 0


def test_rotate_and_reenable(setup):
    store, token, calls, client = setup
    store.set_enabled("alice", False)
    replacement = store.rotate("alice")
    assert client.get("/v1/me", headers=headers(token)).status_code == 401
    assert client.get("/v1/me", headers=headers(replacement)).status_code == 403
    store.set_enabled("alice", True)
    assert client.get("/v1/me", headers=headers(replacement)).status_code == 200
    assert not calls


@pytest.mark.parametrize("limit", ["rpm", "daily_limit"])
def test_limits_survive_restart(setup, limit):
    store, token, calls, client = setup
    with store.connect() as db:
        db.execute(f"UPDATE users SET {limit}=1")
    assert client.post("/v1/chat/completions", headers=headers(token), json=BODY).status_code == 200
    restarted = Store(store.path)
    with pytest.raises(AccessError) as error:
        restarted.admit(token, MODEL)
    assert error.value.status == 429
    assert len(calls) == 1


def test_concurrency_and_release(setup):
    store, token, _, _ = setup
    second = store.add_user("bob", [MODEL])
    third = store.add_user("carol", [MODEL])
    request_id, _ = store.admit(token, MODEL)
    with pytest.raises(AccessError):
        store.admit(token, MODEL)
    store.admit(second, MODEL)
    with pytest.raises(AccessError):
        store.admit(third, MODEL)
    store.finish(request_id, "failed")
    assert store.admit(third, MODEL)


@pytest.mark.parametrize("status, payload, expected", [(404, {}, 503), (500, {}, 502), (200, [], 502), (200, {"message": None}, 502), (200, {"message": {"content": ""}, "done": True}, 502)])
def test_upstream_errors_release_request(setup, status, payload, expected):
    store, token, _, _ = setup
    transport = httpx.MockTransport(lambda request: httpx.Response(status, json=payload))
    with TestClient(create_app(store, transport)) as client:
        assert client.post("/v1/chat/completions", headers=headers(token), json=BODY).status_code == expected
    with store.connect() as db:
        assert db.execute("SELECT status FROM requests").fetchone()[0] == "failed"
    assert store.admit(token, MODEL)


@pytest.mark.parametrize("exception, expected", [(httpx.ReadTimeout, 504), (httpx.ConnectError, 503)])
def test_connection_failures(setup, exception, expected):
    store, token, _, _ = setup
    def fail(request):
        raise exception("internal upstream details")
    with TestClient(create_app(store, httpx.MockTransport(fail))) as client:
        response = client.post("/v1/chat/completions", headers=headers(token), json=BODY)
        assert response.status_code == expected
        assert "internal upstream" not in response.text


def test_input_bounds_and_public_health(setup):
    _, token, calls, client = setup
    assert client.get("/health").status_code == 200
    assert client.post("/v1/chat/completions", headers=headers(token), json={**BODY, "stream": True}).status_code == 422
    assert client.post("/v1/chat/completions", headers=headers(token), json={**BODY, "max_tokens": 99999}).status_code == 422
    assert client.post("/v1/chat/completions", headers=headers(token), content=b"x" * 80001).status_code == 413
    assert client.post("/v1/chat/completions", headers=headers(token), content=iter([b"x" * 40001, b"x" * 40001])).status_code == 413
    assert calls == []


def test_upstream_cannot_be_remote(setup, monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "https://example.com")
    with pytest.raises(RuntimeError):
        create_app(setup[0])
