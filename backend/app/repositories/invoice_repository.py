from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.extensions import db
from app.models.invoice import Invoice
from app.models.purchase_order import PurchaseOrder
from app.models.quotation import Quotation
from app.models.vendor import Vendor
from app.repositories.base_repository import BaseRepository


class InvoiceRepository(BaseRepository):
	def __init__(self):
		super().__init__(Invoice)

	@staticmethod
	def _detail_options():
		return (
			selectinload(Invoice.vendor),
			selectinload(Invoice.po).selectinload(PurchaseOrder.vendor),
			selectinload(Invoice.po).selectinload(PurchaseOrder.rfq),
			selectinload(Invoice.po).selectinload(PurchaseOrder.quotation).selectinload(Quotation.line_items),
		)

	def _detail_query(self):
		return self.model.query.options(*self._detail_options())

	def get_detail(self, invoice_id):
		return self._detail_query().filter(Invoice.id == invoice_id).first()

	def get_by_po_id(self, po_id):
		return self._detail_query().filter_by(po_id=po_id).first()

	def get_for_vendor(self, vendor_id, page=1, per_page=20):
		paginated = (
			self._detail_query()
			.filter_by(vendor_id=vendor_id)
			.order_by(Invoice.created_at.desc())
			.paginate(page=page, per_page=per_page, error_out=False)
		)
		return paginated.items, paginated.total

	def search(self, status=None, page=1, per_page=20):
		query = self._detail_query()

		if status:
			query = query.filter(Invoice.status == status)

		paginated = query.order_by(Invoice.created_at.desc()).paginate(
			page=page,
			per_page=per_page,
			error_out=False,
		)
		return paginated.items, paginated.total

	def get_recent(self, limit=5):
		return self._detail_query().order_by(Invoice.created_at.desc()).limit(limit).all()

	def get_status_breakdown(self):
		return db.session.query(Invoice.status, func.count(Invoice.id)).group_by(Invoice.status).all()

	def export_rows(self):
		rows = (
			db.session.query(
				Invoice.invoice_number,
				PurchaseOrder.po_number,
				Vendor.name,
				Invoice.status,
				Invoice.currency,
				Invoice.grand_total,
				Invoice.invoice_date,
				Invoice.due_date,
			)
			.join(PurchaseOrder, PurchaseOrder.id == Invoice.po_id)
			.join(Vendor, Vendor.id == Invoice.vendor_id)
			.order_by(Invoice.created_at.desc())
			.all()
		)
		return [
			{
				"invoice_number": row.invoice_number,
				"po_number": row.po_number,
				"vendor_name": row.name,
				"status": row.status,
				"currency": row.currency,
				"grand_total": row.grand_total,
				"invoice_date": row.invoice_date,
				"due_date": row.due_date,
			}
			for row in rows
		]
