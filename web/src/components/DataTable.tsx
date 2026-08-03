import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { TableRow } from "../lib/analysisEngine";

interface DataTableProps {
  rows: TableRow[];
  columns: string[];
  percentColumns?: string[];
  compact?: boolean;
  maxRows?: number;
  highlightColumns?: string[];
  initialSort?: {
    column: string;
    direction: "ascending" | "descending";
  };
  maxHeight?: number;
  cellClassName?(row: TableRow, column: string): string | undefined;
  cellFormatter?(row: TableRow, column: string, formattedValue: string): string;
  cellRenderer?(row: TableRow, column: string, formattedValue: string): ReactNode;
}

function formatValue(value: TableRow[string], percent: boolean) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "예" : "아니요";
  if (typeof value === "number") {
    if (percent) return `${(value * 100).toFixed(1)}%`;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

function defaultColumnWidth(column: string) {
  if (column.includes("성취기준")) return 230;
  if (column.includes("평가영역")) return 170;
  if (column.includes("문항번호")) return 110;
  if (column.includes("이름") || column.includes("학생")) return 130;
  if (column.includes("파일")) return 190;
  return Math.max(112, Math.min(170, column.length * 16 + 48));
}

export const DataTable = memo(function DataTable({
  rows,
  columns,
  percentColumns = [],
  compact = false,
  maxRows,
  highlightColumns = [],
  initialSort,
  maxHeight,
  cellClassName,
  cellFormatter,
  cellRenderer,
}: DataTableProps) {
  const [sort, setSort] = useState<
    | {
        column: string;
        direction: "ascending" | "descending";
      }
    | undefined
  >(initialSort);
  const percentSet = new Set(percentColumns);
  const highlightSet = new Set(highlightColumns);
  const initialWidths = useMemo(
    () => Object.fromEntries(columns.map((column) => [column, defaultColumnWidth(column)])),
    [columns],
  );
  const [columnWidths, setColumnWidths] =
    useState<Record<string, number>>(initialWidths);
  const resizeState = useRef<
    | {
        column: string;
        startX: number;
        startWidth: number;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    setColumnWidths(initialWidths);
  }, [initialWidths]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const direction = sort.direction === "ascending" ? 1 : -1;
    return rows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .sort((left, right) => {
        const leftValue = left.row[sort.column];
        const rightValue = right.row[sort.column];
        if (leftValue === null || leftValue === undefined || leftValue === "") {
          return rightValue === null || rightValue === undefined || rightValue === ""
            ? left.originalIndex - right.originalIndex
            : 1;
        }
        if (rightValue === null || rightValue === undefined || rightValue === "") {
          return -1;
        }
        let comparison = 0;
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          comparison = leftValue - rightValue;
        } else {
          comparison = String(leftValue).localeCompare(String(rightValue), "ko", {
            numeric: true,
            sensitivity: "base",
          });
        }
        return comparison === 0
          ? left.originalIndex - right.originalIndex
          : comparison * direction;
      })
      .map(({ row }) => row);
  }, [rows, sort]);
  const visibleRows = maxRows ? sortedRows.slice(0, maxRows) : sortedRows;

  const toggleSort = (column: string) => {
    setSort((current) => ({
      column,
      direction:
        current?.column === column && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  const resizeColumn = (column: string, delta: number) => {
    setColumnWidths((current) => ({
      ...current,
      [column]: Math.max(80, Math.min(600, (current[column] ?? defaultColumnWidth(column)) + delta)),
    }));
  };

  const tableWidth = columns.reduce(
    (total, column) => total + (columnWidths[column] ?? defaultColumnWidth(column)),
    0,
  );

  return (
    <div
      className={`table-shell ${compact ? "is-compact" : ""}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table style={{ width: tableWidth, minWidth: "100%" }}>
        <colgroup>
          {columns.map((column) => (
            <col
              key={column}
              style={{ width: columnWidths[column] ?? defaultColumnWidth(column) }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                data-column={column}
                aria-sort={sort?.column === column ? sort.direction : "none"}
              >
                <button
                  className="sort-button"
                  type="button"
                  onClick={() => toggleSort(column)}
                  title={`${column} 기준 정렬`}
                >
                  <span>{column}</span>
                  <i aria-hidden="true">
                    {sort?.column === column
                      ? sort.direction === "ascending"
                        ? "↑"
                        : "↓"
                      : "↕"}
                  </i>
                </button>
                <span
                  className="column-resizer"
                  role="separator"
                  aria-label={`${column} 열 너비 조절`}
                  aria-orientation="vertical"
                  title="좌우로 드래그하여 열 너비 조절"
                  tabIndex={0}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    resizeColumn(column, event.key === "ArrowLeft" ? -12 : 12);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    resizeState.current = {
                      column,
                      startX: event.clientX,
                      startWidth: columnWidths[column] ?? defaultColumnWidth(column),
                    };
                  }}
                  onPointerMove={(event) => {
                    const current = resizeState.current;
                    if (!current || current.column !== column) return;
                    setColumnWidths((widths) => ({
                      ...widths,
                      [column]: Math.max(
                        80,
                        Math.min(600, current.startWidth + event.clientX - current.startX),
                      ),
                    }));
                  }}
                  onPointerUp={(event) => {
                    resizeState.current = undefined;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onPointerCancel={() => {
                    resizeState.current = undefined;
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIndex) => (
            <tr key={`${String(row[columns[0]])}-${rowIndex}`}>
              {columns.map((column) => (
                <td
                  key={column}
                  data-column={column}
                  title={
                    row[column] === null || row[column] === undefined
                      ? undefined
                      : String(row[column])
                  }
                  className={[
                    highlightSet.has(column) ? "is-highlighted" : "",
                    cellClassName?.(row, column) ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {cellRenderer
                    ? cellRenderer(
                        row,
                        column,
                        formatValue(row[column], percentSet.has(column)),
                      )
                    : cellFormatter
                      ? cellFormatter(
                          row,
                          column,
                          formatValue(row[column], percentSet.has(column)),
                        )
                      : formatValue(row[column], percentSet.has(column))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows && rows.length > maxRows ? (
        <p className="table-note">전체 {rows.length}행 중 {maxRows}행 표시</p>
      ) : null}
    </div>
  );
});
