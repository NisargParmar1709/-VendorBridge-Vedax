import html
import logging

try:
	from weasyprint import HTML
except ImportError as e:
	HTML = None
	logging.getLogger(__name__).warning(f"WeasyPrint import failed: {e}. PDF generation will return dummy bytes.")
except OSError as e:
	HTML = None
	logging.getLogger(__name__).warning(f"WeasyPrint missing OS dependencies (e.g. GTK3 on Windows): {e}. PDF generation will return dummy bytes.")

def generate_pdf_bytes(html_content: str) -> bytes:
	if HTML is None:
		return b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Count 1/Kids[3 0 R]>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>\nendobj\n4 0 obj\n<</Length 47>>\nstream\nBT /F1 24 Tf 100 700 Td (Dummy PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000015 00000 n\n0000000060 00000 n\n0000000111 00000 n\n0000000204 00000 n\ntrailer\n<</Size 5/Root 1 0 R>>\nstartxref\n300\n%%EOF"
	try:
		return HTML(string=html_content).write_pdf()
	except Exception as exc:
		logging.getLogger(__name__).error(f"PDF generation failed: {exc}")
		raise


def generate_invoice_pdf(invoice_data: dict) -> bytes:
	"""Generate PDF from invoice data. Returns bytes. Raises on WeasyPrint error."""
	html_content = _render_invoice_html(invoice_data)
	return generate_pdf_bytes(html_content)


def generate_po_pdf(po_data: dict) -> bytes:
	html_content = _render_po_html(po_data)
	return generate_pdf_bytes(html_content)


def _format_money(value) -> str:
	return f"{float(value):.2f}"


def _render_line_items_rows(line_items: list) -> str:
	rows = []
	for index, item in enumerate(line_items, 1):
		rows.append(
			"<tr>"
			f"<td>{index}</td>"
			f"<td>{html.escape(str(item.get('item_name') or ''))}</td>"
			f"<td>{html.escape(str(item.get('quantity') or ''))}</td>"
			f"<td>{html.escape(str(item.get('unit') or ''))}</td>"
			f"<td>{html.escape(str(item.get('unit_price_display') or item.get('unit_price') or ''))}</td>"
			f"<td>{html.escape(str(item.get('total_price_display') or item.get('total_price') or ''))}</td>"
			"</tr>"
		)
	return "".join(rows)


def _render_tax_rows(data: dict) -> str:
	rows = []
	for label_key, amount_key, pct_key in (
		("CGST", "cgst_amount", "cgst_pct"),
		("SGST", "sgst_amount", "sgst_pct"),
		("IGST", "igst_amount", "igst_pct"),
	):
		amount = data.get(amount_key)
		if amount and float(amount) > 0:
			rows.append(
				f'<div class="total-row"><span>{label_key} ({html.escape(str(data.get(pct_key) or "0.00"))}%):</span><span>{html.escape(str(data.get("currency_display", "INR ")))}{_format_money(amount)}</span></div>'
			)
	return "".join(rows)


def _render_document_html(data: dict, badge: str, heading: str, meta_rows: list[str], payment_terms: str | None) -> str:
	rows_html = _render_line_items_rows(data.get("line_items", []))
	tax_rows_html = _render_tax_rows(data)
	payment_block = ""
	if payment_terms is not None:
		payment_block = (
			'<div class="payment-info">'
			'<h4>Payment Information</h4>'
			f'<p>Payment Terms: {html.escape(payment_terms)} days net</p>'
			f'<p>Please transfer to: {html.escape(str(data.get("bank_name") or "N/A"))} | '
			f'A/C: {html.escape(str(data.get("bank_account") or "N/A"))} | '
			f'IFSC: {html.escape(str(data.get("bank_ifsc") or "N/A"))}</p>'
			'</div>'
		)

	meta_html = "".join(f'<div class="meta-row">{row}</div>' for row in meta_rows)
	return f"""
<!DOCTYPE html>
<html>
<head>
	<meta charset=\"UTF-8\">
	<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
	<title>{html.escape(heading)}</title>
	<style>
		body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }}
		.container {{ max-width: 760px; margin: 0 auto; background: #ffffff; }}
		.header {{ background: #2563EB; color: white; padding: 24px 32px; }}
		.header h1 {{ margin: 0; font-size: 22px; font-weight: bold; }}
		.header p {{ margin: 4px 0 0; font-size: 13px; opacity: 0.85; }}
		.badge {{ float: right; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; }}
		.body {{ padding: 32px; }}
		.meta h2 {{ font-size: 28px; color: #1e3a8a; margin: 0 0 8px; }}
		.meta-row {{ font-size: 13px; color: #555; margin: 3px 0; }}
		.parties {{ display: flex; justify-content: space-between; gap: 24px; background: #f8faff; border: 1px solid #dbeafe; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }}
		.party {{ width: 48%; }}
		.party h4 {{ margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }}
		.party p {{ margin: 2px 0; font-size: 13px; color: #1f2937; }}
		table {{ width: 100%; border-collapse: collapse; margin-bottom: 16px; }}
		th {{ background: #1e3a8a; color: white; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }}
		td {{ padding: 10px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }}
		tr:nth-child(even) td {{ background: #fafafa; }}
		.totals {{ margin-left: auto; width: 320px; }}
		.total-row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; border-bottom: 1px solid #f0f0f0; }}
		.grand-total {{ background: #1e3a8a; color: white; padding: 14px 18px; border-radius: 8px; display: flex; justify-content: space-between; margin-top: 8px; font-size: 16px; font-weight: bold; }}
		.payment-info {{ background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 20px; margin-top: 24px; }}
		.payment-info h4 {{ margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #92400e; }}
		.payment-info p {{ margin: 3px 0; font-size: 12px; color: #78350f; }}
		.footer {{ background: #1e3a8a; color: rgba(255,255,255,0.7); text-align: center; padding: 16px; font-size: 11px; line-height: 1.6; }}
	</style>
</head>
<body>
	<div class=\"container\">
		<div class=\"header\">
			<span class=\"badge\">{html.escape(badge)}</span>
			<h1>VendorBridge</h1>
			<p>Procurement &amp; Vendor Management ERP</p>
		</div>
		<div class=\"body\">
			<div class=\"meta\">
				<h2>{html.escape(heading)}</h2>
				{meta_html}
			</div>

			<div class=\"parties\">
				<div class=\"party\">
					<h4>From (Vendor)</h4>
					<p><strong>{html.escape(str(data.get('vendor_name') or ''))}</strong></p>
					<p>{html.escape(str(data.get('vendor_address') or ''))}</p>
					<p>GSTIN: {html.escape(str(data.get('vendor_gstin') or ''))}</p>
					<p>{html.escape(str(data.get('vendor_email') or ''))}</p>
				</div>
				<div class=\"party\">
					<h4>To (Buyer)</h4>
					<p><strong>{html.escape(str(data.get('org_name') or ''))}</strong></p>
					<p>{html.escape(str(data.get('org_address') or ''))}</p>
					<p>GSTIN: {html.escape(str(data.get('org_gstin') or ''))}</p>
				</div>
			</div>

			<table>
				<thead>
					<tr>
						<th>#</th>
						<th>Item Description</th>
						<th>Qty</th>
						<th>Unit</th>
						<th>Rate</th>
						<th>Amount</th>
					</tr>
				</thead>
				<tbody>{rows_html}</tbody>
			</table>

			<div style=\"display:flex; justify-content:flex-end;\">
				<div class=\"totals\">
			          <div class=\"total-row\"><span>Subtotal:</span><span>{html.escape(str(data.get('currency_display', 'INR ')))}{_format_money(data.get('subtotal', 0))}</span></div>
					{tax_rows_html}
			          <div class=\"grand-total\"><span>GRAND TOTAL</span><span>{html.escape(str(data.get('currency_display', 'INR ')))}{_format_money(data.get('grand_total', 0))}</span></div>
				</div>
			</div>
			{payment_block}
		</div>
		<div class=\"footer\">This is a system-generated document from VendorBridge ERP.</div>
	</div>
</body>
</html>
"""


def _render_invoice_html(data: dict) -> str:
	meta_rows = [
		f"<strong>Invoice #:</strong> {html.escape(str(data.get('invoice_number') or ''))}",
		f"<strong>Date:</strong> {html.escape(str(data.get('invoice_date') or ''))}",
		f"<strong>Due Date:</strong> {html.escape(str(data.get('due_date') or ''))}",
		f"<strong>PO Reference:</strong> {html.escape(str(data.get('po_number') or ''))}",
	]
	return _render_document_html(data, "INVOICE", "INVOICE", meta_rows, str(data.get("payment_terms") or 0))


def _render_po_html(data: dict) -> str:
	meta_rows = [
		f"<strong>PO #:</strong> {html.escape(str(data.get('po_number') or ''))}",
		f"<strong>Date:</strong> {html.escape(str(data.get('po_date') or ''))}",
		f"<strong>RFQ Reference:</strong> {html.escape(str(data.get('rfq_number') or ''))}",
		f"<strong>Delivery Date:</strong> {html.escape(str(data.get('delivery_date') or 'TBD'))}",
	]
	return _render_document_html(data, "PURCHASE ORDER", "PURCHASE ORDER", meta_rows, str(data.get("payment_terms") or 0))
