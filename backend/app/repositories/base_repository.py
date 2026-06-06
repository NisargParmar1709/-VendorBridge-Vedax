from app.extensions import db


class BaseRepository:
	def __init__(self, model):
		self.model = model

	def _base_query(self):
		query = self.model.query
		if hasattr(self.model, "is_deleted"):
			query = query.filter_by(is_deleted=False)
		return query

	def get_by_id(self, id) -> object | None:
		return self._base_query().filter_by(id=id).first()

	def get_all(self, page=1, per_page=20, **filters) -> tuple:
		query = self._base_query().filter_by(**filters)
		paginated = query.paginate(page=page, per_page=per_page, error_out=False)
		return paginated.items, paginated.total

	def save(self, obj) -> object:
		db.session.add(obj)
		db.session.commit()
		return obj

	def soft_delete(self, obj) -> object:
		if not hasattr(obj, "is_deleted"):
			raise AttributeError(f"{self.model.__name__} does not support soft delete")

		obj.is_deleted = True
		db.session.commit()
		return obj
