import os
import uuid
from datetime import date, timedelta
from decimal import Decimal

from app.models.purchase_order import PurchaseOrder
from app.utils.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.utils.number_utils import calculate_grand_total, calculate_tax, round_money
from app.utils.pdf_generator import generate_po_pdf


class POService:
	STATUS_ORDER = {"draft": 0, "sent": 1, "acknowledged": 2, "completed": 3, "cancelled": 4}

	def __init__(
		self,
		po_repo,
		approval_repo,
		quotation_repo,
		rfq_repo,
		vendor_repo,
		invoice_repo,
		activity_service,
		notification_service,
		sequence_gen,
	):
		self.po_repo = po_repo
		self.approval_repo = approval_repo
		self.quotation_repo = quotation_repo
		self.rfq_repo = rfq_repo
		self.vendor_repo = vendor_repo
		self.invoice_repo = invoice_repo
		self.activity_service = activity_service
		self.notification_service = notification_service
		self.sequence_gen = sequence_gen

	def create_po(self, approval_id: str, actor_id: str):
		approval = self.approval_repo.get_detail(self._as_uuid(approval_id))
		if not approval:
			raise NotFoundError("Approval not found")
		if approval.purchase_order:
			return approval.purchase_order

		quotation = approval.quotation
		if quotation is None:
			raise NotFoundError("Quotation not found for approval")

		vendor = quotation.vendor or self.vendor_repo.get_detail(quotation.vendor_id)
		if vendor is None:
			raise NotFoundError("Vendor not found for quotation")
		po_number = self.sequence_gen.generate_po_number()
		subtotal = round_money(sum((line_item.total_price for line_item in quotation.line_items), Decimal("0")))
		cgst_amount = calculate_tax(subtotal, Decimal("9.00"))
		sgst_amount = calculate_tax(subtotal, Decimal("9.00"))
		grand_total = calculate_grand_total(subtotal, cgst_amount, sgst_amount)

		po = PurchaseOrder(
			po_number=po_number,
			rfq_id=approval.rfq_id,
			quotation_id=approval.quotation_id,
			vendor_id=quotation.vendor_id,
			approval_id=self._as_uuid(approval_id),
			created_by=self._as_uuid(actor_id),
			bill_to_name=os.getenv("ORG_NAME"),
			bill_to_address=os.getenv("ORG_ADDRESS"),
			bill_to_gstin=os.getenv("ORG_GSTIN"),
			subtotal=subtotal,
			cgst_percentage=Decimal("9.00"),
			sgst_percentage=Decimal("9.00"),
			igst_percentage=Decimal("0.00"),
			cgst_amount=cgst_amount,
			sgst_amount=sgst_amount,
			igst_amount=Decimal("0.00"),
			grand_total=grand_total,
			currency=quotation.currency,
			exchange_rate=quotation.exchange_rate,
			status="draft",
			po_date=date.today(),
			delivery_date=(date.today() + timedelta(days=quotation.delivery_days)) if quotation.delivery_days else None,
			notes=quotation.notes,
		)

		saved_po = self.po_repo.save(po)
		vendor.total_orders = int(vendor.total_orders or 0) + 1
		self.vendor_repo.save(vendor)
		saved_po = self.po_repo.get_detail(saved_po.id)
		self.activity_service.log(
			entity_type="purchase_order",
			entity_id=saved_po.id,
			action="po_generated",
			actor_id=self._as_uuid(actor_id),
			description=f"Purchase order {saved_po.po_number} generated for {approval.rfq.title}",
			metadata={"approval_id": str(approval.id), "quotation_id": str(quotation.id)},
		)
		return saved_po

	def get_po(self, po_id, actor_id, actor_role, actor_vendor_id=None):
		po = self.po_repo.get_detail(self._as_uuid(po_id))
		if not po:
			raise NotFoundError("Purchase order not found")
		if actor_role == "vendor":
			if not actor_vendor_id or po.vendor_id != self._as_uuid(actor_vendor_id):
				raise ForbiddenError("You do not have access to this purchase order")
		return po

	def list_pos(self, status=None, vendor_id=None, page=1, per_page=20, actor_role=None, actor_vendor_id=None):
		if actor_role == "vendor":
			if not actor_vendor_id:
				raise ForbiddenError("Vendor account is not linked")
			return self.po_repo.get_for_vendor(self._as_uuid(actor_vendor_id), page=page, per_page=per_page)
		filter_vendor_id = self._as_uuid(vendor_id) if vendor_id else None
		return self.po_repo.search(status=status, vendor_id=filter_vendor_id, page=page, per_page=per_page)

	def update_po_status(self, po_id, new_status: str, actor_id, notes=None):
		po = self.po_repo.get_detail(self._as_uuid(po_id))
		if not po:
			raise NotFoundError("Purchase order not found")
		if po.status == "cancelled":
			raise ForbiddenError("Cancelled purchase orders cannot be modified")
		if po.status == "completed" and new_status == "cancelled":
			raise ForbiddenError("Completed purchase orders cannot be cancelled")
		if self.STATUS_ORDER[new_status] < self.STATUS_ORDER[po.status]:
			raise ValidationError("Purchase order status cannot move backward")
		if po.status == new_status:
			return po

		po.status = new_status
		if notes is not None:
			po.notes = notes
		po = self.po_repo.save(po)

		if new_status == "cancelled":
			invoice = self.invoice_repo.get_by_po_id(po.id)
			if invoice:
				invoice.status = "voided"
				self.invoice_repo.save(invoice)

		self.activity_service.log(
			entity_type="purchase_order",
			entity_id=po.id,
			action=f"po_status_{new_status}",
			actor_id=self._as_uuid(actor_id),
			description=f"Purchase order {po.po_number} moved to {new_status}",
			metadata={"status": new_status},
		)
		return self.po_repo.get_detail(po.id)

	def get_po_pdf(self, po_id) -> bytes:
		po = self.po_repo.get_detail(self._as_uuid(po_id))
		if not po:
			raise NotFoundError("Purchase order not found")
		return generate_po_pdf(self._build_po_document_data(po))

	def _build_po_document_data(self, po):
		quotation = po.quotation
		vendor = po.vendor
		return {
			"po_number": po.po_number,
			"po_date": po.po_date.isoformat() if po.po_date else None,
			"delivery_date": po.delivery_date.isoformat() if po.delivery_date else None,
			"rfq_number": po.rfq.rfq_number if po.rfq else None,
			"vendor_name": vendor.name if vendor else None,
			"vendor_address": self._join_vendor_address(vendor),
			"vendor_gstin": vendor.gst_number if vendor else None,
			"vendor_email": vendor.contact_email if vendor else None,
			"org_name": po.bill_to_name or os.getenv("ORG_NAME", ""),
			"org_address": po.bill_to_address or os.getenv("ORG_ADDRESS", ""),
			"org_gstin": po.bill_to_gstin or os.getenv("ORG_GSTIN", ""),
			"line_items": [self._serialize_line_item(item) for item in quotation.line_items],
			"subtotal": po.subtotal,
			"cgst_amount": po.cgst_amount,
			"sgst_amount": po.sgst_amount,
			"igst_amount": po.igst_amount,
			"cgst_pct": po.cgst_percentage,
			"sgst_pct": po.sgst_percentage,
			"igst_pct": po.igst_percentage,
			"grand_total": po.grand_total,
			"currency_display": self._currency_display(po.currency),
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
			"unit_price_display": f"{float(item.unit_price):.2f}",
			"total_price": f"{float(item.total_price):.2f}",
			"total_price_display": f"{float(item.total_price):.2f}",
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
	def _as_uuid(value):
		return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
