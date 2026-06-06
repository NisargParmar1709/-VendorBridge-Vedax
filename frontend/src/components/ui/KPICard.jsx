/**
 * KPI Card component matching the ui-design.md spec.
 *
 * @param {Object} props
 * @param {string} props.title - Label text
 * @param {string|number} props.value - Display value
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} [props.iconBgClass] - Background class for icon container (e.g. "bg-blue-100")
 * @param {string} [props.iconColorClass] - Text color class for icon (e.g. "text-blue-600")
 * @param {{ value: number, label?: string }} [props.trend] - Optional trend indicator
 */
export default function KPICard({
  title,
  value,
  icon: Icon,
  iconBgClass = "bg-blue-100",
  iconColorClass = "text-blue-600",
  trend,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBgClass}`}>
          {Icon && <Icon className={`h-6 w-6 ${iconColorClass}`} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p
              className={`mt-0.5 text-xs font-medium ${
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              {trend.label && (
                <span className="ml-1 text-gray-400">{trend.label}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
