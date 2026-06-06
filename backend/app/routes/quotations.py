from flask import Blueprint, jsonify, request
from flask_jwt_extended import verify_jwt_in_request

from app.dependencies import comparison_service, quotation_service, user_repo
from app.middleware.rbac import get_current_role, get_current_user_id, require_permission
from app.schemas.quotation_schema import (
	QuotationCreateSchema,
	QuotationSelectSchema,
	QuotationSubmitSchema,
	QuotationUpdateSchema,
)
from app.utils.exceptions import ForbiddenError, NotFoundError

quotations_bp = Blueprint("quotations", __name__)

quotation_create_schema = QuotationCreateSchema()
quotation_update_schema = QuotationUpdateSchema()
quotation_submit_schema = QuotationSubmitSchema()
quotation_select_schema = QuotationSelectSchema()


def get_vendor_id_for_user(user_id):
	user = user_repo.get_by_id(user_id)
	return str(user.vendor_id) if user and user.vendor_id else None


def serialize_quotation_line_item(line_item) -> dict:
	return {
		"id": str(line_item.id),
		"rfq_line_item_id": str(line_item.rfq_line_item_id) if line_item.rfq_line_item_id else None,
		"item_name": line_item.item_name,
		"quantity": float(line_item.quantity),
		"unit": line_item.unit,
		"unit_price": float(line_item.unit_price),
		"total_price": float(line_item.total_price),
	}


def serialize_quotation(q, include_line_items=True) -> dict:
	data = {
		"id": str(q.id),
		"rfq_id": str(q.rfq_id),
		"vendor_id": str(q.vendor_id),
		"vendor_name": q.vendor.name if q.vendor else None,
		"status": q.status,
		"gst_percentage": float(q.gst_percentage),
		"subtotal": float(q.subtotal),
		"tax_amount": float(q.tax_amount),
		"grand_total": float(q.grand_total),
		"delivery_days": q.delivery_days,
		"payment_terms": q.payment_terms,
		"notes": q.notes,
		"currency": q.currency,
		"submitted_at": q.submitted_at.isoformat() if q.submitted_at else None,
		"created_at": q.created_at.isoformat() if q.created_at else None,
		"updated_at": q.updated_at.isoformat() if q.updated_at else None,
	}
	if include_line_items:
		data["line_items"] = [serialize_quotation_line_item(line_item) for line_item in q.line_items]
	if getattr(q, "warnings", None):
		data["warnings"] = q.warnings
	if getattr(q, "missing_rfq_line_item_ids", None) is not None:
		data["missing_rfq_line_item_ids"] = q.missing_rfq_line_item_ids
	
	if q.approval:
		data["approval"] = serialize_approval(q.approval)
	else:
		data["approval"] = None
		
	return data


def serialize_approval(approval) -> dict:
	return {
		"id": str(approval.id),
		"rfq_id": str(approval.rfq_id),
		"quotation_id": str(approval.quotation_id),
		"l1_approver_id": str(approval.l1_approver_id) if approval.l1_approver_id else None,
		"l2_approver_id": str(approval.l2_approver_id) if approval.l2_approver_id else None,
		"l1_status": approval.l1_status,
		"l2_status": approval.l2_status,
		"l1_remarks": approval.l1_remarks,
		"l2_remarks": approval.l2_remarks,
		"l1_actioned_at": approval.l1_actioned_at.isoformat() if approval.l1_actioned_at else None,
		"l2_actioned_at": approval.l2_actioned_at.isoformat() if approval.l2_actioned_at else None,
		"overall_status": approval.overall_status,
		"po_id": str(approval.purchase_order.id) if approval.purchase_order else None,
		"created_at": approval.created_at.isoformat() if approval.created_at else None,
	}


def _get_actor_context():
	verify_jwt_in_request()
	actor_id = get_current_user_id()
	actor_role = get_current_role()
	actor_vendor_id = get_vendor_id_for_user(actor_id) if actor_role == "vendor" else None
	if actor_role == "vendor" and not actor_vendor_id:
		raise ForbiddenError("Vendor account is not linked")
	return actor_id, actor_role, actor_vendor_id


