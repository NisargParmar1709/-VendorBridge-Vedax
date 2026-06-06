from decimal import Decimal

from marshmallow import Schema, ValidationError, fields, validate, validates


class QuotationLineItemSchema(Schema):
	rfq_line_item_id = fields.UUID(required=False, allow_none=True)
	item_name = fields.String(required=True, validate=validate.Length(min=1, max=255))
	quantity = fields.Decimal(
		required=True,
		validate=validate.Range(min=Decimal("0.01")),
	)
	unit = fields.String(required=False, allow_none=True, validate=validate.Length(max=50))
	unit_price = fields.Decimal(required=True)

	@validates("unit_price")
	def validate_unit_price(self, value, **_kwargs):
		if value <= 0:
			raise ValidationError("Unit price must be greater than 0")


class QuotationCreateSchema(Schema):
	gst_percentage = fields.Decimal(
		required=False,
		load_default=Decimal("18.00"),
		validate=validate.Range(min=Decimal("0"), max=Decimal("100")),
	)
	delivery_days = fields.Integer(required=False, validate=validate.Range(min=1))
	payment_terms = fields.Integer(required=False, validate=validate.Range(min=0))
	notes = fields.String(required=False, allow_none=True)
	currency = fields.String(
		required=False,
		load_default="INR",
		validate=validate.Length(max=10),
	)
	line_items = fields.List(
		fields.Nested(QuotationLineItemSchema),
		required=True,
		validate=validate.Length(min=1),
	)


class QuotationUpdateSchema(QuotationCreateSchema):
	gst_percentage = fields.Decimal(
		required=False,
		validate=validate.Range(min=Decimal("0"), max=Decimal("100")),
	)
	delivery_days = fields.Integer(required=False, validate=validate.Range(min=1))
	payment_terms = fields.Integer(required=False, validate=validate.Range(min=0))
	notes = fields.String(required=False, allow_none=True)
	currency = fields.String(required=False, validate=validate.Length(max=10))
	line_items = fields.List(
		fields.Nested(QuotationLineItemSchema),
		required=False,
		validate=validate.Length(min=1),
	)


class QuotationSubmitSchema(Schema):
	pass


class QuotationSelectSchema(Schema):
	quotation_id = fields.UUID(required=True)
	remarks = fields.String(required=False, allow_none=True)
