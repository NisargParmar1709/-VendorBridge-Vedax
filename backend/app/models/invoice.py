from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Invoice(UUIDPrimaryKeyMixin, TimestampMixin, db.Model):
	__tablename__ = "invoices"
	__table_args__ = (
		db.CheckConstraint(
			"status IN ('draft','sent','paid','overdue','voided')",
			name="ck_invoices_status",
		),
	)

	invoice_number = db.Column(db.String(30), unique=True, nullable=False)
	po_id = db.Column(UUID(as_uuid=True), db.ForeignKey("purchase_orders.id"), nullable=False)
	vendor_id = db.Column(UUID(as_uuid=True), db.ForeignKey("vendors.id"), nullable=False)
	created_by = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
	invoice_date = db.Column(
		db.Date,
		nullable=False,
		server_default=db.func.current_date(),
	)
	due_date = db.Column(db.Date)
	subtotal = db.Column(db.Numeric(15, 2), nullable=False)
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
	status = db.Column(
		db.String(20),
		nullable=False,
		default="draft",
		server_default=db.text("'draft'"),
	)
	email_sent_at = db.Column(db.DateTime(timezone=True))
	email_sent_to = db.Column(db.String(255))
	paid_at = db.Column(db.DateTime(timezone=True))
	notes = db.Column(db.Text)

	po = db.relationship("PurchaseOrder", back_populates="invoice", lazy="select")
	vendor = db.relationship("Vendor", back_populates="invoices", lazy="select")
	creator = db.relationship("User", back_populates="created_invoices", lazy="select")
