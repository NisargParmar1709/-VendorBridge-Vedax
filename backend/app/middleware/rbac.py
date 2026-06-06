from functools import wraps

from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from app.utils.exceptions import ForbiddenError, UnauthorizedError

ROLE_PERMISSIONS = {
    "admin": ["*"],
    "procurement_officer": [
        "rfq:create",
        "rfq:read",
        "rfq:update",
        "quotation:read",
        "quotation:compare",
        "po:create",
        "po:read",
        "invoice:create",
        "invoice:read",
        "invoice:send",
        "vendor:read",
        "vendor:create",
        "vendor:update",
        "report:read",
    ],
    "manager": [
        "approval:read",
        "approval:action",
        "rfq:read",
        "quotation:read",
        "po:read",
        "invoice:read",
        "vendor:read",
        "report:read",
    ],
    "vendor": [
        "quotation:create",
        "quotation:read",
        "quotation:update",
        "rfq:read",
        "po:read",
        "invoice:read",
    ],
}


def require_permission(permission: str):
    """Decorator for route handlers. Reads role from JWT with no DB query."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if not role:
                raise UnauthorizedError("Invalid token claims")

            permissions = ROLE_PERMISSIONS.get(role, [])
            if "*" not in permissions and permission not in permissions:
                raise ForbiddenError("Insufficient permissions")

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def get_current_role() -> str:
    claims = get_jwt()
    return claims.get("role")


def get_current_user_id() -> str:
    return get_jwt_identity()
