import os
import sys

# Ensure current, parent, and grandparent directories are in sys.path
# so backend and ml_artifacts can be imported regardless of Vercel root directory setting
cur_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(cur_dir, ".."))
grandparent_dir = os.path.abspath(os.path.join(cur_dir, "../.."))

for d in [parent_dir, grandparent_dir, cur_dir]:
    if os.path.exists(d) and d not in sys.path:
        sys.path.insert(0, d)

from backend.app.main import app as fastapi_app

async def app(scope, receive, send):
    """
    Vercel Serverless Function ASGI Entrypoint.
    Normalizes incoming request path so both '/api/endpoint', '/endpoint',
    and rewritten '/api/index.py' routes match registered FastAPI routes seamlessly.
    """
    if scope.get("type") == "http":
        path = scope.get("path", "")

        # If Vercel rewrites directly to the handler filename
        if path in ("/api/index.py", "/api/index", "/api/index/", "/api", "/api/"):
            headers = dict(scope.get("headers", []))
            matched = headers.get(b"x-matched-path", b"").decode("utf-8")
            if not matched:
                matched = headers.get(b"x-forwarded-uri", b"").decode("utf-8")
            if not matched:
                matched = headers.get(b"x-original-url", b"").decode("utf-8")
            if matched:
                path = matched.split("?")[0]

        # Ensure path begins with /api for FastAPI route table
        if not path.startswith("/api"):
            path = f"/api{path}"

        scope = dict(scope)
        scope["path"] = path

    await fastapi_app(scope, receive, send)

# Also expose handler for standard Vercel serverless convention
handler = app
