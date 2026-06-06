import datetime

from sqlalchemy import text

from app.extensions import db


def generate_rfq_number() -> str:
	year = datetime.date.today().year
	result = db.session.execute(text("SELECT nextval('rfq_number_seq')"))
	seq = result.scalar()
	return f"RFQ-{year}-{str(seq).zfill(4)}"


def generate_po_number() -> str:
	year = datetime.date.today().year
	result = db.session.execute(text("SELECT nextval('po_number_seq')"))
	seq = result.scalar()
	return f"PO-{year}-{str(seq).zfill(4)}"


def generate_invoice_number() -> str:
	year = datetime.date.today().year
	result = db.session.execute(text("SELECT nextval('inv_number_seq')"))
	seq = result.scalar()
	return f"INV-{year}-{str(seq).zfill(4)}"