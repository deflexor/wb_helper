"""FastAPI entrypoint for LLM and vector workflows (OpenRouter, Qdrant)."""

from fastapi import FastAPI

app = FastAPI(title="WB Helper AI Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
