from sqlalchemy.orm import selectinload

from app.extensions import db
from app.models.quotation import Quotation, QuotationLineItem
from app.models.rfq import RFQ, RFQLineItem
from app.repositories.base_repository import BaseRepository


class QuotationRepository(BaseRepository):
	def __init__(self):
		super().__init__(Quotation)

	@staticmethod
	def _detail_options():
		return (
			selectinload(Quotation.vendor),
			selectinload(Quotation.line_items).selectinload(QuotationLineItem.rfq_line_item),
			selectinload(Quotation.rfq).selectinload(RFQ.line_items),
		)

	def _detail_query(self):
		return self.model.query.options(*self._detail_options())

	def get_detail(self, quotation_id):
		return self._detail_query().filter(Quotation.id == quotation_id).first()

	def get_by_rfq_and_vendor(self, rfq_id, vendor_id):
		return self._detail_query().filter_by(rfq_id=rfq_id, vendor_id=vendor_id).first()

	def get_for_rfq(self, rfq_id):
		return (
			self._detail_query()
			.filter(Quotation.rfq_id == rfq_id)
			.order_by(Quotation.created_at.desc())
			.all()
		)

	def get_submitted_for_rfq(self, rfq_id):
		return (
			self._detail_query()
			.filter_by(rfq_id=rfq_id, status="submitted")
			.order_by(Quotation.created_at.asc())
			.all()
		)

	def get_for_vendor(self, vendor_id, page=1, per_page=20):
		paginated = (
			self._detail_query()
			.filter_by(vendor_id=vendor_id)
			.order_by(Quotation.created_at.desc())
			.paginate(page=page, per_page=per_page, error_out=False)
		)
		return paginated.items, paginated.total

	def get_all_paginated(self, page=1, per_page=20, status=None, rfq_id=None):
		query = self._detail_query()
		if status:
			query = query.filter(Quotation.status == status)
		if rfq_id:
			query = query.filter(Quotation.rfq_id == rfq_id)
		paginated = (
			query
			.order_by(Quotation.created_at.desc())
			.paginate(page=page, per_page=per_page, error_out=False)
		)
		return paginated.items, paginated.total

	def save_with_line_items(self, quotation, line_items):
		db.session.add(quotation)
		db.session.flush()

		QuotationLineItem.query.filter_by(quotation_id=quotation.id).delete(
			synchronize_session=False,
		)

		for item in line_items:
			db.session.add(
				QuotationLineItem(
					quotation_id=quotation.id,
					rfq_line_item_id=item.get("rfq_line_item_id"),
					item_name=item["item_name"],
					quantity=item["quantity"],
					unit=item.get("unit"),
					unit_price=item["unit_price"],
					total_price=item["total_price"],
				)
			)

		db.session.commit()
		return self.get_detail(quotation.id)
