from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class PurchaseOrder(UUIDPrimaryKeyMixin, TimestampMixin, db.Model):
	__tablename__ = "purchase_orders"
	__table_args__ = (
		db.CheckConstraint(
			"status IN ('draft','sent','acknowledged','completed','cancelled')",
			name="ck_purchase_orders_status",
		),
	)

	po_number = db.Column(db.String(30), unique=True, nullable=False)
	rfq_id = db.Column(UUID(as_uuid=True), db.ForeignKey("rfqs.id"), nullable=False)
	quotation_id = db.Column(UUID(as_uuid=True), db.ForeignKey("quotations.id"), nullable=False)
	vendor_id = db.Column(UUID(as_uuid=True), db.ForeignKey("vendors.id"), nullable=False)
	approval_id = db.Column(UUID(as_uuid=True), db.ForeignKey("approvals.id"), nullable=False)
	created_by = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
	bill_to_name = db.Column(db.String(255))
	bill_to_address = db.Column(db.Text)
	bill_to_gstin = db.Column(db.String(20))
	subtotal = db.Column(db.Numeric(15, 2), nullable=False)
	cgst_percentage = db.Column(
		db.Numeric(5, 2),
		nullable=False,
		default=9,
		server_default=db.text("9.00"),
	)
	sgst_percentage = db.Column(
		db.Numeric(5, 2),
		nullable=False,
		default=9,
		server_default=db.text("9.00"),
	)
	igst_percentage = db.Column(
		db.Numeric(5, 2),
		nullable=False,
		default=0,
		server_default=db.text("0.00"),
	)
	cgst_amount = db.Column(
		db.Numeric(15, 2),
		nullable=False,
		default=0,
		server_default=db.text("0"),
	)
	sgst_amount = db.Column(
		db.Numeric(15, 2),
		nullable=False,
		default=0,
		server_default=db.text("0"),
	)
	igst_amount = db.Column(
		db.Numeric(15, 2),
		nullable=False,
		default=0,
		server_default=db.text("0"),
	)
	grand_total = db.Column(db.Numeric(15, 2), nullable=False)
	currency = db.Column(
		db.String(10),
		nullable=False,
		default="INR",
		server_default=db.text("'INR'"),
	)
	exchange_rate = db.Column(
		db.Numeric(15, 6),
		nullable=False,
		default=1,
		server_default=db.text("1.000000"),
	)
	status = db.Column(
		db.String(20),
		nullable=False,
		default="draft",
		server_default=db.text("'draft'"),
	)
	po_date = db.Column(
		db.Date,
		nullable=False,
		server_default=db.func.current_date(),
	)
	delivery_date = db.Column(db.Date)
	notes = db.Column(db.Text)

	rfq = db.relationship("RFQ", back_populates="purchase_orders", lazy="select")
	quotation = db.relationship(
		"Quotation",
		back_populates="purchase_orders",
		lazy="select",
	)
	vendor = db.relationship(
		"Vendor",
		back_populates="purchase_orders",
		lazy="select",
	)
	approval = db.relationship(
		"Approval",
		back_populates="purchase_order",
		lazy="select",
	)
	creator = db.relationship(
		"User",
		back_populates="created_purchase_orders",
		lazy="select",
	)
	invoice = db.relationship(
		"Invoice",
		back_populates="po",
		lazy="select",
		uselist=False,
	)
