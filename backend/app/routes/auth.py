from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.dependencies import auth_service
from app.middleware.rbac import get_current_user_id, require_permission
from app.schemas.auth_schema import (
	ForgotPasswordSchema,
	LoginSchema,
	RegisterSchema,
	ResetPasswordSchema,
	UpdateProfileSchema,
)
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

register_schema = RegisterSchema()
login_schema = LoginSchema()
forgot_password_schema = ForgotPasswordSchema()
reset_password_schema = ResetPasswordSchema()
update_profile_schema = UpdateProfileSchema()


@auth_bp.post("/register")
def register():
	data = register_schema.load(request.get_json(silent=True) or {})
	result = auth_service.register(data)
	return jsonify({"message": "Registration successful", **result}), 201


@auth_bp.post("/login")
def login():
	data = login_schema.load(request.get_json(silent=True) or {})
	result = auth_service.login(data["email"], data["password"])
	return jsonify(result), 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
	user = auth_service.get_current_user(get_jwt_identity())

	access_token = create_access_token(
		identity=str(user.id),
		additional_claims={
			"role": user.role,
			"email": user.email,
		},
	)
	return jsonify({"access_token": access_token}), 200


@auth_bp.get("/me")
@require_permission("rfq:read")
def get_me():
	user = auth_service.get_current_user(get_current_user_id())
	return jsonify(auth_service.serialize_user(user)), 200


@auth_bp.patch("/me")
@jwt_required()
def update_me():
	data = update_profile_schema.load(request.get_json(silent=True) or {})
	user = auth_service.update_profile(get_current_user_id(), data)
	return jsonify(auth_service.serialize_user(user)), 200


@auth_bp.post("/forgot-password")
def forgot_password():
	data = forgot_password_schema.load(request.get_json(silent=True) or {})
	auth_service.forgot_password(data["email"])
	return jsonify({"message": "If an account exists, a reset email will be sent"}), 200


@auth_bp.post("/reset-password")
def reset_password():
	data = reset_password_schema.load(request.get_json(silent=True) or {})
	auth_service.reset_password(data["token"], data["new_password"])
	return jsonify({"message": "Password reset successful"}), 200