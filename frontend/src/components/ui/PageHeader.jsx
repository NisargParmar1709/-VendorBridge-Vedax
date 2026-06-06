/**
 * Page header with title, optional subtitle, and right-aligned action buttons.
 *
 * @param {Object} props
 * @param {string} props.title - Page heading
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {React.ReactNode} [props.actions] - Action buttons rendered on the right
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 mt-3 sm:mt-0">{actions}</div>}
    </div>
  );
}
