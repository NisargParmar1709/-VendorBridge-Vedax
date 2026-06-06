from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.dependencies import vendor_service, rfq_service
from app.middleware.rbac import require_permission, get_current_user_id

vendors_bp = Blueprint("vendors", __name__, url_prefix="/vendors")

@vendors_bp.route("", methods=["GET"])
@jwt_required()
def list_vendors():
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)
    search = request.args.get("search")
    category = request.args.get("category")
    status = request.args.get("status")
    result = vendor_service.list_vendors(search, category, status, page, per_page)
    return jsonify(result), 200

@vendors_bp.route("", methods=["POST"])
@jwt_required()
@require_permission("vendor:create")
def create_vendor():
    data = request.json
    vendor = vendor_service.create_vendor(data, get_current_user_id())
    return jsonify(vendor), 201

@vendors_bp.route("/<uuid:id>", methods=["GET"])
@jwt_required()
def get_vendor(id):
    vendor = vendor_service.get_vendor(id)
    return jsonify(vendor), 200

@vendors_bp.route("/<uuid:id>", methods=["PATCH"])
@jwt_required()
@require_permission("vendor:update")
def update_vendor(id):
    data = request.json
    vendor = vendor_service.update_vendor(id, data, get_current_user_id())
    return jsonify(vendor), 200

@vendors_bp.route("/<uuid:id>/status", methods=["PATCH"])
@jwt_required()
@require_permission("vendor:update")
def update_status(id):
    status = request.json.get("status")
    vendor = vendor_service.update_status(id, status, get_current_user_id())
    return jsonify(vendor), 200

@vendors_bp.route("/<uuid:id>/performance", methods=["GET"])
@jwt_required()
def get_performance(id):
    performance = vendor_service.get_performance(id)
    return jsonify(performance), 200

@vendors_bp.route("/<uuid:id>/rate", methods=["POST"])
@jwt_required()
@require_permission("vendor:update")
def rate_vendor(id):
    rating = request.json.get("rating")
    
    # E9: Rating Vendor with Zero POs
    performance = vendor_service.get_performance(id)
    if performance.get("completed_purchase_orders", 0) == 0:
        return jsonify({"error": "Cannot rate vendor with no completed orders"}), 400
        
    vendor = vendor_service.rate_vendor(id, rating, get_current_user_id())
    return jsonify(vendor), 200