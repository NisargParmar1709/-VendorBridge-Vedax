import uuid

from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


class TimestampMixin:
    created_at = db.Column(
        db.DateTime(timezone=True),
        server_default=db.func.now(),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        server_default=db.func.now(),
        onupdate=db.func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    is_deleted = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false(),
    )


class UUIDPrimaryKeyMixin:
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)