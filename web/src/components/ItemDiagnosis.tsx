import { useMemo, useState } from "react";
import type {
  AnalysisSummary,
  AnalysisTables,
  TableRow,
} from "../lib/analysisEngine";
import { Notice } from "./Notice";

export type ItemDiagnosisSeverity = "critical" | "review" | "stable";

export interface ItemDiagnosisThresholds {
  veryHardPercent: number;
  veryEasyPercent: number;
  classGapPercent: number;
  minimumClassSize: number;
}

export const DEFAULT_ITEM_DIAGNOSIS_THRESHOLDS: ItemDiagnosisThresholds = {
  veryHardPercent: 20,
  veryEasyPercent: 90,
  classGapPercent: 25,
  minimumClassSize: 15,
};

interface DiagnosisCheck {
  key: string;
  title: string;
  flagged: boolean;
  available: boolean;
  detail: string;
}

export interface ItemDiagnosisRecord {
  itemNumber: string;
  row: TableRow;
  question: TableRow;
  level: TableRow;
  levelCounts: Record<string, number>;
  difficulty: TableRow;
  severity: ItemDiagnosisSeverity;
  label: string;
  checks: DiagnosisCheck[];
  signalCount: number;
  maxClassGap: number | null;
  highestClass: string;
  lowestClass: string;
  classRates: Array<{ label: string; value: number; count: number }>;
  responseRates: Array<{ label: string; rate: number; correct: boolean }>;
}

