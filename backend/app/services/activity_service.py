import logging


class ActivityService:
	def __init__(self, activity_repo):
		self.activity_repo = activity_repo

	def log(
		self,
		entity_type: str,
		entity_id,
		action: str,
		actor_id=None,
		actor_role=None,
		description: str = "",
		metadata: dict = None,
	):
		"""Non-blocking log write. Silently fails and never blocks the API response."""
		try:
			self.activity_repo.log(
				entity_type=entity_type,
				entity_id=entity_id,
				action=action,
				actor_id=actor_id,
				actor_role=actor_role,
				description=description,
				metadata=metadata,
			)
		except Exception as exc:
			logging.getLogger(__name__).error(f"Activity log failed: {exc}")

	def get_all(self, entity_type=None, page=1, per_page=50):
		return self.activity_repo.get_all(entity_type=entity_type, page=page, per_page=per_page)

	def get_for_entity(self, entity_type: str, entity_id: str, page=1, per_page=50):
		return self.activity_repo.get_for_entity(entity_type, entity_id, page=page, per_page=per_page)
