import json
import secrets
import uuid

from flask_jwt_extended import create_access_token

from app.models.user import User
from app.utils.exceptions import ConflictError, ForbiddenError, UnauthorizedError, ValidationError


class AuthService:
	PROFILE_NOTES_KEY = "notes"
	RESET_TOKEN_KEY = "password_reset_token"

	def __init__(self, user_repo, activity_service):
		self.user_repo = user_repo
		self.activity_service = activity_service

	@staticmethod
	def _normalize_uuid(value):
		try:
			return uuid.UUID(str(value))
		except (TypeError, ValueError) as exc:
			raise UnauthorizedError("Invalid credentials") from exc

	@staticmethod
	def _parse_additional_info(raw_value):
		if not raw_value:
			return {}

		try:
			parsed = json.loads(raw_value)
			if isinstance(parsed, dict):
				return parsed
		except (TypeError, ValueError, json.JSONDecodeError):
			pass

		return {AuthService.PROFILE_NOTES_KEY: raw_value}

	@staticmethod
	def _dump_additional_info(payload):
		if not payload:
			return None

		if set(payload.keys()) == {AuthService.PROFILE_NOTES_KEY}:
			return payload[AuthService.PROFILE_NOTES_KEY]

		return json.dumps(payload)

	@classmethod
	def serialize_user(cls, user: User) -> dict:
		additional_info = cls._parse_additional_info(user.additional_info)
		additional_info.pop(cls.RESET_TOKEN_KEY, None)
		additional_info.pop("password_reset_requested_at", None)

		safe_additional_info = None
		if additional_info:
			safe_additional_info = (
				additional_info.get(cls.PROFILE_NOTES_KEY)
				if set(additional_info.keys()) == {cls.PROFILE_NOTES_KEY}
				else additional_info
			)

		return {
			"id": str(user.id),
			"first_name": user.first_name,
			"last_name": user.last_name,
			"email": user.email,
			"phone": user.phone,
			"role": user.role,
			"status": user.status,
			"photo_url": user.photo_url,
			"country": user.country,
			"additional_info": safe_additional_info,
			"vendor_id": str(user.vendor_id) if user.vendor_id else None,
			"created_at": user.created_at.isoformat() if user.created_at else None,
			"updated_at": user.updated_at.isoformat() if user.updated_at else None,
		}

	def register(self, data: dict) -> dict:
		if self.user_repo.email_exists(data["email"]):
			raise ConflictError("Email already registered")

		user = User(
			first_name=data["first_name"],
			last_name=data["last_name"],
			email=data["email"],
			password_hash=User.hash_password(data["password"]),
			phone=data.get("phone"),
			role=data["role"],
			status="active",
		)
		self.user_repo.save(user)
		self.activity_service.log(
			entity_type="user",
			entity_id=user.id,
			action="user_registered",
			actor_id=user.id,
			actor_role=user.role,
			description=f"User {user.email} registered",
		)
		return {"user": self.serialize_user(user)}

	def login(self, email: str, password: str) -> dict:
		user = self.user_repo.get_by_email(email)
		if not user or user.is_deleted:
			raise UnauthorizedError("Invalid credentials")

		if user.status != "active":
			raise ForbiddenError("Account not active")

		if not user.check_password(password):
			raise UnauthorizedError("Invalid credentials")

		additional_claims = {"role": user.role, "email": user.email}
		access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)

		self.activity_service.log(
			entity_type="user",
			entity_id=user.id,
			action="user_login",
			actor_id=user.id,
			actor_role=user.role,
			description=f"User {user.email} logged in",
		)
		return {
			"access_token": access_token,
			"user": self.serialize_user(user),
		}

	def get_current_user(self, user_id: str) -> User:
		user = self.user_repo.get_by_id(self._normalize_uuid(user_id))
		if not user or user.status != "active":
			raise UnauthorizedError("Authentication required")
		return user

	def update_profile(self, user_id: str, data: dict) -> User:
		user = self.get_current_user(user_id)
		allowed_fields = {"first_name", "last_name", "phone", "country", "additional_info"}
		for field, value in data.items():
			if field in allowed_fields:
				if field == "additional_info":
					payload = self._parse_additional_info(user.additional_info)
					payload[self.PROFILE_NOTES_KEY] = value
					user.additional_info = self._dump_additional_info(payload)
				else:
					setattr(user, field, value)

		self.user_repo.save(user)
		return user

	def forgot_password(self, email: str) -> None:
		user = self.user_repo.get_by_email(email)
		if not user:
			return None

		payload = self._parse_additional_info(user.additional_info)
		payload[self.RESET_TOKEN_KEY] = secrets.token_urlsafe(32)
		user.additional_info = self._dump_additional_info(payload)
		self.user_repo.save(user)
		return None

	def reset_password(self, token: str, new_password: str) -> None:
		user = self.user_repo.get_by_reset_token(token)
		if not user:
			raise ValidationError("Invalid or expired reset token")

		payload = self._parse_additional_info(user.additional_info)
		if payload.get(self.RESET_TOKEN_KEY) != token:
			raise ValidationError("Invalid or expired reset token")

		payload.pop(self.RESET_TOKEN_KEY, None)
		payload.pop("password_reset_requested_at", None)
		user.password_hash = User.hash_password(new_password)
		user.additional_info = self._dump_additional_info(payload)
		self.user_repo.save(user)
		return None
