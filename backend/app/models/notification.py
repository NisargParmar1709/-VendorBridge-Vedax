import uuid

from sqlalchemy import desc
from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


class Notification(db.Model):
	__tablename__ = "notifications"
	__table_args__ = (
		db.CheckConstraint(
			"type IN ('info','success','warning','error')",
			name="ck_notifications_type",
		),
		db.Index("idx_notifications_user", "user_id", "is_read", desc("created_at")),
	)

	id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
	title = db.Column(db.String(255), nullable=False)
	message = db.Column(db.Text, nullable=False)
	type = db.Column(db.String(30), nullable=False)
	entity_type = db.Column(db.String(50))
	entity_id = db.Column(UUID(as_uuid=True))
	is_read = db.Column(
		db.Boolean,
		nullable=False,
		default=False,
		server_default=db.false(),
	)
	created_at = db.Column(
		db.DateTime(timezone=True),
		nullable=False,
		server_default=db.func.now(),
	)

	user = db.relationship("User", back_populates="notifications", lazy="select")
