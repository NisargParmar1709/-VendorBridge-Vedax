import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.models.invoice import Invoice
from app.utils.email_sender import send_invoice_email
from app.utils.exceptions import ConflictError, ForbiddenError, InternalError, NotFoundError, ServiceUnavailableError
from app.utils.pdf_generator import generate_invoice_pdf


class InvoiceService:
	def __init__(self, invoice_repo, po_repo, vendor_repo, activity_service, notification_service, sequence_gen):
		self.invoice_repo = invoice_repo
		self.po_repo = po_repo
		self.vendor_repo = vendor_repo
		self.activity_service = activity_service
		self.notification_service = notification_service
		self.sequence_gen = sequence_gen

	def create_invoice(self, po_id: str, data: dict, actor_id: str):
		po = self.po_repo.get_detail(self._as_uuid(po_id))
		if not po:
			raise NotFoundError("Purchase order not found")
		if po.status == "cancelled":
			raise ForbiddenError("Cannot invoice a cancelled PO")
		if self.invoice_repo.get_by_po_id(po.id):
			raise ConflictError("Invoice already exists for this PO")

		invoice_date = date.today()
		due_date = invoice_date + timedelta(days=30)
		invoice = Invoice(
			invoice_number=self.sequence_gen.generate_invoice_number(),
			po_id=po.id,
			vendor_id=po.vendor_id,
			created_by=self._as_uuid(actor_id),
			invoice_date=invoice_date,
			due_date=due_date,
			subtotal=po.subtotal,
			cgst_amount=po.cgst_amount,
			sgst_amount=po.sgst_amount,
			igst_amount=po.igst_amount,
			grand_total=po.grand_total,
			currency=po.currency,
			status="draft",
			notes=data.get("notes"),
		)
		saved = self.invoice_repo.save(invoice)
		saved = self.invoice_repo.get_detail(saved.id)
		self.activity_service.log(
			entity_type="invoice",
			entity_id=saved.id,
			action="invoice_created",
			actor_id=self._as_uuid(actor_id),
			description=f"Invoice {saved.invoice_number} created for PO {po.po_number}",
			metadata={"po_id": str(po.id), "vendor_id": str(po.vendor_id)},
		)
		return saved

	def get_invoice(self, invoice_id, actor_id, actor_role, actor_vendor_id=None):
		invoice = self.invoice_repo.get_detail(self._as_uuid(invoice_id))
		if not invoice:
			raise NotFoundError("Invoice not found")
		if actor_role == "vendor":
			if not actor_vendor_id or invoice.vendor_id != self._as_uuid(actor_vendor_id):
				raise ForbiddenError("You do not have access to this invoice")
		return invoice

	def update_invoice_status(self, invoice_id, new_status: str, actor_id: str):
		invoice = self.invoice_repo.get_detail(self._as_uuid(invoice_id))
		if not invoice:
			raise NotFoundError("Invoice not found")
		if invoice.status == "voided":
			raise ForbiddenError("Voided invoices cannot be modified")
		if not self._is_valid_transition(invoice.status, new_status):
			raise ForbiddenError("Invalid invoice status transition")

		invoice.status = new_status
		if new_status == "paid":
			invoice.paid_at = datetime.now(timezone.utc)
		saved = self.invoice_repo.save(invoice)
		self.activity_service.log(
			entity_type="invoice",
			entity_id=saved.id,
			action=f"invoice_status_{new_status}",
			actor_id=self._as_uuid(actor_id),
			description=f"Invoice {saved.invoice_number} moved to {new_status}",
			metadata={"status": new_status},
		)
		return self.invoice_repo.get_detail(saved.id)

	def send_invoice_email(self, invoice_id, actor_id) -> dict:
		invoice = self.invoice_repo.get_detail(self._as_uuid(invoice_id))
		if not invoice:
			raise NotFoundError("Invoice not found")
		if invoice.status == "voided":
			raise ForbiddenError("Cannot email a voided invoice")

		vendor = invoice.vendor or self.vendor_repo.get_detail(invoice.vendor_id)
		email_data = self._build_invoice_document_data(invoice)
		try:
			send_invoice_email(to_email=vendor.contact_email, invoice_data=email_data)
		except Exception as exc:
			self.activity_service.log(
				entity_type="invoice",
				entity_id=invoice.id,
				action="invoice_send_failed",
				actor_id=self._as_uuid(actor_id),
				description=f"Invoice email failed for {invoice.invoice_number}",
				metadata={"error": str(exc)},
			)
			raise ServiceUnavailableError("Email service unavailable")

		invoice.email_sent_at = datetime.now(timezone.utc)
		invoice.email_sent_to = vendor.contact_email
		if invoice.status == "draft":
			invoice.status = "sent"
		saved = self.invoice_repo.save(invoice)
		self.activity_service.log(
			entity_type="invoice",
			entity_id=saved.id,
			action="invoice_sent",
			actor_id=self._as_uuid(actor_id),
			description=f"Invoice {saved.invoice_number} emailed to {vendor.contact_email}",
			metadata={"to_email": vendor.contact_email},
		)
		return {"message": f"Invoice emailed to {vendor.contact_email}"}

	def mark_paid(self, invoice_id, actor_id):
		invoice = self.invoice_repo.get_detail(self._as_uuid(invoice_id))
		if not invoice:
			raise NotFoundError("Invoice not found")
		if invoice.status == "voided":
			raise ForbiddenError("Voided invoices cannot be modified")
		invoice.status = "paid"
		invoice.paid_at = datetime.now(timezone.utc)
		saved = self.invoice_repo.save(invoice)
		self.activity_service.log(
			entity_type="invoice",
			entity_id=saved.id,
			action="invoice_paid",
			actor_id=self._as_uuid(actor_id),
			description=f"Invoice {saved.invoice_number} marked paid",
		)
		return self.invoice_repo.get_detail(saved.id)

	def get_invoice_pdf(self, invoice_id) -> bytes:
		invoice = self.invoice_repo.get_detail(self._as_uuid(invoice_id))
		if not invoice:
			raise NotFoundError("Invoice not found")
		if invoice.status == "voided":
			raise ForbiddenError("Cannot generate PDF for a voided invoice")
		try:
			return generate_invoice_pdf(self._build_invoice_document_data(invoice))
		except Exception as exc:
			self.activity_service.log(
				entity_type="invoice",
				entity_id=invoice.id,
				action="invoice_pdf_failed",
				actor_id=None,
				description=f"Invoice PDF generation failed for {invoice.invoice_number}",
				metadata={"error": str(exc)},
			)
			raise InternalError("Invoice PDF generation failed")

	def list_invoices(self, status=None, page=1, per_page=20, actor_role=None, actor_vendor_id=None):
		if actor_role == "vendor":
			if not actor_vendor_id:
				raise ForbiddenError("Vendor account is not linked")
			return self.invoice_repo.get_for_vendor(self._as_uuid(actor_vendor_id), page=page, per_page=per_page)
		return self.invoice_repo.search(status=status, page=page, per_page=per_page)

	def _build_invoice_document_data(self, invoice):
		po = invoice.po
		quotation = po.quotation
		vendor = invoice.vendor
		return {
			"invoice_number": invoice.invoice_number,
			"invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
			"due_date": invoice.due_date.isoformat() if invoice.due_date else None,
			"po_number": po.po_number if po else None,
			"vendor_name": vendor.name if vendor else None,
			"vendor_address": self._join_vendor_address(vendor),
			"vendor_gstin": vendor.gst_number if vendor else None,
			"vendor_email": vendor.contact_email if vendor else None,
			"org_name": po.bill_to_name if po else None,
			"org_address": po.bill_to_address if po else None,
			"org_gstin": po.bill_to_gstin if po else None,
			"line_items": [self._serialize_line_item(item) for item in quotation.line_items],
			"subtotal": invoice.subtotal,
			"cgst_amount": invoice.cgst_amount,
			"sgst_amount": invoice.sgst_amount,
			"igst_amount": invoice.igst_amount,
			"cgst_pct": po.cgst_percentage if po else 0,
			"sgst_pct": po.sgst_percentage if po else 0,
			"igst_pct": po.igst_percentage if po else 0,
			"grand_total": invoice.grand_total,
			"currency_display": self._currency_display(invoice.currency),
			"payment_terms": quotation.payment_terms or 0,
			"bank_name": vendor.bank_name if vendor else None,
			"bank_account": vendor.bank_account if vendor else None,
			"bank_ifsc": vendor.bank_ifsc if vendor else None,
		}

	@staticmethod
	def _serialize_line_item(item):
		return {
			"item_name": item.item_name,
			"quantity": float(item.quantity),
			"unit": item.unit or "",
			"unit_price": f"{float(item.unit_price):.2f}",
			"total_price": f"{float(item.total_price):.2f}",
		}

	@staticmethod
	def _join_vendor_address(vendor):
		if not vendor:
			return ""
		parts = [vendor.address, vendor.city, vendor.state, vendor.country, vendor.pincode]
		return ", ".join(str(part) for part in parts if part)

	@staticmethod
	def _currency_display(currency_code):
		return "INR " if not currency_code else f"{currency_code} "

	@staticmethod
	def _is_valid_transition(current_status, new_status):
		valid = {
			"draft": {"draft", "sent", "paid", "voided"},
			"sent": {"sent", "paid", "overdue", "voided"},
			"overdue": {"overdue", "paid", "voided"},
			"paid": {"paid"},
			"voided": {"voided"},
		}
		return new_status in valid.get(current_status, set())

	@staticmethod
	def _as_uuid(value):
		return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
