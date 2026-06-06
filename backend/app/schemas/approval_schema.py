from marshmallow import Schema, ValidationError, fields, validate, validates_schema


class ApprovalActionSchema(Schema):
	action = fields.String(required=True, validate=validate.OneOf(["approve", "reject"]))
	remarks = fields.String(required=False, allow_none=True)

	@validates_schema
	def validate_rejection_remarks(self, data, **_kwargs):
		if data.get("action") == "reject" and len((data.get("remarks") or "").strip()) < 10:
			raise ValidationError("Rejection remarks must be at least 10 characters")
