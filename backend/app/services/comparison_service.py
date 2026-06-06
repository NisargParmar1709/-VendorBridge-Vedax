import re
import uuid

from app.utils.exceptions import NotFoundError


class ComparisonService:
	WEIGHTS = {"price": 0.40, "delivery": 0.30, "rating": 0.20, "payment": 0.10}

	def __init__(self, quotation_repo, rfq_repo):
		self.quotation_repo = quotation_repo
		self.rfq_repo = rfq_repo

	def get_comparison(self, rfq_id) -> dict:
		rfq = self.rfq_repo.get_detail(self._as_uuid(rfq_id))
		if not rfq:
			raise NotFoundError("RFQ not found")

		rfq_data = {
			"id": str(rfq.id),
			"rfq_number": rfq.rfq_number,
			"title": rfq.title,
			"deadline": rfq.deadline.isoformat() if rfq.deadline else None,
			"status": rfq.status,
			"line_items": [
				{
					"id": str(item.id),
					"item_name": item.item_name,
					"quantity": float(item.quantity),
					"unit": item.unit,
				}
				for item in rfq.line_items
			],
		}

		quotations = self.quotation_repo.get_submitted_for_rfq(rfq.id)
		if not quotations:
			return {
				"rfq": rfq_data,
				"quotations": [],
				"message": "No quotations received",
				"weights": self.WEIGHTS,
			}

		scored = self._calculate_scores(quotations)
		lowest_price = min(quotation.grand_total for quotation in quotations)
		fastest_delivery = min((quotation.delivery_days or 999) for quotation in quotations)
		highest_rating = max(self._normalized_rating(quotation) for quotation in quotations)

		response = {
			"rfq": rfq_data,
			"quotations": [],
			"weights": self.WEIGHTS,
		}
		if len(quotations) == 1:
			response["warning"] = "Only one quotation available"

		for item in scored:
			quotation = item["quotation"]
			normalized_rating = self._normalized_rating(quotation)
			normalized_payment_terms = self._normalize_payment_terms(quotation.payment_terms)
			response["quotations"].append(
				{
					"id": str(quotation.id),
					"vendor": {
						"id": str(quotation.vendor_id),
						"name": quotation.vendor.name if quotation.vendor else None,
						"rating": normalized_rating,
						"is_new_vendor": item["is_new_vendor"],
					},
					"grand_total": float(quotation.grand_total),
					"delivery_days": quotation.delivery_days,
					"payment_terms": normalized_payment_terms,
					"payment_terms_display": (
						str(normalized_payment_terms) if normalized_payment_terms else "not specified"
					),
					"gst_percentage": float(quotation.gst_percentage),
					"currency": quotation.currency,
					"submitted_at": quotation.submitted_at.isoformat() if quotation.submitted_at else None,
					"score": {
						"price_score": item["price_score"],
						"delivery_score": item["delivery_score"],
						"rating_score": item["rating_score"],
						"payment_score": item["payment_score"],
						"overall_score": item["overall_score"],
						"rank": item["rank"],
					},
					"highlights": {
						"is_lowest_price": quotation.grand_total == lowest_price,
						"is_fastest_delivery": (
							quotation.delivery_days is not None
							and (quotation.delivery_days or 999) == fastest_delivery
							and fastest_delivery != 999
						),
						"is_highest_rating": normalized_rating == highest_rating,
					},
					"line_items": self._serialize_line_items(rfq, quotation),
					"extra_line_items": self._serialize_extra_line_items(rfq, quotation),
				}
			)

		return response

	def _calculate_scores(self, quotations: list) -> list:
		prices = [quotation.grand_total for quotation in quotations]
		deliveries = [quotation.delivery_days or 999 for quotation in quotations]
		ratings = [self._normalized_rating(quotation) for quotation in quotations]
		payments = [self._normalize_payment_terms(quotation.payment_terms) or 0 for quotation in quotations]

		min_price = min(prices)
		min_delivery = min(deliveries)
		max_payment = max(payments) if max(payments) > 0 else 1

		scored = []
		for index, quotation in enumerate(quotations):
			price_score = float(min_price / prices[index]) * 100 if prices[index] else 0
			delivery_score = float(min_delivery / deliveries[index]) * 100 if deliveries[index] > 0 else 0
			rating_score = (ratings[index] / 5.0) * 100
			payment_score = (payments[index] / max_payment) * 100

			overall = (
				price_score * self.WEIGHTS["price"]
				+ delivery_score * self.WEIGHTS["delivery"]
				+ rating_score * self.WEIGHTS["rating"]
				+ payment_score * self.WEIGHTS["payment"]
			)

			scored.append(
				{
					"quotation": quotation,
					"price_score": round(price_score, 2),
					"delivery_score": round(delivery_score, 2),
					"rating_score": round(rating_score, 2),
					"payment_score": round(payment_score, 2),
					"overall_score": round(overall, 2),
					"is_new_vendor": ratings[index] == 2.5 and not getattr(quotation.vendor, "rating", None),
				}
			)

		scored.sort(
			key=lambda item: (
				-item["overall_score"],
				((item["quotation"].vendor.name or "").casefold()) if item["quotation"].vendor else "",
			)
		)

		for rank, item in enumerate(scored, 1):
			item["rank"] = rank

		return scored

	@staticmethod
	def _serialize_line_items(rfq, quotation):
		quoted_by_rfq_line_item_id = {
			str(line_item.rfq_line_item_id): line_item
			for line_item in quotation.line_items
			if line_item.rfq_line_item_id is not None
		}
		quoted_by_name = {
			line_item.item_name.strip().lower(): line_item
			for line_item in quotation.line_items
			if line_item.rfq_line_item_id is None
		}

		serialized = []
		for rfq_line_item in rfq.line_items:
			quotation_line_item = quoted_by_rfq_line_item_id.get(str(rfq_line_item.id))
			if quotation_line_item is None:
				quotation_line_item = quoted_by_name.get(rfq_line_item.item_name.strip().lower())

			if quotation_line_item is None:
				serialized.append(
					{
						"rfq_line_item_id": str(rfq_line_item.id),
						"item_name": rfq_line_item.item_name,
						"rfq_quantity": float(rfq_line_item.quantity),
						"rfq_unit": rfq_line_item.unit,
						"quoted_quantity": "N/A",
						"quoted_unit": "N/A",
						"unit_price": "N/A",
						"total_price": "N/A",
						"quoted": False,
					}
				)
				continue

			serialized.append(
				{
					"rfq_line_item_id": str(rfq_line_item.id),
					"item_name": rfq_line_item.item_name,
					"rfq_quantity": float(rfq_line_item.quantity),
					"rfq_unit": rfq_line_item.unit,
					"quoted_quantity": float(quotation_line_item.quantity),
					"quoted_unit": quotation_line_item.unit,
					"unit_price": float(quotation_line_item.unit_price),
					"total_price": float(quotation_line_item.total_price),
					"quoted": True,
				}
			)

		return serialized

	@staticmethod
	def _serialize_extra_line_items(rfq, quotation):
		rfq_line_item_ids = {str(line_item.id) for line_item in rfq.line_items}
		extra_items = []
		for line_item in quotation.line_items:
			if line_item.rfq_line_item_id and str(line_item.rfq_line_item_id) in rfq_line_item_ids:
				continue
			extra_items.append(
				{
					"rfq_line_item_id": str(line_item.rfq_line_item_id) if line_item.rfq_line_item_id else None,
					"item_name": line_item.item_name,
					"quantity": float(line_item.quantity),
					"unit": line_item.unit,
					"unit_price": float(line_item.unit_price),
					"total_price": float(line_item.total_price),
				}
			)
		return extra_items

	@staticmethod
	def _normalized_rating(quotation) -> float:
		vendor_rating = getattr(quotation.vendor, "rating", None)
		return 2.5 if vendor_rating is None else float(vendor_rating)

	@staticmethod
	def _normalize_payment_terms(value) -> int:
		if value in (None, ""):
			return 0
		if isinstance(value, int):
			return value
		match = re.search(r"\d+", str(value))
		return int(match.group()) if match else 0

	@staticmethod
	def _as_uuid(value):
		return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
