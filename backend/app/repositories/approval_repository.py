from app.extensions import db
from app.models.approval import Approval
from app.models.quotation import Quotation
from app.models.rfq import RFQ
from app.repositories.base_repository import BaseRepository
from sqlalchemy.orm import selectinload


class ApprovalRepository(BaseRepository):
	def __init__(self):
		super().__init__(Approval)

	@staticmethod
	def _detail_options():
		return (
			selectinload(Approval.rfq),
			selectinload(Approval.quotation).selectinload(Quotation.vendor),
			selectinload(Approval.quotation).selectinload(Quotation.line_items),
			selectinload(Approval.purchase_order),
		)

	def _detail_query(self):
		return self.model.query.options(*self._detail_options())

	def create_for_selection(self, approval, rfq, quotation):
		db.session.add_all([rfq, quotation, approval])
		db.session.commit()
		return self.get_detail(approval.id)

	def get_detail(self, approval_id):
		return self._detail_query().filter(Approval.id == approval_id).first()

	def get_by_rfq_id(self, rfq_id):
		return self._detail_query().filter_by(rfq_id=rfq_id).first()

	def get_pending_for_manager(self, page=1, per_page=20):
		paginated = (
			self._detail_query()
			.filter_by(overall_status="pending")
			.order_by(Approval.created_at.desc())
			.paginate(page=page, per_page=per_page, error_out=False)
		)
		return paginated.items, paginated.total

	def search(self, status=None, page=1, per_page=20):
		query = self._detail_query().order_by(Approval.created_at.desc())
		if status:
			query = query.filter(Approval.overall_status == status)
		paginated = query.paginate(page=page, per_page=per_page, error_out=False)
		return paginated.items, paginated.total

	def get_pending_l1(self):
		return self.model.query.filter_by(l1_status="pending").all()

	def get_pending_l2(self):
		return self.model.query.filter(
			Approval.l1_status == "approved",
			Approval.l2_status == "pending",
		).all()

	def count_pending(self):
		return self.model.query.filter(Approval.overall_status == "pending").count()
