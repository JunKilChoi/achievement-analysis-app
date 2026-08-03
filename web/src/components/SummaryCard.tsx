interface SummaryCardProps {
  label: string;
  value: string;
  accent?: boolean;
}

export function SummaryCard({ label, value, accent = false }: SummaryCardProps) {
  return (
    <div className={`summary-card ${accent ? "is-accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
