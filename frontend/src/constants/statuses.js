export const RFQ_STATUSES = {
  draft: { label: "Draft", badgeClass: "bg-gray-100 text-gray-800" },
  published: { label: "Published", badgeClass: "bg-blue-100 text-blue-800" },
  under_review: {
    label: "Under Review",
    badgeClass: "bg-violet-100 text-violet-800",
  },
  comparison: {
    label: "Comparison",
    badgeClass: "bg-indigo-100 text-indigo-800",
  },
  approval_pending: {
    label: "Approval Pending",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  approved: { label: "Approved", badgeClass: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", badgeClass: "bg-red-100 text-red-800" },
  expired: { label: "Expired", badgeClass: "bg-gray-100 text-gray-700" },
  closed: { label: "Closed", badgeClass: "bg-gray-200 text-gray-700" },
};

export const QUOTATION_STATUSES = {
  draft: { label: "Draft", badgeClass: "bg-gray-100 text-gray-800" },
  submitted: { label: "Submitted", badgeClass: "bg-blue-100 text-blue-800" },
  shortlisted: {
    label: "Shortlisted",
    badgeClass: "bg-indigo-100 text-indigo-800",
  },
  selected: { label: "Selected", badgeClass: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", badgeClass: "bg-red-100 text-red-800" },
  expired: { label: "Expired", badgeClass: "bg-gray-100 text-gray-700" },
};

export const PO_STATUSES = {
  draft: { label: "Draft", badgeClass: "bg-gray-100 text-gray-800" },
  sent: { label: "Sent", badgeClass: "bg-blue-100 text-blue-800" },
  acknowledged: {
    label: "Acknowledged",
    badgeClass: "bg-teal-100 text-teal-800",
  },
  fulfilled: { label: "Fulfilled", badgeClass: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", badgeClass: "bg-red-100 text-red-800" },
};

export const INVOICE_STATUSES = {
  draft: { label: "Draft", badgeClass: "bg-gray-100 text-gray-800" },
  sent: { label: "Sent", badgeClass: "bg-blue-100 text-blue-800" },
  paid: { label: "Paid", badgeClass: "bg-green-100 text-green-800" },
  overdue: { label: "Overdue", badgeClass: "bg-yellow-100 text-yellow-800" },
  voided: { label: "Voided", badgeClass: "bg-red-100 text-red-800" },
};

export const VENDOR_STATUSES = {
  active: { label: "Active", badgeClass: "bg-green-100 text-green-800" },
  pending: { label: "Pending", badgeClass: "bg-yellow-100 text-yellow-800" },
  blocked: { label: "Blocked", badgeClass: "bg-red-100 text-red-800" },
  inactive: { label: "Inactive", badgeClass: "bg-gray-100 text-gray-600" },
};