from datetime import date

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import jwt_required

from app.dependencies import report_service
from app.middleware.rbac import get_current_role, get_current_user_id, require_permission
from app.utils.exceptions import ValidationError

reports_bp = Blueprint("reports", __name__)


def _parse_date_arg(name, default_value):
	raw_value = request.args.get(name)
	if not raw_value:
		return default_value
	try:
		return date.fromisoformat(raw_value)
	except ValueError as exc:
		raise ValidationError(f"Invalid {name}") from exc


@reports_bp.get("/reports/dashboard-stats")
@jwt_required()
def get_dashboard_stats():
	stats = report_service.get_dashboard_stats(get_current_user_id(), get_current_role())
	return jsonify(stats), 200


@reports_bp.get("/reports/spending-trends")
@require_permission("report:read")
def get_spending_trends():
	start_date = _parse_date_arg("start_date", date.today().replace(month=1, day=1))
	end_date = _parse_date_arg("end_date", date.today())
	result = report_service.get_spending_trends(start_date, end_date)
	return jsonify(result), 200


@reports_bp.get("/reports/vendor-performance")
@require_permission("report:read")
def get_vendor_performance():
	return jsonify({"data": report_service.get_vendor_performance()}), 200


@reports_bp.get("/reports/procurement-summary")
@require_permission("report:read")
def get_procurement_summary():
	return jsonify(report_service.get_procurement_summary()), 200


@reports_bp.get("/reports/export")
@require_permission("report:read")
def export_report_csv():
	export_type = request.args.get("type")
	csv_data = report_service.export_csv(export_type, request.args.get("format", "csv"))
	return Response(
		csv_data,
		mimetype="text/csv",
		headers={"Content-Disposition": f"attachment; filename={export_type}_{date.today().isoformat()}.csv"},
	)