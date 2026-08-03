import { memo } from "react";

interface BarItem {
  label: string;
  value: number;
  display?: string;
}

interface BarListProps {
  items: BarItem[];
  max?: number;
  color?: "green" | "amber" | "blue";
}

export const BarList = memo(function BarList({
  items,
  max,
  color = "green",
}: BarListProps) {
  const resolvedMax = max ?? Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <div className="bar-track">
            <i
              className={`bar-fill is-${color}`}
              style={{ width: `${Math.max(2, (item.value / resolvedMax) * 100)}%` }}
            />
          </div>
          <strong>{item.display ?? item.value.toFixed(1)}</strong>
        </div>
      ))}
    </div>
  );
});
