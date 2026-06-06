from datetime import date
from app.extensions import db
from app.utils.exceptions import ValidationError, NotFoundError

class RFQService:
    def __init__(self, rfq_repo, activity_service, notification_service, vendor_repo, user_repo):
        self.rfq_repo = rfq_repo
        self.activity_service = activity_service
        self.notification_service = notification_service
        self.vendor_repo = vendor_repo
        self.user_repo = user_repo

    def expire_overdue_rfqs(self):
        rfqs = self.rfq_repo.get_expired_rfqs()
        count = 0
        for rfq in rfqs:
            if not rfq.quotations:
                rfq.status = "expired"
                count += 1
        db.session.commit()
        return count
        
    def _serialize(self, rfq):
        vendor_details = []
        for va in getattr(rfq, "vendor_assignments", []):
            v_quotation = next((q for q in getattr(rfq, "quotations", []) if q.vendor_id == va.vendor_id), None)
            vendor_details.append({
                "vendor_id": str(va.vendor_id),
                "vendor_name": va.vendor.name if va.vendor else "",
                "company_name": va.vendor.name if va.vendor else "",
                "category": getattr(va.vendor, "category", "") if va.vendor else "",
                "quotation_status": v_quotation.status if v_quotation else "pending",
                "has_submitted": v_quotation is not None and v_quotation.status in ("submitted", "selected", "rejected")
            })
            
        return {
            "id": str(rfq.id),
            "rfq_number": rfq.rfq_number,
            "title": rfq.title,
            "category": rfq.category,
            "status": rfq.status,
            "description": rfq.description,
            "deadline": rfq.deadline.isoformat() if rfq.deadline else None,
            "created_at": rfq.created_at.isoformat() if rfq.created_at else None,
            "created_by_name": f"{rfq.creator.first_name} {rfq.creator.last_name}" if getattr(rfq, "creator", None) else "Unknown",
            "quotation_count": sum(1 for q in getattr(rfq, "quotations", []) if q.status in ["submitted", "selected", "rejected"]),
            "line_items": [{"id": str(li.id), "item_name": li.item_name, "quantity": float(li.quantity), "unit": li.unit, "description": li.description} for li in getattr(rfq, "line_items", [])],
            "vendors": vendor_details,
            "attachments": [{"id": str(att.id), "filename": att.filename, "url": att.file_path} for att in getattr(rfq, "attachments", [])],
        }

    def list_rfqs(self, status, search, page, per_page):
        items, total = self.rfq_repo.search(status, search, page, per_page)
        return {
            "rfqs": [self._serialize(r) for r in items],
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page
        }

    def create_rfq(self, data, user_id):
        from app.models.rfq import RFQ
        import uuid
        
        rfq = RFQ(
            title=data.get("title"),
            category=data.get("category"),
            description=data.get("description"),
            deadline=data.get("deadline"),
            status="draft",
            created_by=user_id,
            rfq_number=f"RFQ-{uuid.uuid4().hex[:6].upper()}"
        )
        self.rfq_repo.create_with_relations(
            rfq, 
            data.get("line_items", []), 
            data.get("vendor_ids", [])
        )
        self.activity_service.log(
            entity_type="rfq",
            entity_id=rfq.id,
            action="rfq_created",
            actor_id=user_id,
            description=f"Created RFQ {rfq.rfq_number}",
        )
        return self._serialize(rfq)

    def get_rfq(self, rfq_id):
        rfq = self.rfq_repo.get_detail(rfq_id)
        if not rfq: raise NotFoundError("RFQ not found")
        return self._serialize(rfq)

    def publish_rfq(self, rfq_id, user_id):
        rfq = self.rfq_repo.get_detail(rfq_id)
        rfq.status = "published"
        db.session.commit()
        return self._serialize(rfq)

    def get_for_vendor(self, vendor_id, status, search, page, per_page):
        items, total = self.rfq_repo.get_for_vendor(vendor_id, status, search, page, per_page)
        return {
            "rfqs": [self._serialize(r) for r in items],
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page
        }
