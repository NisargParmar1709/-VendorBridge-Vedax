from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class RFQ(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
	__tablename__ = "rfqs"
	__table_args__ = (
		db.CheckConstraint(
			"status IN ('draft','published','under_review','comparison','approval_pending','approved','rejected','expired','closed')",
			name="ck_rfqs_status",
		),
	)

	rfq_number = db.Column(db.String(30), unique=True, nullable=False)
	title = db.Column(db.String(255), nullable=False)
	category = db.Column(db.String(100))
	description = db.Column(db.Text)
	deadline = db.Column(db.Date, nullable=False)
	status = db.Column(
		db.String(30),
		nullable=False,
		default="draft",
		server_default=db.text("'draft'"),
	)
	created_by = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)

	creator = db.relationship("User", back_populates="created_rfqs", lazy="select")
	line_items = db.relationship(
		"RFQLineItem",
		back_populates="rfq",
		cascade="all, delete-orphan",
		order_by="RFQLineItem.sort_order",
		lazy="select",
	)
	vendor_assignments = db.relationship(
		"RFQVendorAssignment",
		back_populates="rfq",
		cascade="all, delete-orphan",
		lazy="select",
	)
	attachments = db.relationship(
		"RFQAttachment",
		back_populates="rfq",
		cascade="all, delete-orphan",
		lazy="select",
	)
	quotations = db.relationship("Quotation", back_populates="rfq", lazy="select")
	approvals = db.relationship("Approval", back_populates="rfq", lazy="select")
	purchase_orders = db.relationship(
		"PurchaseOrder",
		back_populates="rfq",
		lazy="select",
	)


class RFQLineItem(UUIDPrimaryKeyMixin, db.Model):
	__tablename__ = "rfq_line_items"

	rfq_id = db.Column(
		UUID(as_uuid=True),
		db.ForeignKey("rfqs.id", ondelete="CASCADE"),
		nullable=False,
	)
	item_name = db.Column(db.String(255), nullable=False)
	quantity = db.Column(db.Numeric(10, 2), nullable=False)
	unit = db.Column(db.String(50))
	description = db.Column(db.Text)
	sort_order = db.Column(
		db.Integer,
		nullable=False,
		default=0,
		server_default=db.text("0"),
	)
	created_at = db.Column(
		db.DateTime(timezone=True),
		nullable=False,
		server_default=db.func.now(),
	)

	rfq = db.relationship("RFQ", back_populates="line_items", lazy="select")
	quotation_line_items = db.relationship(
		"QuotationLineItem",
		back_populates="rfq_line_item",
		lazy="select",
	)


class RFQVendorAssignment(UUIDPrimaryKeyMixin, db.Model):
	__tablename__ = "rfq_vendor_assignments"
	__table_args__ = (
		db.UniqueConstraint("rfq_id", "vendor_id", name="uq_rfq_vendor_assignments_rfq_vendor"),
	)

	rfq_id = db.Column(
		UUID(as_uuid=True),
		db.ForeignKey("rfqs.id", ondelete="CASCADE"),
		nullable=False,
	)
	vendor_id = db.Column(UUID(as_uuid=True), db.ForeignKey("vendors.id"), nullable=False)
	invited_at = db.Column(
		db.DateTime(timezone=True),
		nullable=False,
		server_default=db.func.now(),
	)
	notified = db.Column(
		db.Boolean,
		nullable=False,
		default=False,
		server_default=db.false(),
	)

	rfq = db.relationship("RFQ", back_populates="vendor_assignments", lazy="select")
	vendor = db.relationship("Vendor", back_populates="rfq_assignments", lazy="select")


class RFQAttachment(UUIDPrimaryKeyMixin, db.Model):
	__tablename__ = "rfq_attachments"

	rfq_id = db.Column(
		UUID(as_uuid=True),
		db.ForeignKey("rfqs.id", ondelete="CASCADE"),
		nullable=False,
	)
	filename = db.Column(db.String(255), nullable=False)
	file_path = db.Column(db.String(500), nullable=False)
	file_size = db.Column(db.Integer)
	mime_type = db.Column(db.String(100))
	uploaded_by = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
	created_at = db.Column(
		db.DateTime(timezone=True),
		nullable=False,
		server_default=db.func.now(),
	)

	rfq = db.relationship("RFQ", back_populates="attachments", lazy="select")
	uploaded_by_user = db.relationship(
		"User",
		back_populates="uploaded_rfq_attachments",
		lazy="select",
	)
