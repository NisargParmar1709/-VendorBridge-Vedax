"""Debug RFQ creation directly via the Flask app."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.dependencies import rfq_service

app = create_app()

with app.app_context():
    try:
        rfq = rfq_service.create_rfq(
            data={
                "title": "Test RFQ Direct",
                "category": "Electronics",
                "description": "Test",
                "deadline": "2026-07-15",
                "line_items": [{"item_name": "Laptop", "quantity": 10, "unit": "pcs"}],
                "vendor_ids": [],
            },
            user_id="00000000-0000-0000-0000-000000000001",
        )
        print(f"SUCCESS: {rfq}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\nERROR: {type(e).__name__}: {e}")
