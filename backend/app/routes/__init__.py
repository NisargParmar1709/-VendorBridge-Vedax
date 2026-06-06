from .activity import activity_bp
from .ai import ai_bp
from .approvals import approvals_bp
from .auth import auth_bp
from .invoices import invoices_bp
from .notifications import notifications_bp
from .purchase_orders import purchase_orders_bp
from .quotations import quotations_bp
from .reports import reports_bp
from .rfqs import rfqs_bp
from .vendors import vendors_bp

__all__ = [
    "activity_bp",
    "ai_bp",
    "approvals_bp",
    "auth_bp",
    "invoices_bp",
    "notifications_bp",
    "purchase_orders_bp",
    "quotations_bp",
    "reports_bp",
    "rfqs_bp",
    "vendors_bp",
]