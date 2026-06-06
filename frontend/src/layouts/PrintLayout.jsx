export default function PrintLayout({ children }) {
  return (
    <div className="print-only">
      {children}
    </div>
  );
}