from marshmallow import Schema, fields, validate


class POStatusUpdateSchema(Schema):
	status = fields.String(
		required=True,
		validate=validate.OneOf(["sent", "acknowledged", "completed", "cancelled"]),
	)
	notes = fields.String(required=False, allow_none=True)