function numeric(row: TableRow, key: string) {
  const rawValue = row[key];
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function percent(value: number | null, digits = 1) {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}

function alphaText(value: number | null) {
  return value === null ? "—" : value.toFixed(3);
}

function choiceTokens(value: unknown) {
  return new Set(
    String(value ?? "")
      .split(/[,+/\s]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

export function buildItemDiagnoses(
  tables: AnalysisTables,
  difficultyRows: TableRow[],
  thresholds: ItemDiagnosisThresholds,
): ItemDiagnosisRecord[] {
  const questionMap = new Map(
    tables.questions.map((row) => [String(row["문항번호"]), row]),
  );
  const levelMap = new Map(
    tables.levelItem.map((row) => [String(row["문항번호"]), row]),
  );
  const difficultyMap = new Map(
    difficultyRows.map((row) => [String(row["문항번호"]), row]),
  );
  return [...tables.item]
    .sort((left, right) => Number(left["문항번호"]) - Number(right["문항번호"]))
    .map((row) => {
      const itemNumber = String(row["문항번호"]);
      const question = questionMap.get(itemNumber) ?? {};
      const level = levelMap.get(itemNumber) ?? {};
      const difficulty = difficultyMap.get(itemNumber) ?? {};
      const classRates = tables.classItem
        .filter(
          (classItem) =>
            String(classItem["문항번호"]) === itemNumber &&
            Number(classItem["응시자수"] ?? 0) >= thresholds.minimumClassSize &&
            Number.isFinite(Number(classItem["정답률"])),
        )
        .map((classItem) => ({
          label: `${String(classItem["반"])}반`,
          value: Number(classItem["정답률"]),
          count: Number(classItem["응시자수"]),
        }));
      const highestClass = classRates.length
        ? classRates.reduce((best, current) => (current.value > best.value ? current : best))
        : null;
      const lowestClass = classRates.length
        ? classRates.reduce((best, current) => (current.value < best.value ? current : best))
        : null;
      const maxClassGap =
        highestClass && lowestClass ? highestClass.value - lowestClass.value : null;

      const rate = numeric(row, "정답률");
      const discrimination = numeric(row, "변별도");
      const levels = ["A", "B", "C", "D", "E"];
      let inverted = false;
      for (let left = 0; left < levels.length - 1; left += 1) {
        const leftRate = numeric(level, levels[left]);
        if (leftRate === null) continue;
        for (let right = left + 1; right < levels.length; right += 1) {
          const rightRate = numeric(level, levels[right]);
          if (rightRate !== null && rightRate > leftRate + 0.05) inverted = true;
        }
      }
      const itemResponses = tables.long.filter(
        (response) => String(response["문항번호"]) === itemNumber,
      );
      const levelCounts = Object.fromEntries(
        ["A", "B", "C", "D", "E"].map((levelName) => [
          levelName,
          itemResponses.filter(
            (response) => String(response["성취수준"] ?? "") === levelName,
          ).length,
        ]),
      );
      const counts = new Map<string, number>();
      itemResponses.forEach((response) => {
        const label = String(response["선택지"] ?? "").trim() || "무표기";
        counts.set(label, (counts.get(label) ?? 0) + 1);
      });
      const correctTokens = choiceTokens(row["정답"]);
      const responseRates = [...counts.entries()]
        .map(([label, count]) => ({
          label,
          rate: itemResponses.length ? count / itemResponses.length : 0,
          correct:
            correctTokens.has(label) ||
            [...choiceTokens(label)].every((token) => correctTokens.has(token)),
        }))
        .sort((left, right) => right.rate - left.rate);

      const wrongResponses = itemResponses.filter(
        (response) => response["정답여부"] === false,
      );
      const wrongChoiceCounts = new Map<string, number>();
      wrongResponses.forEach((response) => {
        const label = String(response["선택지"] ?? "").trim() || "무표기";
        wrongChoiceCounts.set(label, (wrongChoiceCounts.get(label) ?? 0) + 1);
      });
      const topWrongChoice = [...wrongChoiceCounts.entries()].sort(
        (left, right) => right[1] - left[1],
      )[0];
      const wrongConcentrated = Boolean(
        topWrongChoice &&
          topWrongChoice[1] >= itemResponses.length * 0.15 &&
          topWrongChoice[1] >= wrongResponses.length * 0.5,
      );

      const difficultyMismatch = Boolean(
        difficulty["판정"] && String(difficulty["판정"]) !== "일치",
      );
      const extremeRate = Boolean(
        rate !== null &&
          (rate < thresholds.veryHardPercent / 100 ||
            (rate > thresholds.veryEasyPercent / 100 &&
              discrimination !== null &&
              discrimination < 0.2)),
      );
      const classGapAvailable = classRates.length >= 2;
      const largeClassGap = Boolean(
        classGapAvailable &&
          maxClassGap !== null &&
          maxClassGap >= thresholds.classGapPercent / 100,
      );
      const checks: DiagnosisCheck[] = [
        {
          key: "discrimination",
          title: "낮은 변별도",
          flagged: discrimination !== null && discrimination < 0.2,
          available: discrimination !== null,
          detail:
            discrimination === null
              ? "상·하위 집단 자료 부족"
              : discrimination < 0
                ? `변별도 ${percent(discrimination)} · 음수이므로 우선 확인`
                : `변별도 ${percent(discrimination)} · 기준 20%p 미만`,
        },
        {
          key: "extreme-rate",
          title: "극단적인 정답률",
          flagged: extremeRate,
          available: rate !== null,
          detail:
            rate === null
              ? "정답률 자료 없음"
              : rate < thresholds.veryHardPercent / 100
                ? `정답률 ${percent(rate)} · 매우 어려움 기준 ${thresholds.veryHardPercent}% 미만`
                : rate > thresholds.veryEasyPercent / 100
                  ? discrimination !== null && discrimination < 0.2
                    ? `정답률 ${percent(rate)}이며 변별도도 20%p 미만`
                    : `정답률 ${percent(rate)}이나 변별도가 있어 신호에서 제외`
                  : `정답률 ${percent(rate)} · 설정 범위 안`,
        },
        {
          key: "difficulty",
          title: "예상 난이도 불일치",
          flagged: difficultyMismatch,
          available: Boolean(difficulty["판정"]),
          detail: difficulty["판정"]
            ? String(difficulty["판정"])
            : "예상 난이도 자료 없음",
        },
        {
          key: "class-gap",
          title: "큰 학급 간 차이",
          flagged: largeClassGap,
          available: classGapAvailable,
          detail: classGapAvailable
            ? `최대 ${percent(maxClassGap)} · 기준 ${thresholds.classGapPercent}%p 이상`
            : `응시자 ${thresholds.minimumClassSize}명 이상인 학급이 2개 미만`,
        },
        {
          key: "level-inversion",
          title: "성취수준 정답률 역전",
          flagged: inverted,
          available: levels.filter((name) => numeric(level, name) !== null).length >= 2,
          detail: inverted
            ? "하위 수준이 상위 수준보다 5%p 초과하여 높음"
            : "5%p를 넘는 역전 없음",
        },
        {
          key: "wrong-concentration",
          title: "특정 오답 집중",
          flagged: wrongConcentrated,
          available: wrongResponses.length > 0,
          detail: topWrongChoice
            ? `${topWrongChoice[0] === "무표기" ? "무표기" : `${topWrongChoice[0]}번`}에 오답자의 ${(topWrongChoice[1] / wrongResponses.length * 100).toFixed(1)}% 집중`
            : "오답 응답 없음",
        },
      ];
      const signalCount = checks.filter((check) => check.flagged).length;
      const negativeDiscrimination = discrimination !== null && discrimination < 0;
      const severity: ItemDiagnosisSeverity =
        negativeDiscrimination || signalCount >= 3
          ? "critical"
          : signalCount >= 1
            ? "review"
            : "stable";

      return {
        itemNumber,
        row,
        question,
        level,
        levelCounts,
        difficulty,
        severity,
        label:
          severity === "critical"
            ? "우선 검토"
            : severity === "review"
              ? "검토 권장"
              : "특이사항 없음",
        checks,
        signalCount,
        maxClassGap,
        highestClass: highestClass?.label ?? "—",
        lowestClass: lowestClass?.label ?? "—",
        classRates,
        responseRates,
      };
    });
}

interface ItemDiagnosisProps {
  diagnoses: ItemDiagnosisRecord[];
  summary: AnalysisSummary;
  thresholds: ItemDiagnosisThresholds;
  selectedItemNumber: string;
  onSelectedItemNumberChange(itemNumber: string): void;
  onThresholdsChange(thresholds: ItemDiagnosisThresholds): void;
}

export function ItemDiagnosis({
  diagnoses,
  summary,
  thresholds,
  selectedItemNumber,
  onSelectedItemNumberChange,
  onThresholdsChange,
}: ItemDiagnosisProps) {
  const [reviewOnly, setReviewOnly] = useState(false);
  const reviewItems = useMemo(
    () => diagnoses.filter((diagnosis) => diagnosis.severity !== "stable"),
    [diagnoses],
  );
  const visibleItems = reviewOnly && reviewItems.length ? reviewItems : diagnoses;
  const selected =
    diagnoses.find((diagnosis) => diagnosis.itemNumber === selectedItemNumber) ??
    reviewItems[0] ??
    diagnoses[0];
  const selectedVisibleIndex = Math.max(
    0,
    visibleItems.findIndex((diagnosis) => diagnosis.itemNumber === selected?.itemNumber),
  );

  if (!selected) return <Notice>진단할 문항 데이터가 없습니다.</Notice>;

  const goTo = (index: number) => {
    if (!visibleItems.length) return;
    const normalized = (index + visibleItems.length) % visibleItems.length;
    onSelectedItemNumberChange(visibleItems[normalized].itemNumber);
  };
  const row = selected.row;
  const levelRates = ["A", "B", "C", "D", "E"].map((level) => ({
    level,
    rate: numeric(selected.level, level),
    count: selected.levelCounts[level] ?? 0,
  }));
  const overallAlpha = summary.reliabilityAlpha;
  const deletedAlpha = numeric(row, "문항제외신뢰도");
  const alphaChange = numeric(row, "신뢰도변화");
  const checkMap = new Map(selected.checks.map((check) => [check.key, check]));
  const checkBadge = (key: string) => {
    const check = checkMap.get(key);
    if (!check?.available) return <span className="evidence-status is-unavailable">판정 자료 부족</span>;
    return check.flagged ? (
      <span className="evidence-status is-flagged">검토 신호</span>
    ) : (
      <span className="evidence-status is-normal">해당 없음</span>
    );
  };

  return (
    <div className="item-diagnosis">
      <details className="diagnosis-settings" open>
        <summary>진단 기준 설정</summary>
        <p>
          6개 기준 중 1~2개는 검토 권장, 3개 이상은 우선 검토로 표시합니다.
          변별도가 음수이면 신호 개수와 관계없이 우선 검토합니다.
        </p>
        <div className="diagnosis-settings-grid">
          <label>
            <span>매우 어려운 문항 정답률(%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={thresholds.veryHardPercent}
              onChange={(event) =>
                onThresholdsChange({ ...thresholds, veryHardPercent: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>매우 쉬운 문항 정답률(%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={thresholds.veryEasyPercent}
              onChange={(event) =>
                onThresholdsChange({ ...thresholds, veryEasyPercent: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>큰 학급 간 차이(%p)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={thresholds.classGapPercent}
              onChange={(event) =>
                onThresholdsChange({ ...thresholds, classGapPercent: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>학급별 최소 응시자(명)</span>
            <input
              type="number"
              min="2"
              max="100"
              value={thresholds.minimumClassSize}
              onChange={(event) =>
                onThresholdsChange({ ...thresholds, minimumClassSize: Number(event.target.value) })
              }
            />
          </label>
        </div>
        <small>
          매우 쉬운 문항은 정답률이 기준을 넘더라도 변별도가 20%p 이상이면
          기초 성취 확인 문항으로 보고 검토 신호에서 제외합니다.
        </small>
        <ul className="diagnosis-rule-summary">
          <li><b>낮은 변별도</b>: 상위 집단과 하위 집단의 정답률 차이가 20%p 미만</li>
          <li><b>극단적인 정답률</b>: 설정한 매우 어려움 기준 미만, 또는 매우 쉬움 기준 초과이면서 변별도도 20%p 미만</li>
          <li><b>예상 난이도 불일치</b>: 문항정보표의 난이도와 실제 정답률 구간이 다름</li>
          <li><b>큰 학급 간 차이</b>: 최소 응시자 기준을 충족한 두 학급 이상의 최대 차이가 설정값 이상</li>
          <li><b>성취수준 역전</b>: 하위 수준 정답률이 상위 수준보다 5%p를 초과하여 높음</li>
          <li><b>특정 오답 집중</b>: 한 오답이 전체 응시자의 15% 이상이면서 전체 오답의 50% 이상을 차지</li>
        </ul>
      </details>

      <div className="diagnosis-overview-strip" aria-label="문항 진단 요약">
        <div><span>전체 문항</span><strong>{diagnoses.length}</strong></div>
        <div className="is-critical"><span>우선 검토</span><strong>{diagnoses.filter((item) => item.severity === "critical").length}</strong></div>
        <div className="is-review"><span>검토 권장</span><strong>{diagnoses.filter((item) => item.severity === "review").length}</strong></div>
        <div className="is-stable"><span>특이사항 없음</span><strong>{diagnoses.filter((item) => item.severity === "stable").length}</strong></div>
      </div>

      <div className="diagnosis-toolbar">
        <div className="diagnosis-item-buttons" aria-label="진단 문항 선택">
          {diagnoses.map((diagnosis) => (
            <button
              key={diagnosis.itemNumber}
              type="button"
              className={`diagnosis-number is-${diagnosis.severity} ${selected.itemNumber === diagnosis.itemNumber ? "is-active" : ""}`}
              onClick={() => onSelectedItemNumberChange(diagnosis.itemNumber)}
              title={`${diagnosis.itemNumber}번 · ${diagnosis.label}`}
            >
              {diagnosis.itemNumber}
            </button>
          ))}
        </div>
        <label className="diagnosis-filter">
          <input
            type="checkbox"
            checked={reviewOnly}
            onChange={(event) => {
              const checked = event.target.checked;
              setReviewOnly(checked);
              if (checked && selected.severity === "stable" && reviewItems[0]) {
                onSelectedItemNumberChange(reviewItems[0].itemNumber);
              }
            }}
          />
          검토 필요 문항만 이동
        </label>
      </div>

      <div className="diagnosis-navigation">
        <button className="secondary-button" type="button" onClick={() => goTo(selectedVisibleIndex - 1)}>
          ← 이전 문항
        </button>
        <div>
          <span className={`diagnosis-status is-${selected.severity}`}>{selected.label} · {selected.signalCount}/6</span>
          <strong>{selected.itemNumber}번 문항</strong>
          <small>{visibleItems.length ? `${selectedVisibleIndex + 1} / ${visibleItems.length}` : ""}</small>
        </div>
        <button className="secondary-button" type="button" onClick={() => goTo(selectedVisibleIndex + 1)}>
          다음 문항 →
        </button>
      </div>

      <section className="diagnosis-card diagnosis-meta">
        <div><span>평가영역</span><strong>{String(row["평가영역"] ?? "—")}</strong></div>
        <div><span>성취기준</span><strong>{String(selected.question["성취기준"] ?? "—")}</strong></div>
        <div><span>예상 난이도</span><strong>{String(row["난이도"] ?? "—")}</strong></div>
        <div><span>배점·정답</span><strong>{String(row["배점"] ?? "—")}점 · {String(row["정답"] ?? "—")}</strong></div>
      </section>

      <section className={`diagnosis-card diagnosis-conclusion is-${selected.severity}`}>
        <div className="diagnosis-conclusion-heading">
          <div>
            <h3>검토 체크리스트</h3>
            <p>현재 문항은 6개 기준 중 {selected.signalCount}개에 해당합니다.</p>
          </div>
          <strong>{selected.signalCount}/6</strong>
        </div>
        <div className="diagnosis-checklist">
          {selected.checks.map((check) => (
            <div
              key={check.key}
              className={`${check.flagged ? "is-flagged" : ""} ${!check.available ? "is-unavailable" : ""}`}
            >
              <i aria-hidden="true">{!check.available ? "–" : check.flagged ? "!" : "✓"}</i>
              <span>
                <strong>{check.title}</strong>
                <small>{check.detail}</small>
              </span>
            </div>
          ))}
        </div>
        <p>
          이 진단은 통계적 검토 신호입니다. 문항의 교육과정 적합성, 수업 내용,
          발문과 선택지의 실제 표현을 확인한 뒤 최종 판단하세요.
        </p>
      </section>

      <div className="diagnosis-evidence-list">
        <section className="diagnosis-card diagnosis-evidence-card">
          <div className="evidence-heading">
            <span className="evidence-number">1</span>
            <div><h3>낮은 변별도</h3><p>상위 집단과 하위 집단의 정답률 차이를 확인합니다.</p></div>
            {checkBadge("discrimination")}
          </div>
          <div className="evidence-values is-three">
            <div><span>상위 집단 정답률</span><strong>{percent(numeric(row, "상위집단정답률"))}</strong></div>
            <div><span>하위 집단 정답률</span><strong>{percent(numeric(row, "하위집단정답률"))}</strong></div>
            <div><span>변별도</span><strong>{percent(numeric(row, "변별도"))}</strong><small>검토 기준 20%p 미만</small></div>
          </div>
        </section>

        <section className="diagnosis-card diagnosis-evidence-card">
          <div className="evidence-heading">
            <span className="evidence-number">2</span>
            <div><h3>극단적인 정답률</h3><p>매우 어렵거나 지나치게 쉬운 문항인지 확인합니다.</p></div>
            {checkBadge("extreme-rate")}
          </div>
          <div className="evidence-values is-three">
            <div><span>전체 정답률</span><strong>{percent(numeric(row, "정답률"))}</strong></div>
            <div><span>매우 어려움 기준</span><strong>{thresholds.veryHardPercent}% 미만</strong></div>
            <div><span>매우 쉬움 기준</span><strong>{thresholds.veryEasyPercent}% 초과</strong><small>변별도 20%p 미만일 때만 신호</small></div>
          </div>
        </section>

        <section className="diagnosis-card diagnosis-evidence-card">
          <div className="evidence-heading">
            <span className="evidence-number">3</span>
            <div><h3>예상 난이도 불일치</h3><p>문항정보표의 예상과 실제 정답률을 비교합니다.</p></div>
            {checkBadge("difficulty")}
          </div>
          <div className="evidence-values is-four">
            <div><span>예상 난이도</span><strong>{String(selected.difficulty["예상난이도"] ?? row["난이도"] ?? "—")}</strong></div>
            <div><span>기대 정답률 구간</span><strong>{String(selected.difficulty["기대정답률구간"] ?? "—")}</strong></div>
            <div><span>실제 정답률</span><strong>{Number.isFinite(Number(selected.difficulty["실제정답률(%)"])) ? `${Number(selected.difficulty["실제정답률(%)"]).toFixed(1)}%` : "—"}</strong></div>
            <div><span>판정</span><strong>{String(selected.difficulty["판정"] ?? "비교 불가")}</strong></div>
          </div>
        </section>

        <section className="diagnosis-card diagnosis-evidence-card">
          <div className="evidence-heading">
            <span className="evidence-number">4</span>
            <div><h3>큰 학급 간 차이</h3><p>최소 응시자 기준을 충족한 학급만 비교합니다.</p></div>
            {checkBadge("class-gap")}
          </div>
          <div className="evidence-values is-four">
            <div><span>학급 간 최대 차이</span><strong>{percent(selected.maxClassGap)}</strong></div>
            <div><span>최고 학급</span><strong>{selected.highestClass}</strong></div>
            <div><span>최저 학급</span><strong>{selected.lowestClass}</strong></div>
            <div><span>판정 기준</span><strong>{thresholds.classGapPercent}%p 이상</strong><small>학급별 {thresholds.minimumClassSize}명 이상</small></div>
          </div>
          <div className="class-rate-list">
            {selected.classRates.length ? selected.classRates.map((classRate) => (
              <span key={classRate.label}><b>{classRate.label}</b> {percent(classRate.value)} <small>({classRate.count}명)</small></span>
            )) : <p>최소 응시자 기준을 충족한 학급이 없습니다.</p>}
          </div>
        </section>

        <section className="diagnosis-card diagnosis-evidence-card">
          <div className="evidence-heading">
            <span className="evidence-number">5</span>
            <div><h3>성취수준 정답률 역전</h3><p>A~E 수준의 정답률 순서가 자연스러운지 확인합니다.</p></div>
            {checkBadge("level-inversion")}
          </div>
          <div className="level-rate-bars">
            {levelRates.map(({ level, rate, count }) => (
              <div key={level}>
                <strong>{level}</strong>
                <i><b style={{ height: `${Math.max((rate ?? 0) * 100, rate === null ? 0 : 2)}%` }} /></i>
                <span>{percent(rate, 0)} ({count}명)</span>
              </div>
            ))}
          </div>
        </section>

        <section className="diagnosis-card diagnosis-evidence-card">
          <div className="evidence-heading">
            <span className="evidence-number">6</span>
            <div><h3>특정 오답 집중</h3><p>한 오답에 학생 반응이 과도하게 몰렸는지 확인합니다. 정답은 녹색입니다.</p></div>
            {checkBadge("wrong-concentration")}
          </div>
          <div className="response-bars">
            {selected.responseRates.map((response) => (
              <div key={response.label} className={response.correct ? "is-correct" : ""}>
                <span>{response.label === "무표기" ? "무표기" : `${response.label}번`}</span>
                <i><b style={{ width: `${Math.max(response.rate * 100, 1)}%` }} /></i>
                <strong>{percent(response.rate)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <details className="diagnosis-alpha-reference">
        <summary>검사신뢰도 α 참고 정보</summary>
        <div className="alpha-reference-values">
          <div><span>전체 시험 α</span><strong>{alphaText(overallAlpha)}</strong></div>
          <div><span>이 문항 제외 시 α</span><strong>{alphaText(deletedAlpha)}</strong></div>
          <div>
            <span>변화</span>
            <strong>{alphaChange === null ? "—" : `${alphaChange >= 0 ? "+" : ""}${alphaChange.toFixed(3)}`}</strong>
          </div>
        </div>
        <p>
          검사신뢰도 α는 문항들이 학생의 성취를 얼마나 일관되게 측정했는지
          참고하는 통계값입니다. 문항 수가 적거나 여러 평가영역을 함께 평가하는
          교사 제작 시험에서는 낮게 나타날 수 있습니다. 알파가 높다고 좋은 시험이
          보장되는 것도 아니므로, 문항 판정 기준이 아니라 보조 정보로만 활용하세요.
        </p>
      </details>
    </div>
  );
}
