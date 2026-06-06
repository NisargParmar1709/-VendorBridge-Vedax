from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Quotation(UUIDPrimaryKeyMixin, TimestampMixin, db.Model):
	__tablename__ = "quotations"
	__table_args__ = (
		db.UniqueConstraint("rfq_id", "vendor_id", name="uq_quotations_rfq_vendor"),
		db.CheckConstraint(
			"status IN ('draft','submitted','selected','rejected')",
			name="ck_quotations_status",
		),
	)

	rfq_id = db.Column(UUID(as_uuid=True), db.ForeignKey("rfqs.id"), nullable=False)
	vendor_id = db.Column(UUID(as_uuid=True), db.ForeignKey("vendors.id"), nullable=False)
	submitted_by = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"))
	status = db.Column(
		db.String(20),
		nullable=False,
		default="draft",
		server_default=db.text("'draft'"),
	)
	gst_percentage = db.Column(
		db.Numeric(5, 2),
		nullable=False,
		default=18,
		server_default=db.text("18.00"),
	)
	subtotal = db.Column(
		db.Numeric(15, 2),
		nullable=False,
		default=0,
		server_default=db.text("0"),
	)
	tax_amount = db.Column(
		db.Numeric(15, 2),
		nullable=False,
		default=0,
		server_default=db.text("0"),
	)
	grand_total = db.Column(
		db.Numeric(15, 2),
		nullable=False,
		default=0,
		server_default=db.text("0"),
	)
	delivery_days = db.Column(db.Integer)
	payment_terms = db.Column(db.Integer)
	notes = db.Column(db.Text)
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
	submitted_at = db.Column(db.DateTime(timezone=True))

	rfq = db.relationship("RFQ", back_populates="quotations", lazy="select")
	vendor = db.relationship("Vendor", back_populates="quotations", lazy="select")
	submitted_by_user = db.relationship(
		"User",
		back_populates="submitted_quotations",
		lazy="select",
	)
	line_items = db.relationship(
		"QuotationLineItem",
		back_populates="quotation",
		cascade="all, delete-orphan",
		lazy="select",
	)
	purchase_orders = db.relationship(
		"PurchaseOrder",
		back_populates="quotation",
		lazy="select",
	)
	approval = db.relationship(
		"Approval",
		back_populates="quotation",
		lazy="select",
		uselist=False,
	)


class QuotationLineItem(UUIDPrimaryKeyMixin, db.Model):
	__tablename__ = "quotation_line_items"

	quotation_id = db.Column(
		UUID(as_uuid=True),
		db.ForeignKey("quotations.id", ondelete="CASCADE"),
		nullable=False,
	)
	rfq_line_item_id = db.Column(UUID(as_uuid=True), db.ForeignKey("rfq_line_items.id"))
	item_name = db.Column(db.String(255), nullable=False)
	quantity = db.Column(db.Numeric(10, 2), nullable=False)
	unit = db.Column(db.String(50))
	unit_price = db.Column(db.Numeric(15, 2), nullable=False)
	total_price = db.Column(db.Numeric(15, 2), nullable=False)
	created_at = db.Column(
		db.DateTime(timezone=True),
		nullable=False,
		server_default=db.func.now(),
	)

	quotation = db.relationship("Quotation", back_populates="line_items", lazy="select")
	rfq_line_item = db.relationship(
		"RFQLineItem",
		back_populates="quotation_line_items",
		lazy="select",
	)
