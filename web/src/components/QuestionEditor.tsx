import { useState } from "react";
import type { TableRow } from "../lib/analysisEngine";

interface QuestionEditorProps {
  rows: TableRow[];
  onChange(rows: TableRow[]): void;
  onReset(): void;
}

const EDITABLE_COLUMNS = [
  "문항번호",
  "평가영역",
  "성취기준",
  "난이도",
  "배점",
  "정답",
] as const;

export function QuestionEditor({
  rows,
  onChange,
  onReset,
}: QuestionEditorProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(() => new Set());

  const updateCell = (
    rowIndex: number,
    column: (typeof EDITABLE_COLUMNS)[number],
    rawValue: string,
  ) => {
    const value =
      column === "문항번호" || column === "배점"
        ? Math.max(0, Number(rawValue) || 0)
        : rawValue;
    onChange(
      rows.map((row, index) =>
        index === rowIndex ? { ...row, [column]: value } : row,
      ),
    );
  };

  const addQuestion = () => {
    const nextNumber =
      Math.max(
        0,
        ...rows.map((row) => Number(row["문항번호"]) || 0),
      ) + 1;
    onChange([
      ...rows,
      {
        문항번호: nextNumber,
        평가영역: "",
        성취기준: "",
        난이도: "보통",
        배점: 0,
        정답: "",
      },
    ]);
  };

  const deleteSelected = () => {
    if (selectedRows.size === 0 || selectedRows.size >= rows.length) return;
    onChange(rows.filter((_, index) => !selectedRows.has(index)));
    setSelectedRows(new Set());
  };

  return (
    <div className="question-editor">
      <div className="question-editor-toolbar">
        <p>
          수정값은 <strong>분석 결과 보기</strong>를 누를 때 분석과 AI
          데이터에 반영됩니다.
        </p>
        <div>
          <button className="secondary-button" type="button" onClick={onReset}>
            원본으로 되돌리기
          </button>
          <button className="secondary-button" type="button" onClick={addQuestion}>
            + 문항 추가
          </button>
          <button
            className="danger-button"
            type="button"
            disabled={selectedRows.size === 0 || selectedRows.size >= rows.length}
            onClick={deleteSelected}
          >
            선택 문항 삭제
          </button>
        </div>
      </div>

      <div className="question-editor-table">
        <table>
          <thead>
            <tr>
              {EDITABLE_COLUMNS.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
              <th scope="col">삭제</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>
                  <input
                    aria-label={`${rowIndex + 1}행 문항번호`}
                    className="number-input"
                    type="number"
                    min="1"
                    step="1"
                    value={Number(row["문항번호"]) || 0}
                    onChange={(event) =>
                      updateCell(rowIndex, "문항번호", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`${rowIndex + 1}행 평가영역`}
                    type="text"
                    value={String(row["평가영역"] ?? "")}
                    onChange={(event) =>
                      updateCell(rowIndex, "평가영역", event.target.value)
                    }
                  />
                </td>
                <td>
                  <textarea
                    aria-label={`${rowIndex + 1}행 성취기준`}
                    rows={2}
                    value={String(row["성취기준"] ?? "")}
                    onChange={(event) =>
                      updateCell(rowIndex, "성취기준", event.target.value)
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`${rowIndex + 1}행 난이도`}
                    value={String(row["난이도"] ?? "보통")}
                    onChange={(event) =>
                      updateCell(rowIndex, "난이도", event.target.value)
                    }
                  >
                    <option value="">미입력</option>
                    <option value="어려움">어려움</option>
                    <option value="보통">보통</option>
                    <option value="쉬움">쉬움</option>
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`${rowIndex + 1}행 배점`}
                    className="number-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={Number(row["배점"]) || 0}
                    onChange={(event) =>
                      updateCell(rowIndex, "배점", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`${rowIndex + 1}행 정답`}
                    className="answer-input"
                    type="text"
                    value={String(row["정답"] ?? "")}
                    onChange={(event) =>
                      updateCell(rowIndex, "정답", event.target.value)
                    }
                  />
                </td>
                <td className="delete-cell">
                  <input
                    aria-label={`${rowIndex + 1}행 삭제 선택`}
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={(event) => {
                      setSelectedRows((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(rowIndex);
                        else next.delete(rowIndex);
                        return next;
                      });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
