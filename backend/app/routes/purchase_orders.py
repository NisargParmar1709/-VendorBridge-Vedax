from flask import Blueprint, Response, jsonify, request

from app.dependencies import po_service, user_repo
from app.middleware.rbac import get_current_role, get_current_user_id, require_permission
from app.schemas.po_schema import POStatusUpdateSchema

purchase_orders_bp = Blueprint("purchase_orders", __name__)

po_status_update_schema = POStatusUpdateSchema()


def get_vendor_id_for_user(user_id):
	user = user_repo.get_by_id(user_id)
	return str(user.vendor_id) if user and user.vendor_id else None


def serialize_po_line_item(line_item) -> dict:
	return {
		"id": str(line_item.id),
		"rfq_line_item_id": str(line_item.rfq_line_item_id) if line_item.rfq_line_item_id else None,
		"item_name": line_item.item_name,
		"quantity": float(line_item.quantity),
		"unit": line_item.unit,
		"unit_price": float(line_item.unit_price),
		"total_price": float(line_item.total_price),
	}


def serialize_po(po) -> dict:
	exchange_rate = float(po.exchange_rate)
	amount_inr = float(po.grand_total) * exchange_rate
	return {
		"id": str(po.id),
		"po_number": po.po_number,
		"rfq_id": str(po.rfq_id),
		"quotation_id": str(po.quotation_id),
		"vendor_id": str(po.vendor_id),
		"vendor_name": po.vendor.name if po.vendor else None,
		"rfq_title": po.rfq.title if po.rfq else None,
		"approval_id": str(po.approval_id),
		"status": po.status,
		"subtotal": float(po.subtotal),
		"cgst_percentage": float(po.cgst_percentage),
		"sgst_percentage": float(po.sgst_percentage),
		"igst_percentage": float(po.igst_percentage),
		"cgst_amount": float(po.cgst_amount),
		"sgst_amount": float(po.sgst_amount),
		"igst_amount": float(po.igst_amount),
		"grand_total": float(po.grand_total),
		"currency": po.currency,
		"exchange_rate": exchange_rate,
		"amount_inr": amount_inr,
		"po_date": po.po_date.isoformat() if po.po_date else None,
		"delivery_date": po.delivery_date.isoformat() if po.delivery_date else None,
		"notes": po.notes,
		"created_at": po.created_at.isoformat() if po.created_at else None,
		"rfq": {
			"id": str(po.rfq.id),
			"rfq_number": po.rfq.rfq_number,
			"title": po.rfq.title,
			"deadline": po.rfq.deadline.isoformat() if po.rfq.deadline else None,
		} if po.rfq else None,
		"line_items": [serialize_po_line_item(item) for item in (po.quotation.line_items if po.quotation else [])],
		"invoice": {
			"id": str(po.invoice.id),
			"invoice_number": po.invoice.invoice_number,
			"status": po.invoice.status,
		} if po.invoice else None,
	}


@purchase_orders_bp.get("/purchase-orders")
@require_permission("po:read")
def list_purchase_orders():
	actor_id = get_current_user_id()
	actor_role = get_current_role()
	actor_vendor_id = get_vendor_id_for_user(actor_id) if actor_role == "vendor" else None
	status = request.args.get("status")
	vendor_id = request.args.get("vendor_id")
	page = request.args.get("page", default=1, type=int)
	per_page = request.args.get("per_page", default=20, type=int)
	items, total = po_service.list_pos(
		status=status,
		vendor_id=vendor_id,
		page=page,
		per_page=per_page,
		actor_role=actor_role,
		actor_vendor_id=actor_vendor_id,
	)
	serialized = [serialize_po(item) for item in items]
	return jsonify({
		"data": serialized,
		"purchase_orders": serialized,
		"items": serialized,
		"total": total,
		"page": page,
		"per_page": per_page
	}), 200


@purchase_orders_bp.get("/purchase-orders/<po_id>")
@require_permission("po:read")
def get_purchase_order(po_id):
	actor_id = get_current_user_id()
	actor_role = get_current_role()
	actor_vendor_id = get_vendor_id_for_user(actor_id) if actor_role == "vendor" else None
	po = po_service.get_po(po_id, actor_id, actor_role, actor_vendor_id)
	return jsonify(serialize_po(po)), 200


@purchase_orders_bp.patch("/purchase-orders/<po_id>/status")
@require_permission("po:create")
def update_purchase_order_status(po_id):
	data = po_status_update_schema.load(request.get_json(silent=True) or {})
	po = po_service.update_po_status(po_id, data["status"], get_current_user_id(), data.get("notes"))
	return jsonify({"purchase_order": serialize_po(po)}), 200


@purchase_orders_bp.get("/purchase-orders/<po_id>/pdf")
@require_permission("po:read")
def get_purchase_order_pdf(po_id):
	po = po_service.get_po(po_id, get_current_user_id(), get_current_role(), get_vendor_id_for_user(get_current_user_id()) if get_current_role() == "vendor" else None)
	pdf_bytes = po_service.get_po_pdf(po.id)
	return Response(
		pdf_bytes,
		mimetype="application/pdf",
		headers={"Content-Disposition": f"attachment; filename=PO-{po.po_number}.pdf"},
	)