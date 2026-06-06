from app.extensions import db
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Vendor(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
	__tablename__ = "vendors"
	__table_args__ = (
		db.CheckConstraint(
			"status IN ('active','pending','blocked','inactive')",
			name="ck_vendors_status",
		),
	)

	name = db.Column(db.String(255), nullable=False)
	category = db.Column(db.String(100), nullable=False)
	gst_number = db.Column(db.String(20), unique=True)
	contact_name = db.Column(db.String(100))
	contact_email = db.Column(db.String(255), nullable=False)
	contact_phone = db.Column(db.String(20))
	address = db.Column(db.Text)
	city = db.Column(db.String(100))
	state = db.Column(db.String(100))
	country = db.Column(
		db.String(100),
		nullable=False,
		default="India",
		server_default=db.text("'India'"),
	)
	pincode = db.Column(db.String(20))
	bank_name = db.Column(db.String(100))
	bank_account = db.Column(db.String(50))
	bank_ifsc = db.Column(db.String(20))
	rating = db.Column(
		db.Numeric(3, 2),
		default=0,
		server_default=db.text("0.00"),
	)
	total_orders = db.Column(
		db.Integer,
		nullable=False,
		default=0,
		server_default=db.text("0"),
	)
	status = db.Column(
		db.String(20),
		nullable=False,
		default="pending",
		server_default=db.text("'pending'"),
	)
	notes = db.Column(db.Text)

	users = db.relationship("User", back_populates="vendor", lazy="select")
	rfq_assignments = db.relationship(
		"RFQVendorAssignment",
		back_populates="vendor",
		lazy="select",
	)
	quotations = db.relationship("Quotation", back_populates="vendor", lazy="select")
	purchase_orders = db.relationship(
		"PurchaseOrder",
		back_populates="vendor",
		lazy="select",
	)
	invoices = db.relationship("Invoice", back_populates="vendor", lazy="select")
