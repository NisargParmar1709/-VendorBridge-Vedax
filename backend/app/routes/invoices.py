from flask import Blueprint, Response, jsonify, request

from app.dependencies import invoice_service, user_repo
from app.middleware.rbac import get_current_role, get_current_user_id, require_permission
from app.schemas.invoice_schema import InvoiceCreateSchema, InvoiceStatusUpdateSchema

invoices_bp = Blueprint("invoices", __name__)

invoice_create_schema = InvoiceCreateSchema()
invoice_status_update_schema = InvoiceStatusUpdateSchema()


def get_vendor_id_for_user(user_id):
	user = user_repo.get_by_id(user_id)
	return str(user.vendor_id) if user and user.vendor_id else None


def serialize_invoice_line_item(line_item) -> dict:
	return {
		"id": str(line_item.id),
		"item_name": line_item.item_name,
		"quantity": float(line_item.quantity),
		"unit": line_item.unit,
		"unit_price": float(line_item.unit_price),
		"total_price": float(line_item.total_price),
	}


def serialize_invoice(invoice) -> dict:
	po = invoice.po
	quotation = po.quotation if po else None
	exchange_rate = float(po.exchange_rate) if po and po.exchange_rate is not None else 1.0
	amount_inr = float(invoice.grand_total) * exchange_rate
	return {
		"id": str(invoice.id),
		"invoice_number": invoice.invoice_number,
		"po_id": str(invoice.po_id),
		"po_number": po.po_number if po else None,
		"vendor_id": str(invoice.vendor_id),
		"vendor_name": invoice.vendor.name if invoice.vendor else None,
		"status": invoice.status,
		"invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
		"due_date": invoice.due_date.isoformat() if invoice.due_date else None,
		"subtotal": float(invoice.subtotal),
		"cgst_amount": float(invoice.cgst_amount),
		"sgst_amount": float(invoice.sgst_amount),
		"igst_amount": float(invoice.igst_amount),
		"grand_total": float(invoice.grand_total),
		"currency": invoice.currency,
		"exchange_rate": exchange_rate,
		"amount_inr": amount_inr,
		"email_sent_at": invoice.email_sent_at.isoformat() if invoice.email_sent_at else None,
		"email_sent_to": invoice.email_sent_to,
		"paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
		"notes": invoice.notes,
		"created_at": invoice.created_at.isoformat() if invoice.created_at else None,
		"po": {
			"id": str(po.id),
			"po_number": po.po_number,
			"status": po.status,
		} if po else None,
		"line_items": [serialize_invoice_line_item(item) for item in (quotation.line_items if quotation else [])],
	}


@invoices_bp.get("/invoices")
@require_permission("invoice:read")
def list_invoices():
	actor_id = get_current_user_id()
	actor_role = get_current_role()
	actor_vendor_id = get_vendor_id_for_user(actor_id) if actor_role == "vendor" else None
	status = request.args.get("status")
	page = request.args.get("page", default=1, type=int)
	per_page = request.args.get("per_page", default=20, type=int)
	items, total = invoice_service.list_invoices(
		status=status,
		page=page,
		per_page=per_page,
		actor_role=actor_role,
		actor_vendor_id=actor_vendor_id,
	)
	serialized = [serialize_invoice(item) for item in items]
	return jsonify({
		"data": serialized,
		"invoices": serialized,
		"items": serialized,
		"total": total,
		"page": page,
		"per_page": per_page
	}), 200


@invoices_bp.post("/purchase-orders/<po_id>/invoices")
@require_permission("invoice:create")
def create_invoice(po_id):
	data = invoice_create_schema.load(request.get_json(silent=True) or {})
	invoice = invoice_service.create_invoice(po_id, data, get_current_user_id())
	return jsonify({"invoice": serialize_invoice(invoice)}), 201


@invoices_bp.get("/invoices/<invoice_id>")
@require_permission("invoice:read")
def get_invoice(invoice_id):
	actor_id = get_current_user_id()
	actor_role = get_current_role()
	actor_vendor_id = get_vendor_id_for_user(actor_id) if actor_role == "vendor" else None
	invoice = invoice_service.get_invoice(invoice_id, actor_id, actor_role, actor_vendor_id)
	return jsonify(serialize_invoice(invoice)), 200


@invoices_bp.patch("/invoices/<invoice_id>/status")
@require_permission("invoice:create")
def update_invoice_status(invoice_id):
	data = invoice_status_update_schema.load(request.get_json(silent=True) or {})
	invoice = invoice_service.update_invoice_status(invoice_id, data["status"], get_current_user_id())
	return jsonify({"invoice": serialize_invoice(invoice)}), 200


@invoices_bp.get("/invoices/<invoice_id>/pdf")
@require_permission("invoice:read")
def get_invoice_pdf(invoice_id):
	actor_id = get_current_user_id()
	actor_role = get_current_role()
	actor_vendor_id = get_vendor_id_for_user(actor_id) if actor_role == "vendor" else None
	invoice = invoice_service.get_invoice(invoice_id, actor_id, actor_role, actor_vendor_id)
	pdf_bytes = invoice_service.get_invoice_pdf(invoice.id)
	return Response(
		pdf_bytes,
		mimetype="application/pdf",
		headers={"Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"},
	)


@invoices_bp.post("/invoices/<invoice_id>/send-email")
@require_permission("invoice:send")
def send_invoice(invoice_id):
	result = invoice_service.send_invoice_email(invoice_id, get_current_user_id())
	return jsonify(result), 200


@invoices_bp.post("/invoices/<invoice_id>/mark-paid")
@require_permission("invoice:create")
def mark_invoice_paid(invoice_id):
	invoice = invoice_service.mark_paid(invoice_id, get_current_user_id())
	return jsonify({"message": "Invoice marked as paid", "invoice": serialize_invoice(invoice)}), 200