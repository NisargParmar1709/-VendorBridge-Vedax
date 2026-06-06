from __future__ import annotations

import os
import sys

from flask import Flask
from sqlalchemy import text

from .extensions import db

REQUIRED_ENV_VARS = [
    "FLASK_ENV",
    "FLASK_SECRET_KEY",
    "FLASK_DEBUG",
    "DATABASE_URL",
    "JWT_SECRET_KEY",
    "JWT_ACCESS_TOKEN_EXPIRES",
    "JWT_REFRESH_TOKEN_EXPIRES",
    "FRONTEND_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "SMTP_FROM_NAME",
    "SMTP_FROM_EMAIL",
    "SMTP_USE_TLS",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "UPLOAD_FOLDER",
    "MAX_CONTENT_LENGTH",
    "ORG_NAME",
    "ORG_ADDRESS",
    "ORG_GSTIN",
    "BASE_CURRENCY",
]


def _validate_env_vars() -> None:
    missing = [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]
    if missing:
        print(
            "[BOOT] Missing required environment variables: " + ", ".join(missing),
            file=sys.stderr,
        )
        sys.exit(1)


def _validate_database() -> None:
    db.session.execute(text("SELECT 1"))


def _check_gemini_connectivity(app: Flask) -> None:
    api_key = app.config.get("GEMINI_API_KEY")
    if not api_key or api_key == "<your-value-here>":
        print("[BOOT] Warning: GEMINI_API_KEY is not configured.", file=sys.stderr)
        return

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        configured_model = app.config.get("GEMINI_MODEL", "gemini-2.0-flash")
        # Quick validation by listing models
        models = list(client.models.list())
        model_names = {m.name for m in models}
        full_name = configured_model if configured_model.startswith("models/") else f"models/{configured_model}"
        if full_name not in model_names:
            print(
                f"[BOOT] Warning: Gemini model '{configured_model}' was not found.",
                file=sys.stderr,
            )
    except ImportError:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            print("[BOOT] Gemini (legacy SDK) configured.", file=sys.stderr)
        except Exception as exc:
            print(f"[BOOT] Warning: Gemini API check failed: {exc}", file=sys.stderr)
    except Exception as exc:
        print(f"[BOOT] Warning: Gemini API check failed: {exc}", file=sys.stderr)


def run_startup_checks(app: Flask) -> None:
    _validate_env_vars()

    with app.app_context():
        try:
            _validate_database()
        except Exception as exc:
            print(f"[BOOT] Database connectivity check failed: {exc}", file=sys.stderr)
            sys.exit(1)

        _check_gemini_connectivity(app)

    print("[BOOT] VendorBridge started successfully OK")