from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.dependencies import rfq_service
from app.middleware.rbac import require_permission, get_current_user_id

rfqs_bp = Blueprint("rfqs", __name__, url_prefix="/rfqs")

@rfqs_bp.route("/admin/expire-overdue", methods=["POST"])
@jwt_required()
@require_permission("*")
def expire_overdue():
    count = rfq_service.expire_overdue_rfqs()
    return jsonify({"expired": count}), 200

@rfqs_bp.route("", methods=["GET"])
@jwt_required()
def list_rfqs():
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)
    status = request.args.get("status")
    search = request.args.get("search")
    result = rfq_service.list_rfqs(status, search, page, per_page)
    return jsonify(result), 200

@rfqs_bp.route("", methods=["POST"])
@jwt_required()
@require_permission("rfq:create")
def create_rfq():
    data = request.json
    rfq = rfq_service.create_rfq(data, get_current_user_id())
    return jsonify(rfq), 201

@rfqs_bp.route("/<uuid:id>", methods=["GET"])
@jwt_required()
def get_rfq(id):
    rfq = rfq_service.get_rfq(id)
    return jsonify(rfq), 200

@rfqs_bp.route("/<uuid:id>/publish", methods=["POST"])
@jwt_required()
@require_permission("rfq:update")
def publish_rfq(id):
    rfq = rfq_service.publish_rfq(id, get_current_user_id())
    return jsonify(rfq), 200