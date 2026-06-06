import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_invoice_email(to_email: str, invoice_data: dict) -> bool:
	"""Returns True on success, raises exception on failure."""
	msg = MIMEMultipart("alternative")
	msg["Subject"] = (
		f"Invoice #{invoice_data['invoice_number']} from VendorBridge | Due {invoice_data['due_date']}"
	)
	msg["From"] = f"{os.getenv('SMTP_FROM_NAME')} <{os.getenv('SMTP_FROM_EMAIL')}>"
	msg["To"] = to_email

	html = render_invoice_template(invoice_data)
	msg.attach(MIMEText(html, "html"))

	with smtplib.SMTP(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT"))) as server:
		if os.getenv("SMTP_USE_TLS") == "True":
			server.starttls()
		server.login(os.getenv("SMTP_USERNAME"), os.getenv("SMTP_PASSWORD"))
		server.sendmail(os.getenv("SMTP_FROM_EMAIL"), to_email, msg.as_string())
	return True


def send_rfq_notification_email(to_email: str, rfq_data: dict) -> bool:
	msg = MIMEMultipart("alternative")
	msg["Subject"] = (
		f"New RFQ: {rfq_data['rfq_title']} | Deadline: {rfq_data['deadline']} | VendorBridge"
	)
	msg["From"] = f"{os.getenv('SMTP_FROM_NAME')} <{os.getenv('SMTP_FROM_EMAIL')}>"
	msg["To"] = to_email

	html = render_rfq_notification_template(rfq_data)
	msg.attach(MIMEText(html, "html"))

	with smtplib.SMTP(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT"))) as server:
		if os.getenv("SMTP_USE_TLS") == "True":
			server.starttls()
		server.login(os.getenv("SMTP_USERNAME"), os.getenv("SMTP_PASSWORD"))
		server.sendmail(os.getenv("SMTP_FROM_EMAIL"), to_email, msg.as_string())
	return True


def render_invoice_template(invoice_data: dict) -> str:
	currency_display = invoice_data.get("currency_display", "INR ")
	rows = []
	for index, item in enumerate(invoice_data.get("line_items", []), 1):
		rows.append(
			f"<tr><td>{index}</td><td>{item['item_name']}</td><td>{item['quantity']}</td><td>{item['unit']}</td><td>{currency_display}{item['unit_price']}</td><td>{currency_display}{item['total_price']}</td></tr>"
		)

	def maybe_tax(label, amount, pct):
		return (
			f'<div class="total-row"><span>{label} ({pct}%):</span><span>{currency_display}{amount}</span></div>'
			if float(amount) > 0
			else ""
		)

	return f"""
<!DOCTYPE html>
<html>
<head>
	<meta charset=\"UTF-8\">
	<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
	<title>Invoice from VendorBridge</title>
	<style>
		body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }}
		.container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
		.header {{ background: #2563EB; color: white; padding: 24px 32px; }}
		.header h1 {{ margin: 0; font-size: 22px; font-weight: bold; }}
		.header p {{ margin: 4px 0 0; font-size: 13px; opacity: 0.85; }}
		.invoice-badge {{ float: right; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; }}
		.body {{ padding: 32px; }}
		.invoice-meta {{ display: flex; justify-content: space-between; margin-bottom: 24px; }}
		.invoice-meta h2 {{ font-size: 28px; color: #1e3a8a; margin: 0 0 8px; }}
		.meta-row {{ font-size: 13px; color: #555; margin: 3px 0; }}
		.parties {{ display: flex; justify-content: space-between; background: #f8faff; border: 1px solid #dbeafe; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }}
		.party h4 {{ margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }}
		.party p {{ margin: 2px 0; font-size: 13px; color: #1f2937; }}
		table {{ width: 100%; border-collapse: collapse; margin-bottom: 16px; }}
		th {{ background: #1e3a8a; color: white; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }}
		td {{ padding: 10px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }}
		tr:nth-child(even) td {{ background: #fafafa; }}
		.totals {{ margin-left: auto; width: 280px; }}
		.total-row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; border-bottom: 1px solid #f0f0f0; }}
		.grand-total {{ background: #1e3a8a; color: white; padding: 14px 18px; border-radius: 8px; display: flex; justify-content: space-between; margin-top: 8px; font-size: 16px; font-weight: bold; }}
		.payment-info {{ background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 20px; margin-top: 24px; }}
		.payment-info h4 {{ margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #92400e; }}
		.payment-info p {{ margin: 3px 0; font-size: 12px; color: #78350f; }}
		.footer {{ background: #1e3a8a; color: rgba(255,255,255,0.7); text-align: center; padding: 16px; font-size: 11px; line-height: 1.6; }}
		.footer a {{ color: rgba(255,255,255,0.9); }}
	</style>
</head>
<body>
	<div class=\"container\">
		<div class=\"header\">
			<span class=\"invoice-badge\">INVOICE</span>
			<h1>VendorBridge</h1>
			<p>Procurement &amp; Vendor Management ERP</p>
		</div>
		<div class=\"body\">
			<div class=\"invoice-meta\">
				<div>
					<h2>INVOICE</h2>
					<div class=\"meta-row\"><strong>Invoice #:</strong> {invoice_data['invoice_number']}</div>
					<div class=\"meta-row\"><strong>Date:</strong> {invoice_data['invoice_date']}</div>
					<div class=\"meta-row\"><strong>Due Date:</strong> {invoice_data['due_date']}</div>
					<div class=\"meta-row\"><strong>PO Reference:</strong> {invoice_data['po_number']}</div>
				</div>
			</div>

			<div class=\"parties\">
				<div class=\"party\">
					<h4>From (Vendor)</h4>
					<p><strong>{invoice_data['vendor_name']}</strong></p>
					<p>{invoice_data['vendor_address']}</p>
					<p>GSTIN: {invoice_data['vendor_gstin']}</p>
					<p>{invoice_data['vendor_email']}</p>
				</div>
				<div class=\"party\">
					<h4>To (Buyer)</h4>
					<p><strong>{invoice_data['org_name']}</strong></p>
					<p>{invoice_data['org_address']}</p>
					<p>GSTIN: {invoice_data['org_gstin']}</p>
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
				<tbody>{''.join(rows)}</tbody>
			</table>

			<div style=\"display:flex; justify-content:flex-end;\">
				<div class=\"totals\">
					<div class=\"total-row\"><span>Subtotal:</span><span>{currency_display}{invoice_data['subtotal']}</span></div>
					{maybe_tax('CGST', invoice_data['cgst_amount'], invoice_data['cgst_pct'])}
					{maybe_tax('SGST', invoice_data['sgst_amount'], invoice_data['sgst_pct'])}
					{maybe_tax('IGST', invoice_data['igst_amount'], invoice_data['igst_pct'])}
					<div class=\"grand-total\"><span>GRAND TOTAL</span><span>{currency_display}{invoice_data['grand_total']}</span></div>
				</div>
			</div>

			<div class=\"payment-info\">
				<h4>Payment Information</h4>
				<p>Payment Terms: {invoice_data['payment_terms']} days net</p>
				<p>Please transfer to: {invoice_data['bank_name']} | A/C: {invoice_data['bank_account']} | IFSC: {invoice_data['bank_ifsc']}</p>
			</div>
		</div>
		<div class=\"footer\">
			<p>This is a system-generated invoice from VendorBridge ERP. Please do not reply to this email.</p>
			<p>For queries, contact <a href=\"mailto:support@vendorbridge.io\">support@vendorbridge.io</a></p>
		</div>
	</div>
</body>
</html>
"""


def render_rfq_notification_template(rfq_data: dict) -> str:
	rows = []
	for index, item in enumerate(rfq_data.get("line_items", []), 1):
		rows.append(
			f"<tr><td>{index}</td><td>{item['item_name']}</td><td>{item['quantity']}</td><td>{item['unit']}</td></tr>"
		)

	return f"""
<!DOCTYPE html>
<html>
<head>
	<meta charset=\"UTF-8\">
	<style>
		body {{ font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; }}
		.container {{ max-width: 600px; margin: 0 auto; background: white; }}
		.header {{ background: #2563EB; color: white; padding: 24px 32px; }}
		.body {{ padding: 32px; }}
		.deadline-box {{ background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 20px; margin: 20px 0; text-align: center; }}
		.deadline-box p {{ margin: 0; color: #92400e; font-size: 15px; font-weight: bold; }}
		table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
		th {{ background: #1e3a8a; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }}
		td {{ padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }}
		.cta-btn {{ display: block; background: #2563EB; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; text-align: center; font-size: 16px; font-weight: bold; margin: 24px auto; width: fit-content; }}
		.footer {{ background: #1e3a8a; color: rgba(255,255,255,0.7); text-align: center; padding: 16px; font-size: 11px; }}
	</style>
</head>
<body>
	<div class=\"container\">
		<div class=\"header\">
			<h1 style=\"margin:0; font-size:20px;\">VendorBridge</h1>
			<p style=\"margin:4px 0 0; opacity:0.85; font-size:13px;\">New Request for Quotation</p>
		</div>
		<div class=\"body\">
			<p>Dear <strong>{rfq_data['vendor_name']}</strong>,</p>
			<p>You have been invited to submit a quotation for the following procurement request:</p>

			<h2 style=\"color:#1e3a8a;\">{rfq_data['rfq_title']}</h2>
			<p style=\"color:#555; font-size:13px;\">Category: {rfq_data['category']} | RFQ #: {rfq_data['rfq_number']}</p>

			<div class=\"deadline-box\">
				<p>Submission Deadline: {rfq_data['deadline']}</p>
			</div>

			<h4>Required Items:</h4>
			<table>
				<thead><tr><th>#</th><th>Item</th><th>Quantity</th><th>Unit</th></tr></thead>
				<tbody>{''.join(rows)}</tbody>
			</table>

			<p style=\"font-size:13px; color:#555;\">{rfq_data['description']}</p>

			<a href=\"{rfq_data['platform_url']}/rfqs/{rfq_data['rfq_id']}\" class=\"cta-btn\">Submit Your Quotation</a>

			<p style=\"font-size:12px; color:#888; text-align:center;\">Or log in at: {rfq_data['platform_url']}</p>
		</div>
		<div class=\"footer\">
			<p>This invitation was sent by VendorBridge ERP. Please do not reply to this email.</p>
		</div>
	</div>
</body>
</html>
"""
