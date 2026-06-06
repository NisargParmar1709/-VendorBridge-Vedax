import uuid
from datetime import datetime, timezone

from app.utils.exceptions import ForbiddenError, NotFoundError


class ApprovalService:
	def __init__(
		self,
		approval_repo,
		rfq_repo,
		quotation_repo,
		po_service,
		activity_service,
		notification_service,
		user_repo,
	):
		self.approval_repo = approval_repo
		self.rfq_repo = rfq_repo
		self.quotation_repo = quotation_repo
		self.po_service = po_service
		self.activity_service = activity_service
		self.notification_service = notification_service
		self.user_repo = user_repo

	def get_approval(self, approval_id, actor_id, actor_role):
		approval = self.approval_repo.get_detail(self._as_uuid(approval_id))
		if not approval:
			raise NotFoundError("Approval not found")
		return self._attach_warnings(approval)

	def list_approvals(self, status=None, page=1, per_page=20):
		if status == "pending":
			items, total = self.approval_repo.get_pending_for_manager(page=page, per_page=per_page)
		else:
			items, total = self.approval_repo.search(status=status, page=page, per_page=per_page)

		return [self._attach_warnings(item) for item in items], total

	def process_l1(self, approval_id, action: str, remarks: str, actor_id: str):
		approval = self.approval_repo.get_detail(self._as_uuid(approval_id))
		if not approval:
			raise NotFoundError("Approval not found")

		if approval.overall_status != "pending":
			raise ForbiddenError("Approval already resolved")

		if approval.l1_status != "pending":
			raise ForbiddenError("L1 already actioned")

		normalized_actor_id = self._as_uuid(actor_id)
		approval.l1_approver_id = approval.l1_approver_id or normalized_actor_id
		approval.l1_remarks = remarks
		approval.l1_actioned_at = datetime.now(timezone.utc)

		if action == "approve":
			approval.l1_status = "approved"
			self.approval_repo.save(approval)
			self.activity_service.log(
				entity_type="approval",
				entity_id=approval.id,
				action="approval_l1_approved",
				actor_id=normalized_actor_id,
				description=f"L1 approved approval for {approval.rfq.title}",
				metadata={"rfq_id": str(approval.rfq_id), "quotation_id": str(approval.quotation_id)},
			)
			self.notification_service.notify_role(
				"manager",
				"L1 approved",
				f"L1 approved — L2 review required for {approval.rfq.title}",
				entity_type="approval",
				entity_id=approval.id,
			)
			return self._attach_warnings(self.approval_repo.get_detail(approval.id))

		approval.l1_status = "rejected"
		approval.overall_status = "rejected"
		approval.rfq.status = "rejected"
		self.approval_repo.save(approval)
		self.rfq_repo.save(approval.rfq)
		self.activity_service.log(
			entity_type="approval",
			entity_id=approval.id,
			action="approval_l1_rejected",
			actor_id=normalized_actor_id,
			description=f"L1 rejected approval for {approval.rfq.title}",
			metadata={"rfq_id": str(approval.rfq_id), "quotation_id": str(approval.quotation_id)},
		)
		self.notification_service.notify_role(
			"procurement_officer",
			"Approval rejected at L1",
			f"Approval rejected at L1 for {approval.rfq.title}",
			entity_type="approval",
			entity_id=approval.id,
		)
		return self._attach_warnings(self.approval_repo.get_detail(approval.id))

	def process_l2(self, approval_id, action: str, remarks: str, actor_id: str) -> dict:
		approval = self.approval_repo.get_detail(self._as_uuid(approval_id))
		if not approval:
			raise NotFoundError("Approval not found")

		if approval.l1_status != "approved":
			raise ForbiddenError("L1 must approve first")

		if approval.overall_status != "pending":
			raise ForbiddenError("Approval already resolved")

		if approval.l2_status != "pending":
			raise ForbiddenError("L2 already actioned")

		normalized_actor_id = self._as_uuid(actor_id)
		approval.l2_approver_id = approval.l2_approver_id or normalized_actor_id
		approval.l2_remarks = remarks
		approval.l2_actioned_at = datetime.now(timezone.utc)

		if action == "approve":
			approval.l2_status = "approved"
			approval.overall_status = "approved"
			approval.rfq.status = "approved"
			self.approval_repo.save(approval)
			self.rfq_repo.save(approval.rfq)
			self.activity_service.log(
				entity_type="approval",
				entity_id=approval.id,
				action="approval_l2_approved",
				actor_id=normalized_actor_id,
				description=f"L2 approved approval for {approval.rfq.title}",
				metadata={"rfq_id": str(approval.rfq_id), "quotation_id": str(approval.quotation_id)},
			)
			po = self._create_po(approval.id, normalized_actor_id)
			self.notification_service.notify_role(
				"procurement_officer",
				"Approval complete",
				f"Approval complete. PO #{po.po_number} generated for {approval.rfq.title}",
				entity_type="purchase_order",
				entity_id=po.id,
			)
			return {
				"approval": self._attach_warnings(self.approval_repo.get_detail(approval.id)),
				"po": po,
			}

		approval.l2_status = "rejected"
		approval.overall_status = "rejected"
		approval.rfq.status = "rejected"
		self.approval_repo.save(approval)
		self.rfq_repo.save(approval.rfq)
		self.activity_service.log(
			entity_type="approval",
			entity_id=approval.id,
			action="approval_l2_rejected",
			actor_id=normalized_actor_id,
			description=f"L2 rejected approval for {approval.rfq.title}",
			metadata={"rfq_id": str(approval.rfq_id), "quotation_id": str(approval.quotation_id)},
		)
		self.notification_service.notify_role(
			"procurement_officer",
			"Approval rejected at L2",
			f"Approval rejected at L2 for {approval.rfq.title}. Remarks: {remarks}",
			entity_type="approval",
			entity_id=approval.id,
		)
		return {
			"approval": self._attach_warnings(self.approval_repo.get_detail(approval.id)),
			"po": None,
		}

	def check_re_approval(self, rfq_id) -> None:
		existing = self.approval_repo.get_by_rfq_id(self._as_uuid(rfq_id))
		if existing and existing.overall_status in {"rejected", "approved"}:
			raise ForbiddenError("Re-approval not permitted. Create a new RFQ.")

	def _create_po(self, approval_id, actor_id):
		if not self.po_service or not hasattr(self.po_service, "create_po"):
			raise RuntimeError("PO service is not configured")
		return self.po_service.create_po(approval_id=approval_id, actor_id=actor_id)

	@staticmethod
	def _as_uuid(value):
		return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))

	def _attach_warnings(self, approval):
		approval.warnings = []
		if approval.l1_approver_id and approval.rfq and approval.rfq.created_by == approval.l1_approver_id:
			approval.warnings.append("L1 approver is same as procurement officer")
		return approval
