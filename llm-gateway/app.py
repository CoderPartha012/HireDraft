"""Test-only local gateway. All LLM routes require an individually issued access key."""
import asyncio
import json
import os
import time
from contextlib import asynccontextmanager
from typing import Annotated, Literal

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, model_validator

from store import AccessError, Store


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=30000)


class ChatInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model: str = Field(default="qwen2.5:0.5b", min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_.:/-]+$")
    messages: list[Message] = Field(min_length=1, max_length=16)
    max_tokens: int = Field(default=256, ge=1, le=1024)
    temperature: float = Field(default=0.3, ge=0, le=2)
    stream: Literal[False] = False
    response_format: "ResponseFormat | None" = None

    @model_validator(mode="after")
    def bound_context(self):
        if sum(len(message.content) for message in self.messages) > 32000:
            raise ValueError("Combined message content exceeds 32000 characters")
        return self


class JsonSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(max_length=64)
    schema_: dict = Field(alias="schema")


class ResponseFormat(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["json_schema"]
    json_schema: JsonSchema


ChatInput.model_rebuild()


bearer = HTTPBearer(auto_error=False)


def access_key(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if not credentials or len(credentials.credentials) > 256:
        raise HTTPException(401, "A Bearer access key is required.", headers={"WWW-Authenticate": "Bearer"})
    return credentials.credentials


def create_app(store=None, transport=None):
    store = store or Store()
    # No client-controlled upstream URL. Keep Ollama loopback-only for this local test.
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    if ollama_url not in {"http://127.0.0.1:11434", "http://localhost:11434"}:
        raise RuntimeError("This local test gateway only accepts a loopback Ollama URL.")

    @asynccontextmanager
    async def lifespan(app):
        async with httpx.AsyncClient(base_url=ollama_url, timeout=120, transport=transport, trust_env=False) as client:
            app.state.ollama = client
            yield

    app = FastAPI(title="HireDraft local LLM access test", version="1.0.0", lifespan=lifespan)

    @app.exception_handler(AccessError)
    async def denied(request, exc):
        return JSONResponse({"detail": exc.message}, status_code=exc.status,
                            headers={"Cache-Control": "no-store", **({"WWW-Authenticate": "Bearer"} if exc.status == 401 else {})})

    # Stream-count the request body before JSON parsing to reject oversized/chunked input.
    @app.middleware("http")
    async def bound_request(request: Request, call_next):
        if request.method == "POST":
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 80000:
                    return JSONResponse({"detail": "Request body is too large."}, status_code=413)
                chunks.append(chunk)
            request._body = b"".join(chunks)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "hiredraft-llm-gateway"}

    @app.get("/v1/me")
    def me(token: Annotated[str, Depends(access_key)]):
        user = store.authorize(token)
        usage = store.usage(user["id"])
        return {"user_id": user["id"], "allowed_models": json.loads(user["models"]),
                "requests_per_minute": user["rpm"], "daily_request_limit": user["daily_limit"],
                "requests_left_today": max(0, user["daily_limit"] - usage["requests"]), "usage_today": usage}

    @app.post("/v1/chat/completions")
    async def chat(body: ChatInput, token: Annotated[str, Depends(access_key)]):
        request_id, _ = store.admit(token, body.model)
        outcome = "failed"
        input_tokens = output_tokens = 0
        try:
            async with asyncio.timeout(120):
                response = await app.state.ollama.post("/api/chat", json={
                    "model": body.model, "messages": [message.model_dump() for message in body.messages],
                    "stream": False, "keep_alive": "2m",
                    **({"format": body.response_format.json_schema.schema_} if body.response_format else {}),
                    "options": {"num_predict": body.max_tokens, "temperature": body.temperature, "num_ctx": 16384},
                })
            if response.status_code == 404:
                raise HTTPException(503, "The allowed model is not installed in Ollama yet.")
            if not response.is_success:
                raise HTTPException(502, "Ollama could not complete this request.")
            result = response.json()
            if not isinstance(result, dict) or not isinstance(result.get("message"), dict):
                raise HTTPException(502, "Ollama returned an invalid response.")
            content = result.get("message", {}).get("content")
            if not isinstance(content, str) or not content.strip() or not result.get("done"):
                raise HTTPException(502, "Ollama returned an incomplete response.")
            input_tokens = max(0, int(result.get("prompt_eval_count", 0)))
            output_tokens = max(0, int(result.get("eval_count", 0)))
            outcome = "completed"
            return {"id": request_id, "object": "chat.completion", "created": int(time.time()), "model": body.model,
                    "choices": [{"index": 0, "message": {"role": "assistant", "content": content},
                                 "finish_reason": "length" if result.get("done_reason") == "length" else "stop"}],
                    "usage": {"prompt_tokens": input_tokens, "completion_tokens": output_tokens, "total_tokens": input_tokens + output_tokens}}
        except (TimeoutError, httpx.TimeoutException):
            raise HTTPException(504, "The local model timed out. Try a shorter prompt.") from None
        except httpx.RequestError:
            raise HTTPException(503, "Ollama is not reachable. Start Ollama and try again.") from None
        except (ValueError, TypeError):
            raise HTTPException(502, "Ollama returned an invalid response.") from None
        finally:
            store.finish(request_id, outcome, input_tokens, output_tokens)

    return app


app = create_app()
