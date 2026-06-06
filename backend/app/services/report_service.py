import csv
from datetime import date
from io import StringIO

from app.utils.exceptions import ValidationError


class ReportService:
	RFQ_STATUSES = (
		"draft",
		"published",
		"under_review",
		"comparison",
		"approval_pending",
		"approved",
		"rejected",
		"expired",
		"closed",
	)
	INVOICE_STATUSES = ("draft", "sent", "paid", "overdue", "voided")

	def __init__(
		self,
		po_repo,
		rfq_repo,
		vendor_repo,
		quotation_repo,
		invoice_repo,
		approval_repo,
		activity_repo,
	):
		self.po_repo = po_repo
		self.rfq_repo = rfq_repo
		self.vendor_repo = vendor_repo
		self.quotation_repo = quotation_repo
		self.invoice_repo = invoice_repo
		self.approval_repo = approval_repo
		self.activity_repo = activity_repo

	def get_dashboard_stats(self, actor_id, actor_role) -> dict:
		return {
			"pending_approvals": self.approval_repo.count_pending(),
			"active_rfqs": self.rfq_repo.count_active(),
			"total_vendors": self.vendor_repo.count_active(),
			"total_po_value": float(self.po_repo.sum_grand_total()),
			"recent_purchase_orders": [self._serialize_po_summary(po) for po in self.po_repo.get_recent(limit=5)],
			"recent_invoices": [self._serialize_invoice_summary(invoice) for invoice in self.invoice_repo.get_recent(limit=5)],
		}

	def get_spending_trends(self, start_date, end_date) -> dict:
		if start_date > end_date:
			raise ValidationError("start_date must be before end_date")

		rows = self.po_repo.get_spending_by_month(start_date=start_date, end_date=end_date)
		trends = []
		months = []
		amounts = []

		for year, month, total in rows:
			m_str = date(year, month, 1).strftime("%b %Y")
			amt = float(total)
			trends.append({"month": m_str, "amount": amt})
			months.append(m_str)
			amounts.append(amt)

		return {"trends": trends, "months": months, "amounts": amounts}

	def get_vendor_performance(self) -> list:
		results = []
		for row in self.vendor_repo.get_report_performance():
			total_quotations = int(row.total_quotations or 0)
			wins = int(row.wins or 0)
			results.append(
				{
					"vendor_id": str(row.vendor_id),
					"vendor_name": row.vendor_name,
					"category": row.category,
					"total_rfqs": int(row.total_rfqs or 0),
					"total_quotations": total_quotations,
					"wins": wins,
					"win_rate": round((wins / total_quotations) * 100, 2) if total_quotations else 0.0,
					"total_order_value": float(row.total_order_value or 0),
					"total_po_value": float(row.total_order_value or 0),
					"rating": float(row.rating or 0),
				}
			)

		return results

	def get_procurement_summary(self) -> dict:
		rfq_status_breakdown = self._build_status_map(self.RFQ_STATUSES, self.rfq_repo.get_status_breakdown())
		invoice_status_breakdown = self._build_status_map(
			self.INVOICE_STATUSES,
			self.invoice_repo.get_status_breakdown(),
		)
		po_value_by_month = [
			{"month": date(year, month, 1).strftime("%b %Y"), "amount": float(total)}
			for year, month, total in self.po_repo.get_spending_by_month()
		]
		top_vendors = [
			{
				"vendor_id": str(row.vendor_id),
				"vendor_name": row.vendor_name,
				"total_spend": float(row.total_spend or 0),
				"total_orders": int(row.total_orders or 0),
			}
			for row in self.po_repo.get_top_vendors_by_spend(limit=5)
		]

		return {
			"rfq_status_breakdown": rfq_status_breakdown,
			"po_value_by_month": po_value_by_month,
			"invoice_status_breakdown": invoice_status_breakdown,
			"top_vendors_by_spend": top_vendors,
			"rfqs": rfq_status_breakdown,
			"invoices": invoice_status_breakdown,
		}

	def export_csv(self, export_type: str, export_format: str = "csv") -> str:
		if (export_format or "csv").lower() != "csv":
			raise ValidationError("Only csv export is supported")

		exporters = {
			"vendors": (
				["name", "category", "gst_number", "contact_email", "status", "rating", "total_orders"],
				self.vendor_repo.export_rows,
			),
			"rfqs": (
				["rfq_number", "title", "category", "status", "deadline", "created_at"],
				self.rfq_repo.export_rows,
			),
			"pos": (
				["po_number", "rfq_number", "vendor_name", "status", "currency", "grand_total", "po_date", "delivery_date"],
				self.po_repo.export_rows,
			),
			"invoices": (
				["invoice_number", "po_number", "vendor_name", "status", "currency", "grand_total", "invoice_date", "due_date"],
				self.invoice_repo.export_rows,
			),
		}

		if export_type not in exporters:
			raise ValidationError("Invalid export type")

		fieldnames, row_getter = exporters[export_type]
		rows = row_getter()

		buffer = StringIO()
		writer = csv.DictWriter(buffer, fieldnames=fieldnames)
		writer.writeheader()
		for row in rows:
			writer.writerow({field: self._normalize_csv_value(row.get(field)) for field in fieldnames})

		return buffer.getvalue()

	@staticmethod
	def _serialize_po_summary(po) -> dict:
		return {
			"id": str(po.id),
			"po_number": po.po_number,
			"vendor_name": po.vendor.name if po.vendor else None,
			"rfq_title": po.rfq.title if po.rfq else None,
			"grand_total": float(po.grand_total),
			"total_amount": float(po.grand_total),
			"status": po.status,
			"po_date": po.po_date.isoformat() if po.po_date else None,
			"created_at": po.created_at.isoformat() if po.created_at else None,
		}

	@staticmethod
	def _serialize_invoice_summary(invoice) -> dict:
		return {
			"id": str(invoice.id),
			"invoice_number": invoice.invoice_number,
			"po_number": invoice.po.po_number if invoice.po else None,
			"vendor_name": invoice.vendor.name if invoice.vendor else None,
			"grand_total": float(invoice.grand_total),
			"total_amount": float(invoice.grand_total),
			"status": invoice.status,
			"due_date": invoice.due_date.isoformat() if invoice.due_date else None,
			"created_at": invoice.created_at.isoformat() if invoice.created_at else None,
		}

	@staticmethod
	def _build_status_map(expected_statuses, rows):
		values = {status: 0 for status in expected_statuses}
		for status, count in rows:
			values[status] = int(count or 0)
		return values

	@staticmethod
	def _normalize_csv_value(value):
		if value is None:
			return ""
		if hasattr(value, "isoformat"):
			return value.isoformat()
		return value

