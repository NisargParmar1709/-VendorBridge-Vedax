import uuid

from sqlalchemy import desc
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.extensions import db


class ActivityLog(db.Model):
	__tablename__ = "activity_logs"

	id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	entity_type = db.Column(db.String(50), nullable=False)
	entity_id = db.Column(UUID(as_uuid=True), nullable=False)
	action = db.Column(db.String(100), nullable=False)
	actor_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"))
	actor_role = db.Column(db.String(30))
	description = db.Column(db.Text, nullable=False)
	metadata_json = db.Column("metadata", JSONB)
	created_at = db.Column(
		db.DateTime(timezone=True),
		nullable=False,
		server_default=db.func.now(),
	)

	__table_args__ = (
		db.Index("idx_activity_logs_entity", "entity_type", "entity_id"),
		db.Index("idx_activity_logs_actor", "actor_id"),
		db.Index("idx_activity_logs_created", desc("created_at")),
	)

	actor = db.relationship("User", back_populates="activity_logs", lazy="select")
