import { useMemo, useState } from "react";
import type { AnalysisOutput, TableRow } from "../lib/analysisEngine";
import { AiAnalysis } from "./AiAnalysis";
import { DataTable } from "./DataTable";
import {
  buildItemDiagnoses,
  DEFAULT_ITEM_DIAGNOSIS_THRESHOLDS,
  ItemDiagnosis,
  type ItemDiagnosisThresholds,
} from "./ItemDiagnosis";
import { Notice } from "./Notice";
import { SummaryCard } from "./SummaryCard";

const TABS = [
  "데이터 확인",
  "성취도 분석",
  "문항별 분석",
  "학급별 분석",
  "평가영역별 분석",
  "성취기준별 분석",
  "성취수준별 분석",
  "학생 개별",
  "문항 진단",
  "통계 엑셀",
  "AI 분석",
] as const;

type TabName = (typeof TABS)[number];

interface AnalysisDashboardProps {
  output: AnalysisOutput;
  onReset(): void;
  onDownloadConfirm(): void;
  onDownloadAnalysis(): void;
}

interface StudentPickerProps {
  rows: TableRow[];
  value: string;
  onChange(value: string): void;
  idPrefix: string;
}

function numeric(row: TableRow, key: string) {
  const value = row[key];
  return typeof value === "number" ? value : Number(value ?? 0);
}

function displayClass(value: TableRow[string]) {
  const text = String(value ?? "미상");
  return text.endsWith("반") ? text : `${text}반`;
}

function PanelHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="panel-heading">
      <div>
        <p className="card-eyebrow">분석 결과</p>
        <h2>{title}</h2>
        <p className="heading-description">{description}</p>
      </div>
    </div>
  );
}

