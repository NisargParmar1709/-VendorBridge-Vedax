import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.dependencies import notification_service
from app.middleware.rbac import get_current_user_id

notifications_bp = Blueprint("notifications", __name__, url_prefix="/notifications")


@notifications_bp.get("")
@jwt_required()
def get_notifications():
	page = request.args.get("page", default=1, type=int)
	per_page = request.args.get("per_page", default=30, type=int)
	result = notification_service.get_for_user(get_current_user_id(), page=page, per_page=per_page)
	return jsonify(result), 200


@notifications_bp.patch("/<uuid:notification_id>/read")
@jwt_required()
def mark_notification_read(notification_id):
	result = notification_service.mark_read(notification_id, get_current_user_id())
	return jsonify({"is_read": result["is_read"]}), 200


@notifications_bp.patch("/read-all")
@jwt_required()
def mark_all_notifications_read():
	result = notification_service.mark_all_read(get_current_user_id())
	return jsonify(result), 200