@quotations_bp.get("/quotations")
@require_permission("quotation:read")
def list_quotations():
	actor_id, actor_role, actor_vendor_id = _get_actor_context()
	page = request.args.get("page", default=1, type=int)
	per_page = request.args.get("per_page", default=20, type=int)
	status = request.args.get("status")
	rfq_id = request.args.get("rfq_id")

	if actor_role == "vendor":
		if not actor_vendor_id:
			raise ForbiddenError("Vendor account is not linked")
		items, total = quotation_service.get_for_vendor(
			actor_vendor_id, page=page, per_page=per_page,
		)
	else:
		# Admin, procurement_officer, manager – see all quotations
		items, total = quotation_service.get_all(
			page=page, per_page=per_page, status=status, rfq_id=rfq_id,
		)

	return jsonify({
		"quotations": [serialize_quotation(q) for q in items],
		"total": total,
		"page": page,
		"per_page": per_page,
		"pages": max(1, -(-total // per_page)),
	}), 200


@quotations_bp.get("/rfqs/<rfq_id>/quotations")
@require_permission("quotation:read")
def get_for_rfq(rfq_id):
	actor_id, actor_role, actor_vendor_id = _get_actor_context()
	quotations = quotation_service.get_for_rfq(rfq_id, actor_id, actor_role, actor_vendor_id)
	return jsonify([serialize_quotation(quotation) for quotation in quotations]), 200


@quotations_bp.post("/rfqs/<rfq_id>/quotations")
@require_permission("quotation:create")
def create_quotation(rfq_id):
	actor_id, _actor_role, actor_vendor_id = _get_actor_context()
	data = quotation_create_schema.load(request.get_json(silent=True) or {})
	quotation = quotation_service.create_or_update_draft(rfq_id, actor_vendor_id, data, actor_id)
	return jsonify(serialize_quotation(quotation)), 201


@quotations_bp.get("/quotations/<quotation_id>")
@require_permission("quotation:read")
def get_quotation(quotation_id):
	actor_id, actor_role, actor_vendor_id = _get_actor_context()
	quotation = quotation_service.get_quotation(quotation_id, actor_id, actor_role, actor_vendor_id)
	return jsonify(serialize_quotation(quotation)), 200


@quotations_bp.patch("/quotations/<quotation_id>")
@require_permission("quotation:update")
def update_quotation(quotation_id):
	actor_id, actor_role, actor_vendor_id = _get_actor_context()
	data = quotation_update_schema.load(request.get_json(silent=True) or {})
	quotation = quotation_service.get_quotation(quotation_id, actor_id, actor_role, actor_vendor_id)
	effective_vendor_id = actor_vendor_id or str(quotation.vendor_id)
	updated = quotation_service.create_or_update_draft(
		quotation.rfq_id,
		effective_vendor_id,
		data,
		actor_id,
		quotation_id=quotation.id,
	)
	return jsonify(serialize_quotation(updated)), 200


@quotations_bp.post("/quotations/<quotation_id>/submit")
@require_permission("quotation:create")
def submit_quotation(quotation_id):
	actor_id, actor_role, actor_vendor_id = _get_actor_context()
	quotation_submit_schema.load(request.get_json(silent=True) or {})
	if actor_role == "vendor":
		effective_vendor_id = actor_vendor_id
	else:
		quotation = quotation_service.get_quotation(quotation_id, actor_id, actor_role, actor_vendor_id)
		effective_vendor_id = str(quotation.vendor_id)
	submitted = quotation_service.submit_quotation(quotation_id, effective_vendor_id, actor_id)
	return jsonify({"message": "Quotation submitted", "quotation": serialize_quotation(submitted)}), 200


@quotations_bp.get("/rfqs/<rfq_id>/compare")
@require_permission("quotation:compare")
def get_comparison(rfq_id):
	comparison = comparison_service.get_comparison(rfq_id)
	return jsonify(comparison), 200


@quotations_bp.post("/rfqs/<rfq_id>/select")
@require_permission("rfq:update")
def select_quotation(rfq_id):
	actor_id, _actor_role, _actor_vendor_id = _get_actor_context()
	data = quotation_select_schema.load(request.get_json(silent=True) or {})
	approval = quotation_service.select_quotation(
		rfq_id,
		data["quotation_id"],
		actor_id,
		data.get("remarks") or "",
	)
	return jsonify({"approval": serialize_approval(approval)}), 201