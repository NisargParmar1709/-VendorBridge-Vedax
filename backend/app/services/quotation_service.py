import re
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from app.models.approval import Approval
from app.models.quotation import Quotation
from app.utils.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.utils.number_utils import calculate_grand_total, calculate_tax, round_money


class QuotationService:
	def __init__(
		self,
		quotation_repo,
		rfq_repo,
		vendor_repo,
		activity_service,
		notification_service,
		approval_repo=None,
	):
		self.quotation_repo = quotation_repo
		self.rfq_repo = rfq_repo
		self.vendor_repo = vendor_repo
		self.activity_service = activity_service
		self.notification_service = notification_service
		self.approval_repo = approval_repo

	def create_or_update_draft(
		self,
		rfq_id,
		vendor_id,
		data: dict,
		actor_id,
		quotation_id=None,
	) -> Quotation:
		normalized_rfq_id = self._as_uuid(rfq_id)
		normalized_vendor_id = self._as_uuid(vendor_id)
		normalized_actor_id = self._as_uuid(actor_id)

		rfq = self.rfq_repo.get_detail(normalized_rfq_id)
		if not rfq:
			raise NotFoundError("RFQ not found")

		if rfq.status != "published":
			raise ForbiddenError("RFQ is not open for quotations")

		self._ensure_deadline_open(rfq.deadline)

		vendor = self.vendor_repo.get_by_id(normalized_vendor_id)
		if not vendor:
			raise NotFoundError("Vendor not found")

		if vendor.status != "active":
			raise ForbiddenError("Vendor is not active")

		assigned_vendor_ids = {assignment.vendor_id for assignment in getattr(rfq, "vendor_assignments", [])}
		if assigned_vendor_ids and normalized_vendor_id not in assigned_vendor_ids:
			raise ForbiddenError("Vendor is not invited to this RFQ")

		existing = self.quotation_repo.get_by_rfq_and_vendor(normalized_rfq_id, normalized_vendor_id)
		if quotation_id and existing and existing.id != self._as_uuid(quotation_id):
			raise ConflictError("Quotation already exists for this vendor and RFQ")

		if existing and existing.status == "submitted":
			raise ConflictError("Quotation already submitted")
		if existing and existing.status not in {"draft", "submitted"}:
			raise ForbiddenError("Quotation cannot be modified")

		quotation = existing or Quotation(rfq_id=normalized_rfq_id, vendor_id=normalized_vendor_id)
		line_items_payload = data.get("line_items")
		if line_items_payload is None:
			if existing and existing.line_items:
				line_items_payload = [
					{
						"rfq_line_item_id": item.rfq_line_item_id,
						"item_name": item.item_name,
						"quantity": item.quantity,
						"unit": item.unit,
						"unit_price": item.unit_price,
					}
					for item in existing.line_items
				]
			else:
				raise ValidationError("At least one line item is required")

		prepared_line_items, missing_rfq_line_item_ids = self._prepare_line_items(rfq, line_items_payload)
		subtotal = round_money(sum(item["total_price"] for item in prepared_line_items))
		gst_percentage = self._to_decimal(data.get("gst_percentage", quotation.gst_percentage or Decimal("18.00")))
		tax_amount = calculate_tax(subtotal, gst_percentage)
		grand_total = calculate_grand_total(subtotal, tax_amount)

		quotation.gst_percentage = gst_percentage
		quotation.subtotal = subtotal
		quotation.tax_amount = tax_amount
		quotation.grand_total = grand_total
		quotation.delivery_days = data.get("delivery_days", quotation.delivery_days)
		quotation.payment_terms = self._normalize_payment_terms(
			data.get("payment_terms", quotation.payment_terms)
		)
		quotation.notes = data.get("notes", quotation.notes)
		quotation.currency = data.get("currency", quotation.currency or "INR")

		saved = self.quotation_repo.save_with_line_items(quotation, prepared_line_items)
		self._attach_missing_item_warnings(saved, missing_rfq_line_item_ids)
		self.activity_service.log(
			entity_type="quotation",
			entity_id=saved.id,
			action="quotation_draft_saved",
			actor_id=normalized_actor_id,
			description=f"Quotation draft saved for RFQ {rfq.title}",
			metadata={"rfq_id": str(saved.rfq_id), "vendor_id": str(saved.vendor_id)},
		)
		return saved

	def submit_quotation(self, quotation_id, vendor_id, actor_id) -> Quotation:
		normalized_quotation_id = self._as_uuid(quotation_id)
		normalized_vendor_id = self._as_uuid(vendor_id)
		normalized_actor_id = self._as_uuid(actor_id)

		quotation = self.quotation_repo.get_detail(normalized_quotation_id)
		if not quotation:
			raise NotFoundError("Quotation not found")

		if quotation.vendor_id != normalized_vendor_id:
			raise ForbiddenError("You do not have access to this quotation")

		if quotation.status == "submitted":
			raise ConflictError("Quotation already submitted")

		if quotation.status != "draft":
			raise ForbiddenError("Only draft quotations can be submitted")

		self._ensure_deadline_open(quotation.rfq.deadline)

		quotation.status = "submitted"
		quotation.submitted_at = datetime.now(timezone.utc)
		quotation.submitted_by = normalized_actor_id
		self.quotation_repo.save(quotation)

		self.activity_service.log(
			entity_type="quotation",
			entity_id=quotation.id,
			action="quotation_submitted",
			actor_id=normalized_actor_id,
			description=f"Quotation submitted for RFQ {quotation.rfq.title}",
			metadata={"rfq_id": str(quotation.rfq_id), "vendor_id": str(quotation.vendor_id)},
		)
		self.notification_service.notify_role(
			"procurement_officer",
			"New quotation received",
			f"New quotation received for {quotation.rfq.title}",
			entity_type="rfq",
			entity_id=quotation.rfq_id,
		)
		return self.quotation_repo.get_detail(quotation.id)

	def get_quotation(self, quotation_id, actor_id, actor_role, actor_vendor_id=None) -> Quotation:
		quotation = self.quotation_repo.get_detail(self._as_uuid(quotation_id))
		if not quotation:
			raise NotFoundError("Quotation not found")

		if actor_role == "vendor":
			if not actor_vendor_id or quotation.vendor_id != self._as_uuid(actor_vendor_id):
				raise ForbiddenError("You do not have access to this quotation")

		self._attach_missing_item_warnings(quotation)
		return quotation

	def get_for_rfq(self, rfq_id, actor_id, actor_role, actor_vendor_id=None) -> list:
		rfq = self.rfq_repo.get_detail(self._as_uuid(rfq_id))
		if not rfq:
			raise NotFoundError("RFQ not found")

		quotations = self.quotation_repo.get_for_rfq(rfq.id)
		if actor_role == "vendor":
			if not actor_vendor_id:
				raise ForbiddenError("Vendor account is not linked")
			normalized_vendor_id = self._as_uuid(actor_vendor_id)
			filtered = [quotation for quotation in quotations if quotation.vendor_id == normalized_vendor_id]
			for quotation in filtered:
				self._attach_missing_item_warnings(quotation)
			return filtered

		for quotation in quotations:
			self._attach_missing_item_warnings(quotation)

		return quotations

	def get_for_vendor(self, vendor_id, page=1, per_page=20, status=None, rfq_id=None) -> tuple:
		return self.quotation_repo.get_for_vendor(
			self._as_uuid(vendor_id),
			page=page,
			per_page=per_page,
		)

	def get_all(self, page=1, per_page=20, status=None, rfq_id=None) -> tuple:
		"""List all quotations (for admin/procurement_officer/manager)."""
		rfq_uuid = self._as_uuid(rfq_id) if rfq_id else None
		return self.quotation_repo.get_all_paginated(
			page=page,
			per_page=per_page,
			status=status,
			rfq_id=rfq_uuid,
		)

	def select_quotation(self, rfq_id, quotation_id, actor_id, remarks="") -> Approval:
		if not self.approval_repo:
			raise RuntimeError("Approval repository is not configured")

		normalized_rfq_id = self._as_uuid(rfq_id)
		normalized_quotation_id = self._as_uuid(quotation_id)
		normalized_actor_id = self._as_uuid(actor_id)

		rfq = self.rfq_repo.get_detail(normalized_rfq_id)
		if not rfq:
			raise NotFoundError("RFQ not found")

		if rfq.status not in {"published", "under_review", "comparison"}:
			raise ForbiddenError("RFQ is not ready for quotation selection")

		quotation = self.quotation_repo.get_detail(normalized_quotation_id)
		if not quotation:
			raise NotFoundError("Quotation not found")

		if quotation.rfq_id != normalized_rfq_id:
			raise ValidationError("Quotation does not belong to this RFQ")

		if quotation.status != "submitted":
			raise ForbiddenError("Only submitted quotations can be selected")

		existing_approval = self.approval_repo.get_by_rfq_id(normalized_rfq_id)
		if existing_approval:
			if existing_approval.overall_status in {"approved", "rejected"}:
				raise ForbiddenError("Re-approval not permitted. Create a new RFQ.")
			raise ConflictError("Approval already exists for this RFQ")

		quotation.status = "selected"
		rfq.status = "approval_pending"
		approval = Approval(
			rfq_id=normalized_rfq_id,
			quotation_id=normalized_quotation_id,
			l1_status="pending",
			l2_status="pending",
			overall_status="pending",
		)
		approval = self.approval_repo.create_for_selection(approval, rfq, quotation)

		self.notification_service.notify_role(
			"manager",
			"Quotation selected for approval",
			f"Quotation selected for approval: {rfq.title}",
			entity_type="rfq",
			entity_id=rfq.id,
		)
		self.activity_service.log(
			entity_type="quotation",
			entity_id=quotation.id,
			action="quotation_selected",
			actor_id=normalized_actor_id,
			description=f"Quotation selected for approval for RFQ {rfq.title}",
			metadata={
				"rfq_id": str(rfq.id),
				"quotation_id": str(quotation.id),
				"remarks": remarks or "",
			},
		)
		return approval

	@staticmethod
	def _as_uuid(value):
		return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))

	@staticmethod
	def _to_decimal(value) -> Decimal:
		return value if isinstance(value, Decimal) else Decimal(str(value))

	@staticmethod
	def _ensure_deadline_open(deadline):
		if deadline < date.today():
			raise ValidationError("Deadline passed")

	def _prepare_line_items(self, rfq, line_items):
		rfq_line_item_ids = {line_item.id for line_item in rfq.line_items}
		prepared_items = []
		quoted_rfq_line_item_ids = set()

		for item in line_items:
			rfq_line_item_id = item.get("rfq_line_item_id")
			if rfq_line_item_id is not None:
				rfq_line_item_id = self._as_uuid(rfq_line_item_id)
				if rfq_line_item_id not in rfq_line_item_ids:
					raise ValidationError("Invalid RFQ line item reference")
				quoted_rfq_line_item_ids.add(rfq_line_item_id)

			quantity = self._to_decimal(item["quantity"])
			unit_price = self._to_decimal(item["unit_price"])
			if unit_price <= 0:
				raise ValidationError("Unit price must be greater than 0")

			prepared_items.append(
				{
					"rfq_line_item_id": rfq_line_item_id,
					"item_name": item["item_name"].strip(),
					"quantity": quantity,
					"unit": item.get("unit"),
					"unit_price": unit_price,
					"total_price": round_money(quantity * unit_price),
				}
			)

		missing_rfq_line_item_ids = [
			str(line_item.id)
			for line_item in rfq.line_items
			if line_item.id not in quoted_rfq_line_item_ids
		]

		return prepared_items, missing_rfq_line_item_ids

	def _attach_missing_item_warnings(self, quotation, missing_rfq_line_item_ids=None):
		if missing_rfq_line_item_ids is None:
			quoted_rfq_line_item_ids = {
				str(item.rfq_line_item_id)
				for item in quotation.line_items
				if item.rfq_line_item_id is not None
			}
			missing_rfq_line_item_ids = [
				str(line_item.id)
				for line_item in quotation.rfq.line_items
				if str(line_item.id) not in quoted_rfq_line_item_ids
			]

		quotation.warnings = []
		quotation.missing_rfq_line_item_ids = missing_rfq_line_item_ids
		if missing_rfq_line_item_ids:
			quotation.warnings.append("Quotation is missing one or more RFQ line items")
		return quotation

	@staticmethod
	def _normalize_payment_terms(value):
		if value in (None, ""):
			return None
		if isinstance(value, int):
			return value
		match = re.search(r"\d+", str(value))
		return int(match.group()) if match else None
