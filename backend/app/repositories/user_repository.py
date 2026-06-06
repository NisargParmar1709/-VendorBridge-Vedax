from app.models.user import User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository):
	def __init__(self):
		super().__init__(User)

	def get_by_email(self, email):
		return self.model.query.filter_by(email=email, is_deleted=False).first()

	def get_active_by_email(self, email):
		return self.model.query.filter_by(
			email=email,
			status="active",
			is_deleted=False,
		).first()

	def get_by_role(self, role):
		return self.model.query.filter_by(role=role, is_deleted=False).all()

	def email_exists(self, email):
		return self.model.query.filter_by(email=email, is_deleted=False).first() is not None

	def get_by_reset_token(self, token):
		for user in self.model.query.filter_by(is_deleted=False).all():
			raw_value = user.additional_info or ""
			if token and token in raw_value:
				return user
		return None
