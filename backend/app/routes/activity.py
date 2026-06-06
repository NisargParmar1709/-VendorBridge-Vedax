import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.dependencies import activity_service
from app.middleware.rbac import require_permission
from app.utils.exceptions import ValidationError

activity_bp = Blueprint("activity", __name__)


def serialize_log(log) -> dict:
	return {
		"id": str(log.id),
		"entity_type": log.entity_type,
		"entity_id": str(log.entity_id),
		"action": log.action,
		"actor_id": str(log.actor_id) if log.actor_id else None,
		"actor_role": log.actor_role,
		"description": log.description,
		"metadata": log.metadata_json,
		"created_at": log.created_at.isoformat() if log.created_at else None,
	}


@activity_bp.get("/activity")
@require_permission("report:read")
def get_all_activity():
	entity_type = request.args.get("entity_type")
	page = request.args.get("page", default=1, type=int)
	per_page = request.args.get("per_page", default=50, type=int)
	logs, total = activity_service.get_all(entity_type=entity_type, page=page, per_page=per_page)
	return jsonify({"data": [serialize_log(log) for log in logs], "total": total, "page": page, "per_page": per_page}), 200


@activity_bp.get("/activity/<entity_type>/<entity_id>")
@jwt_required()
def get_activity_for_entity(entity_type, entity_id):
	page = request.args.get("page", default=1, type=int)
	per_page = request.args.get("per_page", default=50, type=int)
	try:
		normalized_entity_id = uuid.UUID(str(entity_id))
	except ValueError as exc:
		raise ValidationError("Invalid entity_id") from exc
	logs, total = activity_service.get_for_entity(entity_type, normalized_entity_id, page=page, per_page=per_page)
	return jsonify({"data": [serialize_log(log) for log in logs], "total": total, "page": page, "per_page": per_page}), 200