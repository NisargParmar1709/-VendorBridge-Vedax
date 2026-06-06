import re

from marshmallow import Schema, ValidationError, fields, validate

PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$")
ROLE_CHOICES = ["admin", "procurement_officer", "manager", "vendor"]


def validate_password_strength(value: str) -> None:
	if not PASSWORD_PATTERN.match(value):
		raise ValidationError(
			"Password must be at least 8 characters and include an uppercase letter, a digit, and a special character from @$!%*?&"
		)


class RegisterSchema(Schema):
	first_name = fields.String(
		required=True,
		validate=validate.Length(min=2, max=100),
	)
	last_name = fields.String(
		required=True,
		validate=validate.Length(min=2, max=100),
	)
	email = fields.Email(required=True)
	password = fields.String(required=True, validate=validate_password_strength)
	role = fields.String(required=True, validate=validate.OneOf(ROLE_CHOICES))
	phone = fields.String(required=False, validate=validate.Length(max=20))


class LoginSchema(Schema):
	email = fields.Email(required=True)
	password = fields.String(required=True)


class ForgotPasswordSchema(Schema):
	email = fields.Email(required=True)


class ResetPasswordSchema(Schema):
	token = fields.String(required=True)
	new_password = fields.String(required=True, validate=validate_password_strength)


class UpdateProfileSchema(Schema):
	first_name = fields.String(required=False, validate=validate.Length(min=2, max=100))
	last_name = fields.String(required=False, validate=validate.Length(min=2, max=100))
	phone = fields.String(required=False, validate=validate.Length(max=20))
	country = fields.String(required=False, validate=validate.Length(max=100))
	additional_info = fields.String(required=False)
