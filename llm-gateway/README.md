# Local Ollama access-control test

HireDraft now offers **Ollama · local test (qwen2.5:0.5b)** in its AI provider selector.
The cloud providers remain available. Ollama requests go through this authenticated gateway.
The Markdown toolbar in HireDraft now includes formatting icons.

The request path is: Python client → FastAPI permission check → local Ollama model.
Each test user gets a different expiring Bearer key. Disabled users, invalid keys, unapproved
models and requests over quota are rejected before Ollama is called.

## Use Ollama inside HireDraft

From the HireDraft root, start the gateway in one PowerShell terminal:

```powershell
npm.cmd run llm
```

If port 8000 is already running, use that existing gateway. In another terminal:

```powershell
npm.cmd run dev
```

Open http://localhost:3000, review the job and resume, then select **Ollama · local test**
under **AI provider** in the email step and generate the email. Ollama must be running.
Restart Next.js after changing `.env` so it loads the gateway credential.

This machine has a dedicated `hiredraft-local` gateway user whose key is configured in the
private root `.env` as `OLLAMA_GATEWAY_API_KEY`. It is used only by the Next.js server.
To block/allow this integration, run from `llm-gateway`:

```powershell
.\.venv\Scripts\python.exe manage.py disable hiredraft-local
.\.venv\Scripts\python.exe manage.py enable hiredraft-local
```

This is one shared local-test identity for the website, not per-visitor authentication.
Use only on your own machine until real application sign-in is integrated. The model is
small and can produce weak drafts or fail HireDraft's existing factual verification;
those checks remain enabled. Longer contexts above the local limit return a clear error.
The integration forwards JSON schemas to Ollama for structured draft and audit output
([Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)).

## Start and try it (PowerShell)

From the HireDraft project folder:

```powershell
cd llm-gateway
.\start.ps1
```

Keep that terminal open. If PowerShell blocks the script, run its command directly:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --no-access-log
```

Open http://127.0.0.1:8000/docs for interactive API documentation.
`GET /health` is public and checks the gateway only; a chat request tests the model.
In another terminal, from `llm-gateway`:

```powershell
# Allowed: generates a short response from the local model
.\.venv\Scripts\python.exe client.py --key-file private/demo-allowed.key --prompt "Write a short greeting for a job application email."

# Blocked: HTTP 403, no LLM request
.\.venv\Scripts\python.exe client.py --key-file private/demo-blocked.key

# View remaining daily requests and measured token usage
.\.venv\Scripts\python.exe client.py --key-file private/demo-allowed.key --me

# Temporarily block the allowed user; repeat the first request to see HTTP 403
.\.venv\Scripts\python.exe manage.py disable demo-allowed
.\.venv\Scripts\python.exe manage.py enable demo-allowed
```

The client reads credentials from private files without displaying them. In Swagger's
**Authorize** dialog, enter the contents of your private key file (without the Bearer prefix).
Do not commit, share, or put these keys in frontend code. Ctrl+C stops the gateway.

## Add and manage users

```powershell
.\.venv\Scripts\python.exe manage.py add alice --key-file private/alice.key --models qwen2.5:0.5b --rpm 10 --daily-limit 100 --days 30
.\.venv\Scripts\python.exe manage.py disable alice
.\.venv\Scripts\python.exe manage.py enable alice
.\.venv\Scripts\python.exe manage.py rotate alice --key-file private/alice-new.key
.\.venv\Scripts\python.exe manage.py list
.\.venv\Scripts\python.exe manage.py audit
```

Rotation immediately invalidates the previous key. Disabling prevents subsequent requests;
it does not cancel an inference already in progress. Administrative commands require local
filesystem access; there is no public administration endpoint. The SQLite database stores
key hashes and request metadata, not raw keys, prompts or generated responses.

Limits persist across restarts: rolling one-minute quota, daily quota resetting at midnight
UTC, one in-flight request per user and two globally. Accepted upstream failures count toward
quota. Permission denials do not. Input and output sizes and upstream timeouts are bounded.
There is no fixed "tokens left" balance for a local model; `/v1/me` reports tokens used and
requests left under the configured daily quota.

## Fresh environment setup

Python 3.12 and `uv` were used for this setup. From the project root:

```powershell
uv venv llm-gateway/.venv --python 3.12
uv pip install --python llm-gateway/.venv/Scripts/python.exe -r llm-gateway/requirements.txt
irm https://ollama.com/install.ps1 | iex
```

Open a new terminal after installation, then:

```powershell
ollama pull qwen2.5:0.5b
cd llm-gateway
.\.venv\Scripts\python.exe manage.py add demo-allowed --key-file private/demo-allowed.key
.\.venv\Scripts\python.exe manage.py add demo-blocked --key-file private/demo-blocked.key
.\.venv\Scripts\python.exe manage.py disable demo-blocked
.\start.ps1
```

The small model is for testing the workflow on this computer, not a promise of production
email quality. If Ollama is stopped, start the Ollama application or run `ollama serve` in
a separate terminal. A missing model returns 503; pull it with the command above.

## Tests

```powershell
cd llm-gateway
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe smoke_test.py
```

Unit/API tests use a mock upstream and prove denied requests never reach it. The smoke test
requires the running gateway, installed model and the two demo keys. It makes one real
generation, verifies 401/403 failures, and checks usage without printing credentials.

## Local security boundary

Both services must remain bound to loopback. Ollama's local API has no authentication;
someone with access to this computer can call its port 11434 directly. This gateway is a
local access-control demonstration, not protection against other local OS users. For a
multi-user deployment, isolate Ollama on a private network, expose only the authenticated
gateway over HTTPS, and integrate your application's verified user identities. Do not
expose port 11434 publicly or treat browser-supplied user IDs as authentication.

References: [Ollama authentication](https://docs.ollama.com/api/authentication),
[Ollama chat API](https://docs.ollama.com/api/chat),
[FastAPI security](https://fastapi.tiangolo.com/tutorial/security/).
