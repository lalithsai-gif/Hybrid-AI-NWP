import os
import sys

# Ensure root directory is in sys.path so backend and ml_artifacts can be imported
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.main import app as fastapi_app

async def app(scope, receive, send):
    """
    Vercel Serverless Function ASGI Entrypoint.
    Normalizes incoming request path so both '/api/endpoint' and '/endpoint'
    match the registered FastAPI routes seamlessly on Vercel's Python runtime.
    """
    if scope.get("type") == "http":
        path = scope.get("path", "")
        if not path.startswith("/api"):
            scope = dict(scope)
            scope["path"] = f"/api{path}"
    await fastapi_app(scope, receive, send)