function StudentPicker({
  rows,
  value,
  onChange,
  idPrefix,
}: StudentPickerProps) {
  const classValues = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => String(row["반"]))))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "ko", { numeric: true })),
    [rows],
  );
  const currentRow =
    rows.find((row) => String(row["반/번호"]) === value) ?? rows[0];
  const currentClass = String(currentRow?.["반"] ?? classValues[0] ?? "");
  const classStudents = rows
    .filter((row) => String(row["반"]) === currentClass)
    .sort((left, right) => numeric(left, "번호") - numeric(right, "번호"));

  if (!rows.length) {
    return <Notice>학생 데이터가 없습니다.</Notice>;
  }

  return (
    <div className="student-picker">
      <label htmlFor={`${idPrefix}-class`}>
        <span>반 선택</span>
        <select
          id={`${idPrefix}-class`}
          value={currentClass}
          onChange={(event) => {
            const first = rows.find(
              (row) => String(row["반"]) === event.target.value,
            );
            onChange(String(first?.["반/번호"] ?? ""));
          }}
        >
          {classValues.map((classValue) => (
            <option key={classValue} value={classValue}>
              {displayClass(classValue)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${idPrefix}-student`}>
        <span>학생 선택</span>
        <select
          id={`${idPrefix}-student`}
          value={String(currentRow?.["반/번호"] ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          {classStudents.map((row) => (
            <option key={String(row["반/번호"])} value={String(row["반/번호"])}>
              {row["번호"]}번 {row["이름"]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function kernelDensity(scores: number[], samplePoints: number[], bandwidth: number) {
  const denominator = Math.max(scores.length * bandwidth, 1);
  return samplePoints.map(
    (point) =>
      scores.reduce((sum, score) => {
        const distance = (point - score) / bandwidth;
        return sum + Math.exp(-0.5 * distance * distance);
      }, 0) / denominator,
  );
}

function ScoreDistributionChart({
  students,
  classAchievement,
  fullScore,
}: {
  students: TableRow[];
  classAchievement: TableRow[];
  fullScore: number;
}) {
  if (!students.length || !classAchievement.length) {
    return <Notice>표시할 학급별 점수 데이터가 없습니다.</Notice>;
  }

  const width = 820;
  const height = 400;
  const margin = { top: 22, right: 22, bottom: 48, left: 50 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const samplePoints = Array.from(
    { length: 81 },
    (_, index) => (fullScore * index) / 80,
  );
  const bandwidth = Math.max(fullScore / 16, 1.8);
  const classes = classAchievement.map((classRow) => {
    const classValue = String(classRow["반"]);
    const scores = students
      .filter((student) => String(student["반"]) === classValue)
      .map((student) => numeric(student, "계산점수"));
    return {
      classValue,
      scores,
      density: kernelDensity(scores, samplePoints, bandwidth),
      min: numeric(classRow, "최저점"),
      max: numeric(classRow, "최고점"),
      mean: numeric(classRow, "평균"),
    };
  });
  const densityMax = Math.max(
    0.0001,
    ...classes.flatMap((classInfo) => classInfo.density),
  );
  const classStep = plotWidth / Math.max(classes.length, 1);
  const halfWidthMax = Math.min(34, classStep * 0.37);
  const y = (score: number) =>
    margin.top + plotHeight - (score / fullScore) * plotHeight;
  const ticks = Array.from({ length: 6 }, (_, index) => (fullScore * index) / 5);

  return (
    <div className="violin-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="학급별 점수 분포 항아리형 그래프"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="violin-grid-line"
              x1={margin.left}
              x2={width - margin.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="violin-axis-label"
              x={margin.left - 9}
              y={y(tick) + 4}
              textAnchor="end"
            >
              {tick.toFixed(tick % 1 ? 1 : 0)}
            </text>
          </g>
        ))}
        <text
          className="violin-axis-title"
          x={15}
          y={margin.top + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 15 ${margin.top + plotHeight / 2})`}
        >
          점수
        </text>
        {classes.map((classInfo, classIndex) => {
          const centerX = margin.left + classStep * (classIndex + 0.5);
          const leftPoints = samplePoints.map((score, index) => {
            const spread =
              (classInfo.density[index] / densityMax) * halfWidthMax;
            return `${centerX - spread},${y(score)}`;
          });
          const rightPoints = [...samplePoints]
            .reverse()
            .map((score, reverseIndex) => {
              const densityIndex = samplePoints.length - 1 - reverseIndex;
              const spread =
                (classInfo.density[densityIndex] / densityMax) * halfWidthMax;
              return `${centerX + spread},${y(score)}`;
            });
          const path = `M ${leftPoints.join(" L ")} L ${rightPoints.join(" L ")} Z`;
          const meanY = y(classInfo.mean);
          const minY = y(classInfo.min);
          const maxY = y(classInfo.max);

          return (
            <g key={classInfo.classValue}>
              <path className="violin-shape" d={path}>
                <title>
                  {displayClass(classInfo.classValue)} · 최저{" "}
                  {classInfo.min.toFixed(1)}점 · 평균{" "}
                  {classInfo.mean.toFixed(1)}점 · 최고{" "}
                  {classInfo.max.toFixed(1)}점
                </title>
              </path>
              <line
                className="violin-range-line"
                x1={centerX}
                x2={centerX}
                y1={maxY}
                y2={minY}
              />
              <line
                className="violin-range-line"
                x1={centerX - 6}
                x2={centerX + 6}
                y1={maxY}
                y2={maxY}
              />
              <line
                className="violin-range-line"
                x1={centerX - 6}
                x2={centerX + 6}
                y1={minY}
                y2={minY}
              />
              <rect
                className="violin-mean-point"
                x={centerX - 5}
                y={meanY - 5}
                width={10}
                height={10}
                rx={1}
                transform={`rotate(45 ${centerX} ${meanY})`}
              />
              <text
                className="violin-mean-label"
                x={centerX + 10}
                y={meanY + 4}
              >
                {classInfo.mean.toFixed(1)}
              </text>
              <text
                className="violin-class-label"
                x={centerX}
                y={height - 18}
                textAnchor="middle"
              >
                {displayClass(classInfo.classValue)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="score-legend">
        <span>항아리 폭: 해당 점수대 학생 밀도</span>
        <span>검은 선: 최저~최고</span>
        <span>빨간 마름모: 평균</span>
      </div>
    </div>
  );
}

function VerticalLevelComparison({
  rows,
  classLabel,
}: {
  rows: TableRow[];
  classLabel: string;
}) {
  const maxRatio = Math.max(
    10,
    ...rows.flatMap((row) => [
      Number(row["전체비율"] ?? 0) * 100,
      Number(row["선택반비율"] ?? 0) * 100,
    ]),
  );
  const chartMax = Math.min(100, Math.ceil(maxRatio / 10) * 10);

  return (
    <div className="vertical-level-chart">
      <div className="vertical-chart-legend">
        <span className="legend-overall">전체</span>
        <span className="legend-class">{classLabel}</span>
      </div>
      <div className="vertical-chart-plot">
        {rows.map((row) => {
          const overall = Number(row["전체비율"] ?? 0) * 100;
          const selected = Number(row["선택반비율"] ?? 0) * 100;
          return (
            <div className="vertical-bar-group" key={String(row["성취수준"])}>
              <div className="vertical-bars">
                <span
                  className="vertical-bar overall"
                  style={{ height: `${(overall / chartMax) * 100}%` }}
                  title={`전체 ${overall.toFixed(1)}%`}
                >
                  <i>{overall.toFixed(1)}%</i>
                </span>
                <span
                  className="vertical-bar selected"
                  style={{ height: `${(selected / chartMax) * 100}%` }}
                  title={`${classLabel} ${selected.toFixed(1)}%`}
                >
                  <i>{selected.toFixed(1)}%</i>
                </span>
              </div>
              <strong>{String(row["성취수준"])}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function expectedBounds(difficulty: string, hardCut: number, easyCut: number) {
  if (difficulty.includes("어려")) return [0, hardCut] as const;
  if (difficulty.includes("보통") || difficulty === "중")
    return [hardCut, easyCut] as const;
  if (difficulty.includes("쉬")) return [easyCut, 100] as const;
  return null;
}

function makeDifficultyRows(
  baseRows: TableRow[],
  itemRows: TableRow[],
  hardCut: number,
  easyCut: number,
) {
  const itemMap = new Map(
    itemRows.map((row) => [String(row["문항번호"]), row]),
  );
  return baseRows.map((base) => {
    const item = itemMap.get(String(base["문항번호"])) ?? {};
    const actual = numeric(item, "정답률") * 100;
    const difficulty = String(base["예상난이도"] ?? "");
    const bounds = expectedBounds(difficulty, hardCut, easyCut);
    let gap: number | null = null;
    if (bounds) {
      const [low, high] = bounds;
      gap = actual < low ? actual - low : actual >= high && high < 100 ? actual - high : 0;
    }
    const label =
      gap === null
        ? "비교 불가"
        : Math.abs(gap) < 0.05
          ? "일치"
          : gap < 0
            ? "예상보다 어려웠음"
            : "예상보다 쉬웠음";
    return {
      문항번호: base["문항번호"],
      평가영역: item["평가영역"] ?? base["평가영역"],
      예상난이도: difficulty,
      기대정답률구간: bounds ? `${bounds[0].toFixed(0)}%-${bounds[1].toFixed(0)}%` : "",
      "실제정답률(%)": actual,
      "차이(%p)": gap,
      판정: label,
    };
  });
}

function levelCellClass(row: TableRow, column: string) {
  if (!"ABCDE".includes(column)) return undefined;
  const levels = ["A", "B", "C", "D", "E"];
  const values = levels.map((level) => {
    const value = row[level];
    return value === null || value === undefined || value === "" ? null : Number(value);
  });
  const inverted = new Set<string>();
  for (let right = 1; right < levels.length; right += 1) {
    if (values[right] === null) continue;
    for (let left = 0; left < right; left += 1) {
      if (
        values[left] !== null &&
        (values[right] as number) > (values[left] as number) + 1e-12
      ) {
        for (let index = left; index <= right; index += 1) {
          if (values[index] !== null) inverted.add(levels[index]);
        }
      }
    }
  }
  return inverted.has(column) ? "is-inverted" : undefined;
}

export function AnalysisDashboard({
  output,
  onReset,
  onDownloadConfirm,
  onDownloadAnalysis,
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabName>("성취도 분석");
  const [comparisonClass, setComparisonClass] = useState("");
  const [hardCut, setHardCut] = useState(33);
  const [easyCut, setEasyCut] = useState(66);
  const [domainStudent, setDomainStudent] = useState("");
  const [standardStudent, setStandardStudent] = useState("");
  const [detailStudent, setDetailStudent] = useState("");
  const [diagnosisItemNumber, setDiagnosisItemNumber] = useState("");
  const [diagnosisThresholds, setDiagnosisThresholds] =
    useState<ItemDiagnosisThresholds>(DEFAULT_ITEM_DIAGNOSIS_THRESHOLDS);
  const { summary, tables } = output;

  const achievement = tables.achievement[0] ?? {};
  const individualRows = useMemo(
    () =>
      [...tables.individual].sort(
        (left, right) =>
          numeric(left, "반") - numeric(right, "반") ||
          numeric(left, "번호") - numeric(right, "번호"),
      ),
    [tables.individual],
  );
  const selectedStudentRow =
    individualRows.find((row) => String(row["반/번호"]) === detailStudent) ??
    individualRows[0];
  const selectedDomainStudent =
    domainStudent || String(individualRows[0]?.["반/번호"] ?? "");
  const selectedStandardStudent =
    standardStudent || String(individualRows[0]?.["반/번호"] ?? "");
  const selectedDetailStudent =
    detailStudent || String(individualRows[0]?.["반/번호"] ?? "");
  const classes = tables.classAchievement.map((row) => String(row["반"]));
  const selectedComparisonClass = comparisonClass || classes[0] || "";

  const levelRows = Object.entries(summary.levelCounts).map(([level, count]) => ({
    성취수준: level,
    "학생수(명)": count,
    "비율(%)": summary.studentCount ? (count / summary.studentCount) * 100 : 0,
  }));
  const selectedClassStudents = tables.students.filter(
    (student) => String(student["반"]) === selectedComparisonClass,
  );
  const selectedClassLevelRows = ["A", "B", "C", "D", "E"].map((level) => {
    const classCount = selectedClassStudents.filter(
      (student) => String(student["성취수준"]) === level,
    ).length;
    const totalCount = summary.levelCounts[level as keyof typeof summary.levelCounts];
    return {
      성취수준: level,
      "선택반학생수(명)": classCount,
      선택반비율: selectedClassStudents.length
        ? classCount / selectedClassStudents.length
        : 0,
      "전체학생수(명)": totalCount,
      전체비율: summary.studentCount ? totalCount / summary.studentCount : 0,
    };
  });

  const classItemRows = useMemo(() => {
    const pivotMap = new Map(
      tables.classItemPivot.map((row) => [String(row["문항번호"]), row]),
    );
    return tables.item.map((item) => {
      const pivot = pivotMap.get(String(item["문항번호"])) ?? {};
      const merged: TableRow = { ...item, ...pivot };
      const classRates = Object.entries(merged)
        .filter(([key, value]) => key.endsWith("반_정답률") && value !== null)
        .map(([, value]) => Number(value));
      return {
        ...merged,
        학급간최대차:
          classRates.length > 1
            ? Math.max(...classRates) - Math.min(...classRates)
            : null,
      } as TableRow;
    });
  }, [tables.classItemPivot, tables.item]);
  const classRateColumns = Object.keys(classItemRows[0] ?? {}).filter((key) =>
    key.endsWith("반_정답률"),
  );
  const classGapRows = classItemRows
    .map((row) => {
      const rates = classRateColumns
        .map((column) => ({ column, value: Number(row[column]) }))
        .filter((item) => Number.isFinite(item.value));
      if (!rates.length) return null;
      const highest = rates.reduce((best, item) =>
        item.value > best.value ? item : best,
      );
      const lowest = rates.reduce((best, item) =>
        item.value < best.value ? item : best,
      );
      return {
        문항번호: row["문항번호"],
        평가영역: row["평가영역"],
        전체정답률: row["정답률"],
        최고학급: highest.column.replace("_정답률", ""),
        최고학급정답률: highest.value,
        최저학급: lowest.column.replace("_정답률", ""),
        최저학급정답률: lowest.value,
        학급간차이: highest.value - lowest.value,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => Number(right.학급간차이) - Number(left.학급간차이));

  const validDifficultyCuts = hardCut < easyCut;
  const difficultyRows = makeDifficultyRows(
    tables.difficultyGap,
    tables.item,
    validDifficultyCuts ? hardCut : 33,
    validDifficultyCuts ? easyCut : 66,
  );
  const difficultyCounts = {
    match: difficultyRows.filter((row) => row.판정 === "일치").length,
    harder: difficultyRows.filter((row) => row.판정 === "예상보다 어려웠음").length,
    easier: difficultyRows.filter((row) => row.판정 === "예상보다 쉬웠음").length,
  };
  const itemDiagnoses = useMemo(
    () => buildItemDiagnoses(tables, difficultyRows, diagnosisThresholds),
    [tables, difficultyRows, diagnosisThresholds],
  );
  const diagnosisByNumber = useMemo(
    () => new Map(itemDiagnoses.map((diagnosis) => [diagnosis.itemNumber, diagnosis])),
    [itemDiagnoses],
  );
  const itemDiagnosisRows = useMemo(
    () =>
      tables.item.map((row) => {
        const diagnosis = diagnosisByNumber.get(String(row["문항번호"]));
        return { ...row, 진단: diagnosis?.label ?? "진단 보기" };
      }),
    [tables.item, diagnosisByNumber],
  );
  const itemDiagnosisColumns = useMemo(() => {
    const columns = Object.keys(tables.item[0] ?? {});
    const questionIndex = columns.indexOf("문항번호");
    columns.splice(questionIndex >= 0 ? questionIndex + 1 : 0, 0, "진단");
    return columns;
  }, [tables.item]);

  const openItemDiagnosis = (itemNumber: string) => {
    setDiagnosisItemNumber(itemNumber);
    setActiveTab("문항 진단");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const domainOneRows = tables.domainScores
    .filter((row) => String(row["반/번호"]) === selectedDomainStudent)
    .sort((left, right) =>
      String(left["평가영역"]).localeCompare(String(right["평가영역"]), "ko"),
    );
  const standardMeta = new Map(
    tables.standard.map((row) => [String(row["성취기준"]), row]),
  );
  const standardOneRows = tables.standardScores
    .filter((row) => String(row["반/번호"]) === selectedStandardStudent)
    .map((row) => ({ ...row, ...(standardMeta.get(String(row["성취기준"])) ?? {}) }))
    .sort((left, right) =>
      String(left["성취기준"]).localeCompare(String(right["성취기준"]), "ko"),
    );
  const studentLongRows = tables.long
    .filter((row) => String(row["반/번호"]) === selectedDetailStudent)
    .sort((left, right) => numeric(left, "문항번호") - numeric(right, "문항번호"));

  return (
    <main className="dashboard">
      <section className="dashboard-header">
        <div>
          <p className="hero-kicker">성취수준별 평가결과 분석</p>
          <h1>분석 결과</h1>
          <p>
            {summary.questionCount}문항 · {summary.studentCount}명 ·{" "}
            {summary.answerFileCount}개 정오표 · {summary.totalFullScore}점 만점
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="secondary-button" type="button" onClick={onReset}>
            자동 인식 결과로 돌아가기
          </button>
        </div>
      </section>

      {summary.validationWarningCount === 0 ? (
        <Notice tone="success">
          문항정보표와 학생답 정오표의 정답·배점 검증 결과가 정상입니다.
        </Notice>
      ) : (
        <Notice tone="warning">
          문항정보표와 학생답 정오표의 정답·배점이 다른 문항이 있습니다.
          데이터 확인의 검증결과를 확인하세요.
        </Notice>
      )}

      <nav className="analysis-tabs" aria-label="분석 결과 메뉴">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "is-active" : ""}
            aria-current={activeTab === tab ? "page" : undefined}
            onClick={() => {
              if (tab === "문항 진단" && !diagnosisItemNumber) {
                const firstReview = itemDiagnoses.find(
                  (diagnosis) => diagnosis.severity !== "stable",
                );
                setDiagnosisItemNumber(firstReview?.itemNumber ?? itemDiagnoses[0]?.itemNumber ?? "");
              }
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="analysis-panel">
        {activeTab === "데이터 확인" ? (
          <>
            <PanelHeading
              title="데이터 확인"
              description="자동 인식된 원자료와 정답·배점 검증 결과를 확인합니다."
            />
            <div className="summary-grid dashboard-summary">
              <SummaryCard label="문항 수" value={`${summary.questionCount}개`} />
              <SummaryCard label="학생 수" value={`${summary.studentCount}명`} />
              <SummaryCard label="정오표 파일" value={`${summary.answerFileCount}개`} />
              <SummaryCard
                label="검증 필요"
                value={`${summary.validationWarningCount}건`}
                accent={summary.validationWarningCount === 0}
              />
            </div>
            <h3 className="subsection-title">문항정보</h3>
            <Notice>
              문항번호, 평가요소, 성취기준, 배점, 정답이 제대로 인식되었는지
              확인하세요. 이전 단계의 수정값과 복수정답 표기도 이 표에
              반영됩니다.
            </Notice>
            <DataTable rows={tables.questions} columns={Object.keys(tables.questions[0] ?? {})} />

            <h3 className="subsection-title">학생 정오표</h3>
            <Notice>
              정오표 종류에 따라 학생답이 ‘.’ 또는 정답 번호로 표시될 수
              있으며 둘 다 정상 처리됩니다. 담당 반 전체와 학생 수, 반·번호,
              이름이 맞는지 확인하세요.
            </Notice>
            <DataTable
              rows={tables.rawStudents}
              columns={Object.keys(tables.rawStudents[0] ?? {})}
              maxHeight={360}
            />

            <h3 className="subsection-title">검증결과</h3>
            <Notice>
              문항정보표의 정답·배점과 정오표의 정답·배점이 일치하는지
              확인합니다. 모두 정상이라면 다른 분석 결과를 확인하세요.
            </Notice>
            <DataTable
              rows={tables.validation}
              columns={Object.keys(tables.validation[0] ?? {})}
              maxHeight={360}
            />
          </>
        ) : null}

        {activeTab === "성취도 분석" ? (
          <>
            <PanelHeading
              title="성취도 분석"
              description="전체 성취도와 학급별 점수·성취수준 분포를 비교합니다."
            />
            <div className="metric-strip">
              {[
                ["평균(점)", numeric(achievement, "평균").toFixed(2)],
                ["표준편차", numeric(achievement, "표준편차").toFixed(2)],
                [
                  "최고/최저(점)",
                  `${numeric(achievement, "최고점").toFixed(1)} / ${numeric(achievement, "최저점").toFixed(1)}`,
                ],
                [
                  "검사신뢰도 α",
                  summary.reliabilityAlpha === null
                    ? "—"
                    : summary.reliabilityAlpha.toFixed(3),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <DataTable rows={tables.achievement} columns={Object.keys(tables.achievement[0] ?? {})} />
            <Notice>
              표준편차는 점수가 평균 주위에 얼마나 흩어졌는지를 보여줍니다.
              현재 표준편차는 만점 대비{" "}
              {summary.totalFullScore
                ? ((numeric(achievement, "표준편차") / summary.totalFullScore) * 100).toFixed(1)
                : "0.0"}
              %입니다. 대략 10% 이하는 분포가 좁은 편, 10~20%는 어느 정도
              차이가 있는 편, 20% 이상은 학생 간 차이가 큰 편으로 참고하되
              평균, 수준 분포와 문항별 정답률을 함께 보세요.
            </Notice>

            <div className="chart-grid">
              <article className="chart-card">
                <h3>전체 분석 그래프</h3>
                <p>
                  항아리 폭이 넓을수록 해당 점수대 학생이 많습니다. 검은 선은
                  최저~최고점, 빨간 마름모는 평균입니다.
                </p>
                <ScoreDistributionChart
                  students={tables.students}
                  classAchievement={tables.classAchievement}
                  fullScore={summary.totalFullScore}
                />
                <h4 className="chart-subtitle">전체 성취수준별 비율</h4>
                <DataTable
                  rows={levelRows}
                  columns={["성취수준", "학생수(명)", "비율(%)"]}
                />
              </article>
              <article className="chart-card">
                <h3>개별 반 분석 그래프</h3>
                <p>
                  전체와 선택한 반의 A~E 성취수준별 비율을 세로 막대로
                  비교합니다.
                </p>
                <label className="select-field">
                  <span>학급 선택</span>
                  <select
                    value={selectedComparisonClass}
                    onChange={(event) => setComparisonClass(event.target.value)}
                  >
                    {classes.map((classValue) => (
                      <option key={classValue} value={classValue}>
                        {displayClass(classValue)}
                      </option>
                    ))}
                  </select>
                </label>
                <VerticalLevelComparison
                  rows={selectedClassLevelRows}
                  classLabel={displayClass(selectedComparisonClass)}
                />
                <h4 className="chart-subtitle">
                  {displayClass(selectedComparisonClass)} 성취수준별 비율
                </h4>
                <DataTable
                  rows={selectedClassLevelRows.map((row) => ({
                    성취수준: row["성취수준"],
                    "학생수(명)": row["선택반학생수(명)"],
                    비율: row["선택반비율"],
                  }))}
                  columns={["성취수준", "학생수(명)", "비율"]}
                  percentColumns={["비율"]}
                />
              </article>
            </div>

            <h3 className="subsection-title">학급별 성취도</h3>
            <Notice>
              학급별 응시자 수, 평균, 표준편차, 최고점, 최저점과 A~E 인원을
              비교합니다. 평균 차이와 수준 분포 차이를 함께 확인하세요.
            </Notice>
            <DataTable
              rows={tables.classAchievement}
              columns={Object.keys(tables.classAchievement[0] ?? {})}
            />
          </>
        ) : null}

        {activeTab === "문항별 분석" ? (
          <>
            <PanelHeading
              title="문항별 분석"
              description="정답률, 변별도, 선택지 반응과 예상 난이도 차이를 확인합니다."
            />
            <Notice>
              표는 정답률이 낮은 문항부터 볼 수 있으며 모든 열 제목으로
              오름차순·내림차순 정렬할 수 있습니다. 변별도는 ‘상위 집단
              정답률-하위 집단 정답률’입니다. 일반적으로 40% 이상은 높음,
              20~40%는 어느 정도 있음, 20% 미만은 낮음으로 참고합니다.
              70% 이상처럼 매우 큰 경우도 하위 학생에게 지나치게 어려웠는지,
              특정 개념 결손이나 발문·선택지 혼란이 있었는지 정답률과 함께
              검토해야 합니다.
            </Notice>
            <DataTable
              rows={itemDiagnosisRows}
              columns={itemDiagnosisColumns}
              percentColumns={itemDiagnosisColumns.filter(
                (column) =>
                  column.includes("정답률") ||
                  column.includes("변별도") ||
                  column.includes("비율"),
              )}
              highlightColumns={["평가영역", "정답률", "변별도"]}
              initialSort={{ column: "정답률", direction: "ascending" }}
              cellClassName={(row, column) => {
                if (column !== "진단") return undefined;
                const severity = diagnosisByNumber.get(String(row["문항번호"]))?.severity;
                return severity ? `diagnosis-table-cell is-${severity}` : undefined;
              }}
              cellRenderer={(row, column, formattedValue) =>
                column === "진단" ? (
                  <button
                    className="diagnosis-link"
                    type="button"
                    onClick={() => openItemDiagnosis(String(row["문항번호"]))}
                  >
                    {formattedValue}
                  </button>
                ) : (
                  formattedValue
                )
              }
            />

            <h3 className="subsection-title">예상 난이도-실제 정답률 일치 여부</h3>
            <p className="section-description">
              문항정보표의 예상 난이도와 실제 정답률을 비교해 예상보다
              어려웠거나 쉬웠던 문항을 확인합니다.
            </p>
            <div className="difficulty-controls">
              <label>
                <span>어려움/보통 난이도 구분 정답률(%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={hardCut}
                  onChange={(event) => setHardCut(Number(event.target.value))}
                />
              </label>
              <label>
                <span>보통/쉬움 난이도 구분 정답률(%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={easyCut}
                  onChange={(event) => setEasyCut(Number(event.target.value))}
                />
              </label>
              <div>
                <b>어려움</b> &lt; {hardCut}% · <b>보통</b> {hardCut}% 이상{" "}
                {easyCut}% 미만 · <b>쉬움</b> {easyCut}% 이상
              </div>
            </div>
            {!validDifficultyCuts ? (
              <Notice tone="warning">
                보통/쉬움 기준은 어려움/보통 기준보다 커야 합니다. 현재 표는
                기본값 33%, 66%로 계산합니다.
              </Notice>
            ) : null}
            <div className="difficulty-summary-grid">
              <SummaryCard label="일치 문항수" value={`${difficultyCounts.match}개`} accent />
              <SummaryCard
                label="불일치 문항수"
                value={`${difficultyCounts.harder + difficultyCounts.easier}개`}
              />
              <SummaryCard label="예상보다 어려운 문항수" value={`${difficultyCounts.harder}개`} />
              <SummaryCard label="예상보다 쉬운 문항수" value={`${difficultyCounts.easier}개`} />
            </div>
            <DataTable
              rows={difficultyRows}
              columns={[
                "문항번호",
                "평가영역",
                "예상난이도",
                "기대정답률구간",
                "실제정답률(%)",
                "차이(%p)",
                "판정",
              ]}
            />
          </>
        ) : null}

        {activeTab === "학급별 분석" ? (
          <>
            <PanelHeading
              title="학급별 분석"
              description="문항별 전체 정답률과 모든 학급의 정답률을 한 표에서 비교합니다."
            />
            <Notice>
              특정 학급에서 유독 낮은 문항은 그 반에서 해당 개념이나 자료
              해석 과정이 충분히 정리되지 않았을 가능성을 보여줍니다. 전체
              정답률과 학급 간 차이를 함께 확인해 보충 설명이 필요한 문항을
              찾으세요.
            </Notice>
            <DataTable
              rows={classItemRows}
              columns={Object.keys(classItemRows[0] ?? {})}
              percentColumns={[
                "정답률",
                "변별도",
                "학급간최대차",
                ...classRateColumns,
              ]}
              highlightColumns={["정답률", "변별도", "학급간최대차"]}
            />
            <h3 className="subsection-title">학급 간 정답률 차이가 큰 문항</h3>
            <p className="section-description">
              학급별 정답률의 최고값과 최저값 차이가 큰 문항부터 보여줍니다.
              학급별 수업 흐름, 활동 경험과 오개념 차이를 확인할 때
              활용하세요.
            </p>
            {classGapRows.length ? (
              <DataTable
                rows={classGapRows}
                columns={[
                  "문항번호",
                  "평가영역",
                  "전체정답률",
                  "최고학급",
                  "최고학급정답률",
                  "최저학급",
                  "최저학급정답률",
                  "학급간차이",
                ]}
                percentColumns={[
                  "전체정답률",
                  "최고학급정답률",
                  "최저학급정답률",
                  "학급간차이",
                ]}
              />
            ) : (
              <Notice>학급 간 정답률 차이를 계산할 데이터가 없습니다.</Notice>
            )}
          </>
        ) : null}

        {activeTab === "평가영역별 분석" ? (
          <>
            <PanelHeading
              title="평가영역별 분석"
              description="평가요소별 성취 정도를 비교해 보완이 필요한 수업 영역을 찾습니다."
            />
            <Notice>
              특정 영역이 낮다면 점수뿐 아니라 그 영역에서 요구한 개념 이해,
              자료 해석, 계산, 실험 설계와 추론 중 어디에서 막혔는지
              살펴보세요. 환산점수는 배점이 다른 영역을 비교할 수 있도록
              100점 만점 기준으로 바꾼 값입니다.
            </Notice>
            <DataTable
              rows={[...tables.domain].sort(
                (left, right) => numeric(left, "정답률") - numeric(right, "정답률"),
              )}
              columns={["평가영역", "문항수", "배점합계", "평균점수", "환산평균", "정답률"]}
              percentColumns={["정답률"]}
              highlightColumns={["정답률"]}
            />
            <h3 className="subsection-title">개인별 평가영역 분석</h3>
            <StudentPicker
              rows={individualRows}
              value={selectedDomainStudent}
              onChange={setDomainStudent}
              idPrefix="domain"
            />
            <DataTable
              rows={domainOneRows}
              columns={["평가영역", "영역점수", "영역배점", "영역환산점수", "영역정답률"]}
              percentColumns={["영역정답률"]}
              highlightColumns={["영역정답률"]}
            />
          </>
        ) : null}

        {activeTab === "성취기준별 분석" ? (
          <>
            <PanelHeading
              title="성취기준별 분석"
              description="성취기준별 관련 문항과 도달 정도를 함께 확인합니다."
            />
            <Notice>
              하나의 성취기준에는 개념 이해, 자료 해석, 원리 적용과 탐구 과정
              등 여러 평가요소가 포함될 수 있습니다. 결과가 낮다고 기준
              전체를 달성하지 못했다고 단정하지 말고 관련 문항과 평가요소를
              함께 확인하세요.
            </Notice>
            <DataTable
              rows={tables.standard}
              columns={["성취기준", "평가영역", "문항번호", "문항수", "배점합계", "평균점수", "정답률"]}
              percentColumns={["정답률"]}
              highlightColumns={["성취기준", "정답률"]}
            />
            <h3 className="subsection-title">개인별 성취기준 분석</h3>
            <StudentPicker
              rows={individualRows}
              value={selectedStandardStudent}
              onChange={setStandardStudent}
              idPrefix="standard"
            />
            <DataTable
              rows={standardOneRows}
              columns={[
                "성취기준",
                "평가영역",
                "문항번호",
                "성취기준점수",
                "성취기준배점",
                "성취기준환산점수",
                "성취기준정답률",
              ]}
              percentColumns={["성취기준정답률"]}
              highlightColumns={["성취기준", "성취기준정답률"]}
            />
          </>
        ) : null}

        {activeTab === "성취수준별 분석" ? (
          <>
            <PanelHeading
              title="성취수준별 문항 분석"
              description="A~E 수준별 정답률과 수준 간 격차를 문항별로 확인합니다."
            />
            <Notice>
              A~E 열은 해당 수준 학생 중 문항을 맞힌 비율입니다. 상위
              수준에서도 낮은 문항은 전체적으로 어려웠을 수 있고, 특정
              수준부터 급격히 낮아지는 문항은 이해가 갈린 지점을 보여줄 수
              있습니다. 괄호 안은 해당 문항을 맞힌 학생 수입니다. 해당 수준
              학생이 없으면 ‘—’로 표시되며, 연한 빨간색은 A ≥ B ≥ C ≥ D ≥ E
              순서가 역전된 구간입니다.
            </Notice>
            {tables.levelItem.length ? (
              <DataTable
                rows={tables.levelItem}
                columns={["평가영역", "문항번호", "정답률", "A", "B", "C", "D", "E", "수준간격차"]}
                percentColumns={["정답률", "A", "B", "C", "D", "E", "수준간격차"]}
                highlightColumns={["수준간격차"]}
                cellClassName={levelCellClass}
                cellFormatter={(row, column, formattedValue) => {
                  if (!"ABCDE".includes(column) || formattedValue === "—") {
                    return formattedValue;
                  }
                  const levelCount =
                    summary.levelCounts[column as keyof typeof summary.levelCounts] ?? 0;
                  const correctCount = Math.round(numeric(row, column) * levelCount);
                  return `${formattedValue} (${correctCount}명)`;
                }}
              />
            ) : (
              <Notice tone="warning">
                표시할 데이터가 없습니다. 성취수준 분할점수와 학생 총점이
                정상적으로 산출되었는지 확인하세요.
              </Notice>
            )}
          </>
        ) : null}

        {activeTab === "학생 개별" ? (
          <>
            <PanelHeading
              title="학생 개별 분석"
              description="전체 학생 결과와 선택한 학생의 문항별 답안을 함께 확인합니다."
            />
            <Notice tone="warning">
              학생 이름은 웹앱 내부 확인용입니다. AI 분석으로 전송할 때는
              이름을 보내지 않는 익명화 옵션을 권장합니다.
            </Notice>
            <DataTable
              rows={individualRows.map((row) => ({
                ...row,
                "100점 만점 환산점수": row["환산점수"],
              }))}
              columns={[
                "반/번호",
                "반",
                "번호",
                "이름",
                "선택형점수",
                "서답형점수",
                "기타점수",
                "영역총점",
                "100점 만점 환산점수",
                "성취수준",
                "오답문항",
              ]}
              highlightColumns={["영역총점", "성취수준"]}
            />
            <h3 className="subsection-title">학생별 문항 결과</h3>
            <StudentPicker
              rows={individualRows}
              value={selectedDetailStudent}
              onChange={setDetailStudent}
              idPrefix="individual"
            />
            {selectedStudentRow ? (
              <div className="student-profile">
                <div>
                  <span>학생</span>
                  <strong>{String(selectedStudentRow["이름"])}</strong>
                  <small>{String(selectedStudentRow["반/번호"])}</small>
                </div>
                <div>
                  <span>영역총점</span>
                  <strong>{numeric(selectedStudentRow, "영역총점").toFixed(1)}점</strong>
                </div>
                <div>
                  <span>100점 만점 환산점수</span>
                  <strong>{numeric(selectedStudentRow, "환산점수").toFixed(1)}점</strong>
                </div>
                <div className="level-badge">
                  <span>성취수준</span>
                  <strong>{String(selectedStudentRow["성취수준"])}</strong>
                </div>
              </div>
            ) : null}
            <DataTable
              rows={studentLongRows}
              columns={[
                "문항번호",
                "평가영역",
                "난이도",
                "배점",
                "정답",
                "원본표시",
                "선택지",
                "정오",
                "점수",
                "성취기준",
              ]}
            />
          </>
        ) : null}

        {activeTab === "통계 엑셀" ? (
          <>
            <PanelHeading
              title="통계 엑셀"
              description="AI 분석문을 제외한 평가 통계와 분석표를 Excel 파일로 저장합니다."
            />
            <Notice>
              화면에서 확인한 통계 자료를 내려받는 메뉴입니다. AI 분석 결과와
              AI Word 보고서는 포함되지 않습니다.
            </Notice>
            <div className="download-panel statistics-download-panel">
              <div>
                <h3>확인용 Excel</h3>
                <p>자동 인식 자료와 분석 입력값을 한 파일로 확인합니다.</p>
              </div>
              <button className="secondary-button" type="button" onClick={onDownloadConfirm}>
                확인용 Excel 받기
              </button>
            </div>
            <div className="download-panel statistics-download-panel">
              <div className="statistics-download-copy">
                <h3>6종 종합 분석 Excel</h3>
                <p>모든 분석표를 찾기 쉬운 개별 시트로 정리한 Excel 한 파일입니다.</p>
                <div className="download-sheet-list" aria-label="포함된 분석 영역">
                  <span>성취도</span>
                  <span>문항별</span>
                  <span>학급별</span>
                  <span>평가영역별</span>
                  <span>성취기준별</span>
                  <span>성취수준별</span>
                </div>
              </div>
              <button className="primary-button" type="button" onClick={onDownloadAnalysis}>
                종합 분석 Excel 받기
              </button>
            </div>
          </>
        ) : null}

        {activeTab === "문항 진단" ? (
          <>
            <PanelHeading
              title="문항 진단"
              description="앞선 분석 결과를 종합해 한 문항씩 품질과 반응 특성을 검토합니다."
            />
            <Notice>
              문항번호를 누르거나 이전·다음 버튼으로 이동하세요. 빨간색은 우선
              검토, 주황색은 검토 권장 문항입니다. 문항별 분석표의 진단 버튼으로도
              이 화면의 해당 문항을 바로 열 수 있습니다.
            </Notice>
            <ItemDiagnosis
              diagnoses={itemDiagnoses}
              summary={summary}
              thresholds={diagnosisThresholds}
              selectedItemNumber={diagnosisItemNumber}
              onSelectedItemNumberChange={setDiagnosisItemNumber}
              onThresholdsChange={setDiagnosisThresholds}
            />
          </>
        ) : null}

        <div hidden={activeTab !== "AI 분석"}>
          <div className="ai-panel">
            <PanelHeading
              title="AI 분석"
              description="사용자의 OpenAI API 키로 통계 및 원안지 기반 분석을 실행합니다."
            />
            <AiAnalysis output={output} />
          </div>
        </div>
      </section>
    </main>
  );
}
