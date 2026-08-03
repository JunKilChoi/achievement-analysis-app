import { useMemo } from "react";
import type { TableRow } from "../lib/analysisEngine";

interface QuestionSummaryProps {
  rows: TableRow[];
}

export function QuestionSummary({ rows }: QuestionSummaryProps) {
  const groups = useMemo(() => {
    const grouped = new Map<string, TableRow[]>();
    rows.forEach((row) => {
      const standard = String(row["성취기준"] ?? "").trim() || "미입력";
      grouped.set(standard, [...(grouped.get(standard) ?? []), row]);
    });
    return Array.from(grouped.entries());
  }, [rows]);

  return (
    <details className="question-summary">
      <summary>수정된 문항정보 요약</summary>
      <p>
        성취기준별로 평가요소, 난이도 배치, 문항 구성과 총점을 확인합니다.
        평가요소가 각 문항의 실제 평가 내용을 충분히 구분하는지 점검하세요.
      </p>
      {groups.length ? (
        <div className="standard-card-grid">
          {groups.map(([standard, questions]) => {
            const totalScore = questions.reduce(
              (sum, row) => sum + (Number(row["배점"]) || 0),
              0,
            );
            const difficulty = ["어려움", "보통", "쉬움", "미입력"]
              .map((level) => {
                const matches = questions.filter(
                  (row) => (String(row["난이도"] ?? "").trim() || "미입력") === level,
                );
                if (!matches.length) return null;
                const score = matches.reduce(
                  (sum, row) => sum + (Number(row["배점"]) || 0),
                  0,
                );
                return `${level} ${matches.length}문항 / ${score.toFixed(1)}점`;
              })
              .filter(Boolean);
            const evaluationItems = Array.from(
              new Set(
                questions.map(
                  (row) => String(row["평가영역"] ?? "").trim() || "미입력",
                ),
              ),
            );

            return (
              <article className="standard-summary-card" key={standard}>
                <h3>{standard}</h3>
                <div className="standard-card-metrics">
                  <span>
                    총점 <strong>{totalScore.toFixed(1)}점</strong>
                  </span>
                  <span>
                    문항수 <strong>{questions.length}문항</strong>
                  </span>
                </div>
                <h4>난이도 구성</h4>
                <div className="summary-chip-wrap">
                  {difficulty.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <h4>평가요소</h4>
                <ul>
                  {evaluationItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h4>문항 구성</h4>
                <ul>
                  {[...questions]
                    .sort(
                      (left, right) =>
                        Number(left["문항번호"]) - Number(right["문항번호"]),
                    )
                    .map((row) => (
                      <li key={String(row["문항번호"])}>
                        {String(row["문항번호"])}번 ·{" "}
                        {String(row["난이도"] || "미입력")} ·{" "}
                        {(Number(row["배점"]) || 0).toFixed(1)}점 ·{" "}
                        {String(row["평가영역"] || "미입력")}
                      </li>
                    ))}
                </ul>
              </article>
            );
          })}
        </div>
      ) : (
        <p>표시할 문항정보가 없습니다.</p>
      )}
    </details>
  );
}
