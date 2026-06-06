from app.utils.exceptions import ValidationError, NotFoundError

class VendorService:
    def __init__(self, vendor_repo, activity_service):
        self.vendor_repo = vendor_repo
        self.activity_service = activity_service

    def _serialize(self, vendor):
        if not vendor: return None
        return {
            "id": str(vendor.id),
            "name": vendor.name,
            "company_name": vendor.name,
            "category": vendor.category,
            "gst_number": vendor.gst_number,
            "contact_email": vendor.contact_email,
            "status": vendor.status,
            "rating": float(vendor.rating) if vendor.rating else 0.0,
            "total_orders": vendor.total_orders,
        }

    def list_vendors(self, search, category, status, page, per_page):
        items, total = self.vendor_repo.search(search, category, status, page, per_page)
        return {
            "vendors": [self._serialize(v) for v in items],
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page
        }

    def create_vendor(self, data, user_id):
        if self.vendor_repo.gst_exists(data.get("gst_number")):
            raise ValidationError("GST number already exists")
        vendor = self.vendor_repo.model(**data)
        self.vendor_repo.db.session.add(vendor)
        self.vendor_repo.db.session.commit()
        self.activity_service.log(
            entity_type="vendor",
            entity_id=vendor.id,
            action="vendor_created",
            actor_id=user_id,
            description=f"Created vendor {vendor.name}",
        )
        return self._serialize(vendor)

    def get_vendor(self, vendor_id):
        vendor = self.vendor_repo.get_detail(vendor_id)
        if not vendor: raise NotFoundError("Vendor not found")
        return self._serialize(vendor)

    def update_vendor(self, vendor_id, data, user_id):
        vendor = self.vendor_repo.get_detail(vendor_id)
        if not vendor: raise NotFoundError("Vendor not found")
        if "gst_number" in data and self.vendor_repo.gst_exists(data["gst_number"], vendor_id):
            raise ValidationError("GST number already exists")
            
        for k, v in data.items():
            setattr(vendor, k, v)
        self.vendor_repo.db.session.commit()
        self.activity_service.log(
            entity_type="vendor",
            entity_id=vendor_id,
            action="vendor_updated",
            actor_id=user_id,
            description=f"Updated vendor {vendor.name}",
        )
        return self._serialize(vendor)

    def update_status(self, vendor_id, status, user_id):
        vendor = self.vendor_repo.get_detail(vendor_id)
        if not vendor: raise NotFoundError("Vendor not found")
        vendor.status = status
        self.vendor_repo.db.session.commit()
        self.activity_service.log(
            entity_type="vendor",
            entity_id=vendor_id,
            action="vendor_status_updated",
            actor_id=user_id,
            description=f"Vendor status changed to {status}",
        )
        return self._serialize(vendor)

    def get_performance(self, vendor_id):
        return self.vendor_repo.get_performance(vendor_id)

    def rate_vendor(self, vendor_id, rating, user_id):
        vendor = self.vendor_repo.get_detail(vendor_id)
        if not vendor: raise NotFoundError("Vendor not found")
        vendor.rating = rating
        self.vendor_repo.db.session.commit()
        self.activity_service.log(
            entity_type="vendor",
            entity_id=vendor_id,
            action="vendor_rated",
            actor_id=user_id,
            description=f"Rated vendor {rating} stars",
        )
        return self._serialize(vendor)
