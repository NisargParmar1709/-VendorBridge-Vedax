from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Approval(UUIDPrimaryKeyMixin, TimestampMixin, db.Model):
	__tablename__ = "approvals"
	__table_args__ = (
		db.CheckConstraint(
			"l1_status IN ('pending','approved','rejected')",
			name="ck_approvals_l1_status",
		),
		db.CheckConstraint(
			"l2_status IN ('pending','approved','rejected','skipped')",
			name="ck_approvals_l2_status",
		),
		db.CheckConstraint(
			"overall_status IN ('pending','approved','rejected')",
			name="ck_approvals_overall_status",
		),
	)

	rfq_id = db.Column(UUID(as_uuid=True), db.ForeignKey("rfqs.id"), nullable=False)
	quotation_id = db.Column(UUID(as_uuid=True), db.ForeignKey("quotations.id"), nullable=False)
	l1_approver_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"))
	l2_approver_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"))
	l1_status = db.Column(
		db.String(20),
		nullable=False,
		default="pending",
		server_default=db.text("'pending'"),
	)
	l2_status = db.Column(
		db.String(20),
		nullable=False,
		default="pending",
		server_default=db.text("'pending'"),
	)
	l1_remarks = db.Column(db.Text)
	l2_remarks = db.Column(db.Text)
	l1_actioned_at = db.Column(db.DateTime(timezone=True))
	l2_actioned_at = db.Column(db.DateTime(timezone=True))
	overall_status = db.Column(
		db.String(20),
		nullable=False,
		default="pending",
		server_default=db.text("'pending'"),
	)

	rfq = db.relationship("RFQ", back_populates="approvals", lazy="select")
	quotation = db.relationship(
		"Quotation",
		back_populates="approval",
		lazy="select",
	)
	l1_approver = db.relationship(
		"User",
		back_populates="l1_approvals",
		lazy="select",
		foreign_keys=[l1_approver_id],
	)
	l2_approver = db.relationship(
		"User",
		back_populates="l2_approvals",
		lazy="select",
		foreign_keys=[l2_approver_id],
	)
	purchase_order = db.relationship(
		"PurchaseOrder",
		back_populates="approval",
		lazy="select",
		uselist=False,
	)
