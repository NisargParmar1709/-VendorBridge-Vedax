from decimal import Decimal

from sqlalchemy import case, func, or_
from sqlalchemy.orm import selectinload

from app.extensions import db
from app.models.purchase_order import PurchaseOrder
from app.models.quotation import Quotation
from app.models.rfq import RFQVendorAssignment
from app.models.vendor import Vendor
from app.repositories.base_repository import BaseRepository


class VendorRepository(BaseRepository):
	def __init__(self):
		super().__init__(Vendor)

	def get_by_gst_number(self, gst_number):
		return self.model.query.filter_by(gst_number=gst_number, is_deleted=False).first()

	def get_by_ids(self, vendor_ids, active_only=False):
		if not vendor_ids:
			return []

		query = self.model.query.filter(
			Vendor.id.in_(vendor_ids),
			Vendor.is_deleted.is_(False),
		)
		if active_only:
			query = query.filter(Vendor.status == "active")

		return query.all()

	def get_detail(self, vendor_id):
		return (
			self.model.query.options(selectinload(Vendor.users))
			.filter(
				Vendor.id == vendor_id,
				Vendor.is_deleted.is_(False),
			)
			.first()
		)

	def search(self, search=None, category=None, status=None, page=1, per_page=20):
		query = self.model.query.filter_by(is_deleted=False)

		if search:
			pattern = f"%{search}%"
			query = query.filter(
				or_(
					Vendor.name.ilike(pattern),
					Vendor.contact_name.ilike(pattern),
					Vendor.contact_email.ilike(pattern),
					Vendor.gst_number.ilike(pattern),
				)
			)

		if category:
			query = query.filter(Vendor.category == category)

		if status:
			query = query.filter(Vendor.status == status)

		paginated = query.order_by(Vendor.created_at.desc()).paginate(
			page=page,
			per_page=per_page,
			error_out=False,
		)
		return paginated.items, paginated.total

	def gst_exists(self, gst_number, exclude_id=None):
		query = self.model.query.filter(
			Vendor.gst_number == gst_number,
			Vendor.is_deleted.is_(False),
		)

		if exclude_id:
			query = query.filter(Vendor.id != exclude_id)

		return query.first() is not None

	def get_performance(self, vendor_id):
		vendor = self.get_detail(vendor_id)

		total_rfqs = (
			db.session.query(func.count(RFQVendorAssignment.id))
			.filter(RFQVendorAssignment.vendor_id == vendor_id)
			.scalar()
			or 0
		)

		total_quotations, selected_quotations, avg_delivery_days = (
			db.session.query(
				func.count(Quotation.id),
				func.coalesce(
					func.sum(case((Quotation.status == "selected", 1), else_=0)),
					0,
				),
				func.avg(Quotation.delivery_days),
			)
			.filter(Quotation.vendor_id == vendor_id)
			.first()
		)

		completed_purchase_orders, total_order_value = (
			db.session.query(
				func.count(PurchaseOrder.id),
				func.coalesce(func.sum(PurchaseOrder.grand_total), 0),
			)
			.filter(
				PurchaseOrder.vendor_id == vendor_id,
				PurchaseOrder.status == "completed",
			)
			.first()
		)

		return {
			"vendor_id": vendor_id,
			"total_rfqs": int(total_rfqs or 0),
			"total_quotations": int(total_quotations or 0),
			"selected_quotations": int(selected_quotations or 0),
			"completed_purchase_orders": int(completed_purchase_orders or 0),
			"total_order_value": total_order_value or Decimal("0"),
			"avg_delivery_days": float(avg_delivery_days) if avg_delivery_days is not None else 0.0,
			"rating": vendor.rating if vendor else Decimal("0"),
		}

	def count_active(self):
		return (
			self.model.query.filter(
				Vendor.status == "active",
				Vendor.is_deleted.is_(False),
			)
			.count()
		)

	def get_report_performance(self):
		rfq_subquery = (
			db.session.query(
				RFQVendorAssignment.vendor_id.label("vendor_id"),
				func.count(RFQVendorAssignment.id).label("total_rfqs"),
			)
			.group_by(RFQVendorAssignment.vendor_id)
			.subquery()
		)

		quotation_subquery = (
			db.session.query(
				Quotation.vendor_id.label("vendor_id"),
				func.count(Quotation.id).label("total_quotations"),
				func.coalesce(
					func.sum(case((Quotation.status == "selected", 1), else_=0)),
					0,
				).label("wins"),
			)
			.group_by(Quotation.vendor_id)
			.subquery()
		)

		po_subquery = (
			db.session.query(
				PurchaseOrder.vendor_id.label("vendor_id"),
				func.coalesce(
					func.sum(
						case(
							(PurchaseOrder.status != "cancelled", PurchaseOrder.grand_total),
							else_=0,
						)
					),
					0,
				).label("total_order_value"),
			)
			.group_by(PurchaseOrder.vendor_id)
			.subquery()
		)

		return (
			db.session.query(
				Vendor.id.label("vendor_id"),
				Vendor.name.label("vendor_name"),
				Vendor.category.label("category"),
				Vendor.rating.label("rating"),
				func.coalesce(rfq_subquery.c.total_rfqs, 0).label("total_rfqs"),
				func.coalesce(quotation_subquery.c.total_quotations, 0).label("total_quotations"),
				func.coalesce(quotation_subquery.c.wins, 0).label("wins"),
				func.coalesce(po_subquery.c.total_order_value, 0).label("total_order_value"),
			)
			.outerjoin(rfq_subquery, rfq_subquery.c.vendor_id == Vendor.id)
			.outerjoin(quotation_subquery, quotation_subquery.c.vendor_id == Vendor.id)
			.outerjoin(po_subquery, po_subquery.c.vendor_id == Vendor.id)
			.filter(Vendor.is_deleted.is_(False))
			.order_by(func.coalesce(po_subquery.c.total_order_value, 0).desc(), Vendor.name.asc())
			.all()
		)

	def export_rows(self):
		rows = (
			self.model.query.filter(Vendor.is_deleted.is_(False))
			.order_by(Vendor.created_at.desc())
			.all()
		)
		return [
			{
				"name": row.name,
				"category": row.category,
				"gst_number": row.gst_number,
				"contact_email": row.contact_email,
				"status": row.status,
				"rating": row.rating,
				"total_orders": row.total_orders,
			}
			for row in rows
		]
