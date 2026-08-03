import type { AnswerFilePreview } from "../lib/analysisEngine";
import { DataTable } from "./DataTable";
import { Notice } from "./Notice";

interface AnswerFilePreviewTableProps {
  previews: AnswerFilePreview[];
  duplicateNames: string[];
  isLoading: boolean;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function AnswerFilePreviewTable({
  previews,
  duplicateNames,
  isLoading,
}: AnswerFilePreviewTableProps) {
  if (previews.length === 0 && duplicateNames.length === 0 && !isLoading) {
    return null;
  }

  const validRows = previews
    .filter((preview) => !preview.error)
    .map((preview) => ({
      파일명: preview.file.name,
      크기: formatBytes(preview.size),
      "인식 학생수": preview.studentCount,
      "인식 문항수": preview.questionCount,
      "인식 학급": preview.classes.length
        ? preview.classes.map((value) => `${value}반`).join(", ")
        : "미상",
    }));
  const failed = previews.filter((preview) => preview.error);

  return (
    <details className="uploaded-files-panel" open>
      <summary>업로드된 학생답 정오표 파일</summary>
      {isLoading ? <p className="analysis-status">추가한 정오표를 미리 확인하고 있습니다.</p> : null}
      {validRows.length ? (
        <>
          <DataTable
            compact
            rows={validRows}
            columns={["파일명", "크기", "인식 학생수", "인식 문항수", "인식 학급"]}
          />
          <Notice tone="success">
            정오표 {validRows.length}개가 현재 목록에 등록되어 있습니다.
          </Notice>
        </>
      ) : null}
      {duplicateNames.length ? (
        <Notice tone="info">
          이미 등록된 정오표 {duplicateNames.length}개는 중복 제외했습니다:{" "}
          {duplicateNames.join(", ")}
        </Notice>
      ) : null}
      {failed.length ? (
        <>
          <Notice tone="warning">
            정오표 {failed.length}개는 읽지 못해 제외했습니다.
          </Notice>
          <DataTable
            compact
            rows={failed.map((item) => ({
              파일명: item.file.name,
              오류: item.error ?? "알 수 없는 오류",
            }))}
            columns={["파일명", "오류"]}
          />
        </>
      ) : null}
    </details>
  );
}
