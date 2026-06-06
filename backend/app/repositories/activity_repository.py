from app.extensions import db
from app.models.activity_log import ActivityLog


class ActivityRepository:
	def log(self, entity_type, entity_id, action, actor_id, actor_role, description, metadata=None):
		activity = ActivityLog(
			entity_type=entity_type,
			entity_id=entity_id,
			action=action,
			actor_id=actor_id,
			actor_role=actor_role,
			description=description,
			metadata_json=metadata,
		)
		db.session.add(activity)
		db.session.commit()
		return activity

	def get_for_entity(self, entity_type, entity_id, page=1, per_page=50):
		paginated = (
			ActivityLog.query.filter_by(entity_type=entity_type, entity_id=entity_id)
			.order_by(ActivityLog.created_at.desc())
			.paginate(page=page, per_page=per_page, error_out=False)
		)
		return paginated.items, paginated.total

	def get_all(self, entity_type=None, page=1, per_page=50):
		query = ActivityLog.query

		if entity_type:
			query = query.filter(ActivityLog.entity_type == entity_type)

		paginated = query.order_by(ActivityLog.created_at.desc()).paginate(
			page=page,
			per_page=per_page,
			error_out=False,
		)
		return paginated.items, paginated.total
