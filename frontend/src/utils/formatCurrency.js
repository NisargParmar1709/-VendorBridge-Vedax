const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return inrFormatter.format(0);
  }

  return inrFormatter.format(numericAmount);
}