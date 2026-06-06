import uuid


class NotificationService:
	def __init__(self, notification_repo, user_repo):
		self.notification_repo = notification_repo
		self.user_repo = user_repo

	@staticmethod
	def _serialize(notification):
		return {
			"id": str(notification.id),
			"user_id": str(notification.user_id),
			"title": notification.title,
			"message": notification.message,
			"type": notification.type,
			"entity_type": notification.entity_type,
			"entity_id": str(notification.entity_id) if notification.entity_id else None,
			"is_read": notification.is_read,
			"created_at": notification.created_at.isoformat() if notification.created_at else None,
		}

	def notify_user(
		self,
		user_id,
		title: str,
		message: str,
		type: str = "info",
		entity_type=None,
		entity_id=None,
	):
		return self.notification_repo.create(
			user_id=user_id,
			title=title,
			message=message,
			type=type,
			entity_type=entity_type,
			entity_id=entity_id,
		)

	def notify_role(
		self,
		role: str,
		title: str,
		message: str,
		type: str = "info",
		entity_type=None,
		entity_id=None,
	):
		users = self.user_repo.get_by_role(role)
		notifications = []
		for user in users:
			if user.status != "active":
				continue
			notifications.append(
				self.notify_user(
					user_id=user.id,
					title=title,
					message=message,
					type=type,
					entity_type=entity_type,
					entity_id=entity_id,
				)
			)
		return notifications

	def get_for_user(self, user_id, page=1, per_page=30):
		normalized_user_id = uuid.UUID(str(user_id))
		notifications, _total = self.notification_repo.get_for_user(
			normalized_user_id,
			page=page,
			per_page=per_page,
		)
		unread_count = self.notification_repo.count_unread(normalized_user_id)
		return {
			"notifications": [self._serialize(notification) for notification in notifications],
			"unread_count": unread_count,
			"total": _total,
		}

	def mark_read(self, notification_id, user_id):
		notification = self.notification_repo.mark_read(
			uuid.UUID(str(notification_id)),
			uuid.UUID(str(user_id)),
		)
		return self._serialize(notification)

	def mark_all_read(self, user_id):
		self.notification_repo.mark_all_read(uuid.UUID(str(user_id)))
		return {"message": "All notifications marked as read"}
