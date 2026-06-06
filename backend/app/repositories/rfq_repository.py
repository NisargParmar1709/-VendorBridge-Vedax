from datetime import date

from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload

from app.extensions import db
from app.models.rfq import RFQ, RFQVendorAssignment
from app.models.rfq import RFQAttachment, RFQLineItem
from app.repositories.base_repository import BaseRepository

VISIBLE_VENDOR_STATUSES = (
	"published",
	"under_review",
	"comparison",
	"approval_pending",
	"approved",
	"rejected",
	"expired",
	"closed",
)


class RFQRepository(BaseRepository):
	def __init__(self):
		super().__init__(RFQ)

	@staticmethod
	def _detail_options():
		return (
			selectinload(RFQ.creator),
			selectinload(RFQ.line_items),
			selectinload(RFQ.vendor_assignments).selectinload(RFQVendorAssignment.vendor),
			selectinload(RFQ.attachments),
			selectinload(RFQ.quotations),
		)

	def _detail_query(self):
		return self.model.query.options(*self._detail_options())

	def get_by_number(self, rfq_number):
		return self.model.query.filter_by(rfq_number=rfq_number, is_deleted=False).first()

	def get_detail(self, rfq_id):
		return (
			self._detail_query()
			.filter(
				RFQ.id == rfq_id,
				RFQ.is_deleted.is_(False),
			)
			.first()
		)

	def get_vendor_scoped_detail(self, rfq_id, vendor_id):
		return (
			self._detail_query()
			.join(RFQVendorAssignment, RFQVendorAssignment.rfq_id == RFQ.id)
			.filter(
				RFQ.id == rfq_id,
				RFQVendorAssignment.vendor_id == vendor_id,
				RFQ.is_deleted.is_(False),
			)
			.first()
		)

	def get_for_vendor(self, vendor_id, status=None, search=None, page=1, per_page=20):
		query = (
			self.model.query.options(*self._detail_options())
			.join(RFQVendorAssignment, RFQVendorAssignment.rfq_id == RFQ.id)
			.filter(
				RFQVendorAssignment.vendor_id == vendor_id,
				RFQ.status.in_(VISIBLE_VENDOR_STATUSES),
				RFQ.is_deleted.is_(False),
			)
		)

		if status:
			query = query.filter(RFQ.status == status)

		if search:
			pattern = f"%{search}%"
			query = query.filter(
				or_(
					RFQ.rfq_number.ilike(pattern),
					RFQ.title.ilike(pattern),
					RFQ.category.ilike(pattern),
				)
			)

		query = query.order_by(RFQ.created_at.desc())
		paginated = query.paginate(page=page, per_page=per_page, error_out=False)
		return paginated.items, paginated.total

	def search(self, status=None, search=None, page=1, per_page=20):
		query = self.model.query.options(*self._detail_options()).filter(RFQ.is_deleted.is_(False))

		if status:
			query = query.filter(RFQ.status == status)

		if search:
			pattern = f"%{search}%"
			query = query.filter(
				or_(
					RFQ.rfq_number.ilike(pattern),
					RFQ.title.ilike(pattern),
					RFQ.category.ilike(pattern),
				)
			)

		paginated = query.order_by(RFQ.created_at.desc()).paginate(
			page=page,
			per_page=per_page,
			error_out=False,
		)
		return paginated.items, paginated.total

	def create_with_relations(self, rfq, line_items=None, vendor_ids=None):
		db.session.add(rfq)
		db.session.flush()

		self._create_line_items(rfq.id, line_items or [])
		self._create_vendor_assignments(rfq.id, vendor_ids or [])

		db.session.commit()
		return self.get_detail(rfq.id)

	def replace_line_items(self, rfq_id, line_items):
		RFQLineItem.query.filter_by(rfq_id=rfq_id).delete(synchronize_session=False)
		self._create_line_items(rfq_id, line_items)

	def replace_vendor_assignments(self, rfq_id, vendor_ids):
		RFQVendorAssignment.query.filter_by(rfq_id=rfq_id).delete(synchronize_session=False)
		self._create_vendor_assignments(rfq_id, vendor_ids)

	def count_attachments(self, rfq_id):
		return RFQAttachment.query.filter_by(rfq_id=rfq_id).count()

	def create_attachment(self, attachment):
		db.session.add(attachment)
		db.session.commit()
		return attachment

	def get_attachment(self, rfq_id, attachment_id):
		return RFQAttachment.query.filter_by(rfq_id=rfq_id, id=attachment_id).first()

	def delete_attachment(self, attachment):
		db.session.delete(attachment)
		db.session.commit()

	def mark_assignments_notified(self, rfq_id):
		RFQVendorAssignment.query.filter_by(rfq_id=rfq_id).update(
			{RFQVendorAssignment.notified: True},
			synchronize_session=False,
		)
		db.session.commit()

	def get_expired_rfqs(self):
		return (
			self._detail_query()
			.filter(
				RFQ.status == "published",
				RFQ.deadline < date.today(),
				RFQ.is_deleted.is_(False),
			)
			.all()
		)

	def count_active(self):
		return (
			self.model.query.filter(
				RFQ.status.in_(("published", "under_review", "comparison")),
				RFQ.is_deleted.is_(False),
			)
			.count()
		)

	def get_status_breakdown(self):
		return (
			db.session.query(RFQ.status, func.count(RFQ.id))
			.filter(RFQ.is_deleted.is_(False))
			.group_by(RFQ.status)
			.all()
		)

	def export_rows(self):
		rows = (
			self.model.query.filter(RFQ.is_deleted.is_(False))
			.order_by(RFQ.created_at.desc())
			.all()
		)
		return [
			{
				"rfq_number": row.rfq_number,
				"title": row.title,
				"category": row.category,
				"status": row.status,
				"deadline": row.deadline,
				"created_at": row.created_at,
			}
			for row in rows
		]

	def _create_line_items(self, rfq_id, line_items):
		for index, item in enumerate(line_items):
			db.session.add(
				RFQLineItem(
					rfq_id=rfq_id,
					item_name=item["item_name"],
					quantity=item["quantity"],
					unit=item.get("unit"),
					description=item.get("description"),
					sort_order=item.get("sort_order", index),
				)
			)

	def _create_vendor_assignments(self, rfq_id, vendor_ids):
		for vendor_id in dict.fromkeys(vendor_ids):
			db.session.add(
				RFQVendorAssignment(
					rfq_id=rfq_id,
					vendor_id=vendor_id,
				)
			)
