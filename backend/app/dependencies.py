from app.repositories.approval_repository import ApprovalRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.po_repository import PORepository
from app.repositories.quotation_repository import QuotationRepository
from app.repositories.rfq_repository import RFQRepository
from app.repositories.user_repository import UserRepository
from app.repositories.vendor_repository import VendorRepository
from app.services.approval_service import ApprovalService
from app.services.activity_service import ActivityService
from app.services.auth_service import AuthService
from app.services.comparison_service import ComparisonService
from app.services.invoice_service import InvoiceService
from app.services.notification_service import NotificationService
from app.services.po_service import POService
from app.services.quotation_service import QuotationService
from app.services.report_service import ReportService
from app.services.rfq_service import RFQService
from app.services.vendor_service import VendorService
from app.utils.sequence_generator import generate_invoice_number, generate_po_number

approval_repo = ApprovalRepository()
activity_repo = ActivityRepository()
invoice_repo = InvoiceRepository()
notification_repo = NotificationRepository()
po_repo = PORepository()
quotation_repo = QuotationRepository()
rfq_repo = RFQRepository()
user_repo = UserRepository()
vendor_repo = VendorRepository()

activity_service = ActivityService(activity_repo)
notification_service = NotificationService(notification_repo, user_repo)
auth_service = AuthService(user_repo, activity_service)

vendor_service = VendorService(vendor_repo, activity_service)
rfq_service = RFQService(rfq_repo, activity_service, notification_service, vendor_repo, user_repo)

quotation_service = QuotationService(
	quotation_repo,
	rfq_repo,
	vendor_repo,
	activity_service,
	notification_service,
	approval_repo,
)
comparison_service = ComparisonService(quotation_repo, rfq_repo)

po_sequence = type("POSequence", (), {"generate_po_number": staticmethod(generate_po_number)})()
invoice_sequence = type(
	"InvoiceSequence",
	(),
	{"generate_invoice_number": staticmethod(generate_invoice_number)},
)()

approval_service = ApprovalService(
	approval_repo,
	rfq_repo,
	quotation_repo,
	None,
	activity_service,
	notification_service,
	user_repo,
)

po_service = POService(
	po_repo,
	approval_repo,
	quotation_repo,
	rfq_repo,
	vendor_repo,
	invoice_repo,
	activity_service,
	notification_service,
	po_sequence,
)
approval_service.po_service = po_service

invoice_service = InvoiceService(
	invoice_repo,
	po_repo,
	vendor_repo,
	activity_service,
	notification_service,
	invoice_sequence,
)

report_service = ReportService(
	po_repo,
	rfq_repo,
	vendor_repo,
	quotation_repo,
	invoice_repo,
	approval_repo,
	activity_repo,
)