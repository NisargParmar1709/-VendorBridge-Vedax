import marshmallow as ma
from flask import Blueprint, jsonify, request

from app.middleware.rbac import require_permission
from app.utils.gemini_client import generate_rfq_description

ai_bp = Blueprint("ai", __name__)


class GenerateDescriptionSchema(ma.Schema):
	context_type = ma.fields.Str(required=True)
	title = ma.fields.Str(required=True)
	category = ma.fields.Str(load_default="")
	items = ma.fields.List(ma.fields.Str(), load_default=[])


generate_description_schema = GenerateDescriptionSchema()


@ai_bp.post("/ai/generate-description")
@require_permission("rfq:create")
def generate_description():
	data = generate_description_schema.load(request.get_json(silent=True) or {})
	description = generate_rfq_description(
		title=data["title"],
		category=data.get("category", ""),
		items=data.get("items", []),
	)
	return jsonify({"description": description}), 200