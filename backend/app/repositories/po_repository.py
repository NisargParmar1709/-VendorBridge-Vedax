from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.extensions import db
from app.models.rfq import RFQ
from app.models.quotation import Quotation
from app.models.purchase_order import PurchaseOrder
from app.models.vendor import Vendor
from app.repositories.base_repository import BaseRepository


class PORepository(BaseRepository):
	def __init__(self):
		super().__init__(PurchaseOrder)

	@staticmethod
	def _detail_options():
		return (
			selectinload(PurchaseOrder.vendor),
			selectinload(PurchaseOrder.approval),
			selectinload(PurchaseOrder.rfq),
			selectinload(PurchaseOrder.quotation).selectinload(Quotation.vendor),
			selectinload(PurchaseOrder.quotation).selectinload(Quotation.line_items),
			selectinload(PurchaseOrder.invoice),
		)

	def _detail_query(self):
		return self.model.query.options(*self._detail_options())

	def get_detail(self, po_id):
		return self._detail_query().filter(PurchaseOrder.id == po_id).first()

	def get_by_number(self, po_number):
		return self._detail_query().filter_by(po_number=po_number).first()

	def get_for_vendor(self, vendor_id, page=1, per_page=20):
		paginated = (
			self._detail_query()
			.filter_by(vendor_id=vendor_id)
			.order_by(PurchaseOrder.created_at.desc())
			.paginate(page=page, per_page=per_page, error_out=False)
		)
		return paginated.items, paginated.total

	def search(self, status=None, vendor_id=None, page=1, per_page=20):
		query = self._detail_query()

		if status:
			query = query.filter(PurchaseOrder.status == status)

		if vendor_id:
			query = query.filter(PurchaseOrder.vendor_id == vendor_id)

		paginated = query.order_by(PurchaseOrder.created_at.desc()).paginate(
			page=page,
			per_page=per_page,
			error_out=False,
		)
		return paginated.items, paginated.total

	def sum_grand_total(self):
		total = (
			db.session.query(func.coalesce(func.sum(PurchaseOrder.grand_total), 0))
			.filter(PurchaseOrder.status != "cancelled")
			.scalar()
		)
		return total or Decimal("0")

	def get_recent(self, limit=5):
		return self._detail_query().order_by(PurchaseOrder.created_at.desc()).limit(limit).all()

	def get_spending_by_month(self, start_date=None, end_date=None, limit=None):
		year_part = func.extract("year", PurchaseOrder.po_date)
		month_part = func.extract("month", PurchaseOrder.po_date)
		total_amount = func.coalesce(func.sum(PurchaseOrder.grand_total), 0)

		query = (
			db.session.query(
				year_part.label("year"),
				month_part.label("month"),
				total_amount.label("total"),
			)
			.filter(PurchaseOrder.status != "cancelled")
		)

		if start_date:
			query = query.filter(PurchaseOrder.po_date >= start_date)
		if end_date:
			query = query.filter(PurchaseOrder.po_date <= end_date)

		query = query.group_by(year_part, month_part).order_by(year_part.asc(), month_part.asc())
		if limit:
			query = query.limit(limit)

		return [
			(int(row.year), int(row.month), row.total or Decimal("0"))
			for row in query.all()
		]

	def get_top_vendors_by_spend(self, limit=5):
		total_spend = func.coalesce(func.sum(PurchaseOrder.grand_total), 0)
		return (
			db.session.query(
				Vendor.id.label("vendor_id"),
				Vendor.name.label("vendor_name"),
				total_spend.label("total_spend"),
				func.count(PurchaseOrder.id).label("total_orders"),
			)
			.join(Vendor, Vendor.id == PurchaseOrder.vendor_id)
			.filter(PurchaseOrder.status != "cancelled")
			.group_by(Vendor.id, Vendor.name)
			.order_by(total_spend.desc(), Vendor.name.asc())
			.limit(limit)
			.all()
		)

	def export_rows(self):
		rows = (
			db.session.query(
				PurchaseOrder.po_number,
				RFQ.rfq_number,
				Vendor.name,
				PurchaseOrder.status,
				PurchaseOrder.currency,
				PurchaseOrder.grand_total,
				PurchaseOrder.po_date,
				PurchaseOrder.delivery_date,
			)
			.join(RFQ, RFQ.id == PurchaseOrder.rfq_id)
			.join(Vendor, Vendor.id == PurchaseOrder.vendor_id)
			.order_by(PurchaseOrder.created_at.desc())
			.all()
		)
		return [
			{
				"po_number": row.po_number,
				"rfq_number": row.rfq_number,
				"vendor_name": row.name,
				"status": row.status,
				"currency": row.currency,
				"grand_total": row.grand_total,
				"po_date": row.po_date,
				"delivery_date": row.delivery_date,
			}
			for row in rows
		]
