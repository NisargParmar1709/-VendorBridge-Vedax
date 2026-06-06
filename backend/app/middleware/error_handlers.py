from __future__ import annotations

import sys
import traceback

from flask_jwt_extended.exceptions import JWTExtendedException
from flask import Flask, jsonify
from marshmallow import ValidationError as MarshmallowValidationError
from werkzeug.exceptions import HTTPException

from app.extensions import jwt
from app.utils.exceptions import VendorBridgeError


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(VendorBridgeError)
    def handle_vendorbridge_error(error: VendorBridgeError):
        payload = {"error": error.message}
        if error.details is not None:
            payload["details"] = error.details
        return jsonify(payload), error.status_code

    @app.errorhandler(MarshmallowValidationError)
    def handle_marshmallow_validation_error(error: MarshmallowValidationError):
        return jsonify({"error": "Bad request", "details": error.messages}), 400

    @app.errorhandler(JWTExtendedException)
    def handle_jwt_exception(error: JWTExtendedException):
        return jsonify({"error": "Authentication required", "details": str(error)}), 401

    @app.errorhandler(400)
    def handle_bad_request(error):
        details = getattr(error, "description", None)
        return jsonify({"error": "Bad request", "details": details}), 400

    @app.errorhandler(401)
    def handle_unauthorized(_error):
        return jsonify({"error": "Authentication required"}), 401

    @app.errorhandler(403)
    def handle_forbidden(_error):
        return jsonify({"error": "Insufficient permissions"}), 403

    @app.errorhandler(404)
    def handle_not_found(_error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(409)
    def handle_conflict(_error):
        return jsonify({"error": "Resource already exists"}), 409

    @app.errorhandler(503)
    def handle_service_unavailable(error):
        details = getattr(error, "description", None)
        payload = {"error": "Service unavailable"}
        if details is not None:
            payload["details"] = details
        return jsonify(payload), 503

    @app.errorhandler(500)
    def handle_internal_server_error(_error):
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        if isinstance(error, HTTPException):
            description = getattr(error, "description", None)
            return jsonify({"error": error.name, "details": description}), error.code

        print(f"[ERROR] Unhandled exception: {error}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({"error": "Internal server error"}), 500

    @jwt.unauthorized_loader
    def handle_missing_jwt(reason):
        return jsonify({"error": "Authentication required", "details": reason}), 401

    @jwt.invalid_token_loader
    def handle_invalid_token(reason):
        return jsonify({"error": "Authentication required", "details": reason}), 401

    @jwt.expired_token_loader
    def handle_expired_token(_header, _payload):
        return jsonify({"error": "Authentication required", "details": "Token has expired"}), 401

    @jwt.needs_fresh_token_loader
    def handle_needs_fresh_token(_header, _payload):
        return jsonify({"error": "Authentication required", "details": "Fresh token required"}), 401

    @jwt.revoked_token_loader
    def handle_revoked_token(_header, _payload):
        return jsonify({"error": "Authentication required", "details": "Token has been revoked"}), 401