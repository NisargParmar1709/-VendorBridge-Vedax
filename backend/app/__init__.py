from __future__ import annotations

import os

from flask import Flask

from .config import DevelopmentConfig, ProductionConfig
from .extensions import cors, db, jwt
from .middleware import register_error_handlers
from .routes import (
    activity_bp,
    ai_bp,
    approvals_bp,
    auth_bp,
    invoices_bp,
    notifications_bp,
    purchase_orders_bp,
    quotations_bp,
    reports_bp,
    rfqs_bp,
    vendors_bp,
)

BLUEPRINTS = (
    auth_bp,
    vendors_bp,
    rfqs_bp,
    quotations_bp,
    approvals_bp,
    purchase_orders_bp,
    invoices_bp,
    reports_bp,
    activity_bp,
    ai_bp,
    notifications_bp,
)


def create_app(config=None) -> Flask:
    app = Flask(__name__)

    if config is None:
        flask_env = os.getenv("FLASK_ENV", "development").lower()
        config_object = ProductionConfig if flask_env == "production" else DevelopmentConfig
        app.config.from_object(config_object)
    elif isinstance(config, str):
        config_lookup = {
            "development": DevelopmentConfig,
            "production": ProductionConfig,
        }
        app.config.from_object(config_lookup.get(config.lower(), DevelopmentConfig))
    elif isinstance(config, dict):
        app.config.from_mapping(config)
    else:
        app.config.from_object(config)

    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", [])}},
    )

    for blueprint in BLUEPRINTS:
        blueprint_prefix = blueprint.url_prefix or ""
        app.register_blueprint(blueprint, url_prefix=f"/api/v1{blueprint_prefix}")

    register_error_handlers(app)

    return app