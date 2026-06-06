import logging
import os

from app.utils.exceptions import ServiceUnavailableError

logger = logging.getLogger(__name__)


def generate_rfq_description(title: str, category: str, items: list) -> str:
	"""Generate a short procurement-ready RFQ description via Gemini."""
	api_key = os.getenv("GEMINI_API_KEY", "")
	if not api_key or api_key == "<your-value-here>":
		raise ServiceUnavailableError("Gemini API key not configured")

	try:
		from google import genai

		client = genai.Client(api_key=api_key)
		model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

		items_str = ", ".join(items) if items else "various items"
		prompt = f"""You are a professional procurement manager. Write a concise,
formal procurement description (2-3 sentences, 50-100 words) for:
Title: {title}
Category: {category}
Items required: {items_str}

Output only the description text, no headings or extra formatting."""

		response = client.models.generate_content(
			model=model_name,
			contents=prompt,
		)
		return response.text.strip()
	except ImportError:
		# Fallback to deprecated library
		try:
			import google.generativeai as genai

			genai.configure(api_key=api_key)
			model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))
			items_str = ", ".join(items) if items else "various items"
			prompt = f"""You are a professional procurement manager. Write a concise,
formal procurement description (2-3 sentences, 50-100 words) for:
Title: {title}
Category: {category}
Items required: {items_str}

Output only the description text, no headings or extra formatting."""
			response = model.generate_content(prompt)
			return response.text.strip()
		except Exception as exc:
			logger.error(f"Gemini API error (legacy): {exc}")
			raise ServiceUnavailableError("AI service temporarily unavailable") from exc
	except Exception as exc:
		logger.error(f"Gemini API error: {exc}")
		raise ServiceUnavailableError("AI service temporarily unavailable") from exc
