from flask import Blueprint, jsonify, request

from app.dependencies import approval_service
from app.middleware.rbac import get_current_role, get_current_user_id, require_permission
from app.schemas.approval_schema import ApprovalActionSchema

approvals_bp = Blueprint("approvals", __name__)

approval_action_schema = ApprovalActionSchema()


def serialize_rfq_summary(rfq) -> dict:
	return {
		"id": str(rfq.id),
		"rfq_number": rfq.rfq_number,
		"title": rfq.title,
		"deadline": rfq.deadline.isoformat() if rfq.deadline else None,
		"status": rfq.status,
	}


def serialize_quotation_summary(quotation) -> dict:
	return {
		"id": str(quotation.id),
		"vendor_id": str(quotation.vendor_id),
		"vendor_name": quotation.vendor.name if quotation.vendor else None,
		"grand_total": float(quotation.grand_total),
		"delivery_days": quotation.delivery_days,
		"payment_terms": quotation.payment_terms,
		"status": quotation.status,
	}


def serialize_po_summary(po) -> dict:
	return {
		"id": str(po.id),
		"po_number": po.po_number,
		"status": po.status,
		"grand_total": float(po.grand_total),
		"created_at": po.created_at.isoformat() if po.created_at else None,
	}


def serialize_approval(approval, include_po=False) -> dict:
	data = {
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
		"created_at": approval.created_at.isoformat() if approval.created_at else None,
		"rfq": serialize_rfq_summary(approval.rfq) if approval.rfq else None,
		"quotation": serialize_quotation_summary(approval.quotation) if approval.quotation else None,
	}
	if getattr(approval, "warnings", None):
		data["warnings"] = approval.warnings
	if include_po:
		po = approval.purchase_order
		data["po"] = serialize_po_summary(po) if po else None
	return data


@approvals_bp.get("/approvals")
@require_permission("approval:read")
def list_approvals():
	status = request.args.get("status")
	page = request.args.get("page", default=1, type=int)
	per_page = request.args.get("per_page", default=20, type=int)
	items, total = approval_service.list_approvals(status=status, page=page, per_page=per_page)
	return jsonify(
		{
			"data": [serialize_approval(item, include_po=True) for item in items],
			"total": total,
			"page": page,
			"per_page": per_page,
		}
	), 200


@approvals_bp.get("/approvals/<approval_id>")
@require_permission("approval:read")
def get_approval(approval_id):
	approval = approval_service.get_approval(
		approval_id,
		get_current_user_id(),
		get_current_role(),
	)
	return jsonify(serialize_approval(approval, include_po=True)), 200


@approvals_bp.post("/approvals/<approval_id>/l1")
@require_permission("approval:action")
def process_l1(approval_id):
	data = approval_action_schema.load(request.get_json(silent=True) or {})
	approval = approval_service.process_l1(
		approval_id,
		data["action"],
		(data.get("remarks") or "").strip(),
		get_current_user_id(),
	)
	return jsonify({"message": "L1 action recorded", "approval": serialize_approval(approval, include_po=True)}), 200


@approvals_bp.post("/approvals/<approval_id>/l2")
@require_permission("approval:action")
def process_l2(approval_id):
	data = approval_action_schema.load(request.get_json(silent=True) or {})
	result = approval_service.process_l2(
		approval_id,
		data["action"],
		(data.get("remarks") or "").strip(),
		get_current_user_id(),
	)
	return jsonify(
		{
			"message": "L2 action recorded",
			"approval": serialize_approval(result["approval"], include_po=True),
			"po": serialize_po_summary(result["po"]) if result["po"] else None,
		}
	), 200