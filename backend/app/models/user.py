import bcrypt

from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
	__tablename__ = "users"
	__table_args__ = (
		db.CheckConstraint(
			"role IN ('admin','procurement_officer','manager','vendor')",
			name="ck_users_role",
		),
		db.CheckConstraint(
			"status IN ('active','inactive','pending')",
			name="ck_users_status",
		),
	)

	first_name = db.Column(db.String(100), nullable=False)
	last_name = db.Column(db.String(100), nullable=False)
	email = db.Column(db.String(255), unique=True, nullable=False)
	password_hash = db.Column(db.String(255), nullable=False)
	phone = db.Column(db.String(20))
	role = db.Column(db.String(30), nullable=False)
	status = db.Column(
		db.String(20),
		nullable=False,
		default="active",
		server_default=db.text("'active'"),
	)
	photo_url = db.Column(db.String(500))
	country = db.Column(db.String(100))
	additional_info = db.Column(db.Text)
	vendor_id = db.Column(UUID(as_uuid=True), db.ForeignKey("vendors.id", ondelete="SET NULL"))

	vendor = db.relationship("Vendor", back_populates="users", lazy="select")
	created_rfqs = db.relationship("RFQ", back_populates="creator", lazy="select")
	uploaded_rfq_attachments = db.relationship(
		"RFQAttachment",
		back_populates="uploaded_by_user",
		lazy="select",
	)
	submitted_quotations = db.relationship(
		"Quotation",
		back_populates="submitted_by_user",
		lazy="select",
	)
	l1_approvals = db.relationship(
		"Approval",
		back_populates="l1_approver",
		lazy="select",
		foreign_keys="Approval.l1_approver_id",
	)
	l2_approvals = db.relationship(
		"Approval",
		back_populates="l2_approver",
		lazy="select",
		foreign_keys="Approval.l2_approver_id",
	)
	created_purchase_orders = db.relationship(
		"PurchaseOrder",
		back_populates="creator",
		lazy="select",
	)
	created_invoices = db.relationship(
		"Invoice",
		back_populates="creator",
		lazy="select",
	)
	activity_logs = db.relationship("ActivityLog", back_populates="actor", lazy="select")
	notifications = db.relationship("Notification", back_populates="user", lazy="select")

	def check_password(self, password: str) -> bool:
		return bcrypt.checkpw(password.encode(), self.password_hash.encode())

	@staticmethod
	def hash_password(password: str) -> str:
		return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()
