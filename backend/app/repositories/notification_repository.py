from app.extensions import db
from app.models.notification import Notification
from app.utils.exceptions import NotFoundError


class NotificationRepository:
    def create(self, user_id, title, message, type, entity_type=None, entity_id=None):
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    def get_for_user(self, user_id, page=1, per_page=30):
        paginated = (
            Notification.query.filter_by(user_id=user_id)
            .order_by(Notification.created_at.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )
        return paginated.items, paginated.total

    def count_unread(self, user_id):
        return Notification.query.filter_by(user_id=user_id, is_read=False).count()

    def mark_read(self, notification_id, user_id):
        notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        if not notification:
            raise NotFoundError("Notification not found")

        notification.is_read = True
        db.session.commit()
        return notification

    def mark_all_read(self, user_id):
        updated = Notification.query.filter_by(user_id=user_id, is_read=False).update(
            {Notification.is_read: True},
            synchronize_session=False,
        )
        db.session.commit()
        return updated