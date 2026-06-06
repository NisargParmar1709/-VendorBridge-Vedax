from decimal import Decimal, ROUND_HALF_EVEN


def round_money(value) -> Decimal:
	"""Round to 2 decimal places using banker's rounding."""
	return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)


def calculate_tax(subtotal: Decimal, percentage: Decimal) -> Decimal:
	return round_money(subtotal * (percentage / Decimal("100")))


def calculate_grand_total(subtotal: Decimal, *tax_amounts: Decimal) -> Decimal:
	return round_money(subtotal + sum(tax_amounts))
