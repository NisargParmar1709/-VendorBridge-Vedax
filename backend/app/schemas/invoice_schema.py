from decimal import Decimal

from marshmallow import Schema, fields, validate


class InvoiceCreateSchema(Schema):
	notes = fields.String(required=False, allow_none=True)
	cgst_percentage = fields.Decimal(
		required=False,
		load_default=Decimal("9.00"),
		validate=validate.Range(min=Decimal("0"), max=Decimal("100")),
	)
	sgst_percentage = fields.Decimal(
		required=False,
		load_default=Decimal("9.00"),
		validate=validate.Range(min=Decimal("0"), max=Decimal("100")),
	)
	igst_percentage = fields.Decimal(
		required=False,
		load_default=Decimal("0.00"),
		validate=validate.Range(min=Decimal("0"), max=Decimal("100")),
	)


class InvoiceStatusUpdateSchema(Schema):
	status = fields.String(
		required=True,
		validate=validate.OneOf(["sent", "paid", "overdue", "voided"]),
	)
