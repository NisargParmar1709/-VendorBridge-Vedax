import {
  VENDOR_STATUSES,
  RFQ_STATUSES,
  QUOTATION_STATUSES,
  PO_STATUSES,
  INVOICE_STATUSES,
} from "../../constants/statuses";

const STATUS_MAPS = {
  vendor: VENDOR_STATUSES,
  rfq: RFQ_STATUSES,
  quotation: QUOTATION_STATUSES,
  po: PO_STATUSES,
  invoice: INVOICE_STATUSES,
};

/**
 * Renders a colored badge based on status and entity type.
 * @param {Object} props
 * @param {string} props.status - The status string (e.g. "active", "draft")
 * @param {"vendor"|"rfq"|"quotation"|"po"|"invoice"} props.type - The entity type
 * @param {string} [props.className] - Additional CSS classes
 */
export default function StatusBadge({ status, type, className = "" }) {
  const map = STATUS_MAPS[type] || {};
  const config = map[status];

  if (!config) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 ${className}`}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeClass} ${className}`}
    >
      {config.label}
    </span>
  );
}
