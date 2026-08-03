import type {
  AchievementCuts,
  ExamInfo,
  RecognitionResult,
  TableRow,
} from "../lib/analysisEngine";
import { QuestionEditor } from "./QuestionEditor";
import { Notice } from "./Notice";
import { QuestionSummary } from "./QuestionSummary";

interface RecognitionSummaryProps {
  result: RecognitionResult;
  value: ExamInfo;
  questions: TableRow[];
  achievementCuts: AchievementCuts;
  isAnalyzing: boolean;
  onChange(value: ExamInfo): void;
  onQuestionsChange(rows: TableRow[]): void;
  onAchievementCutsChange(value: AchievementCuts): void;
  onBack(): void;
  onAnalyze(): void;
}

const TEXT_FIELDS: Array<{ key: keyof ExamInfo; label: string }> = [
  { key: "학년도", label: "학년도" },
  { key: "학년", label: "학년" },
  { key: "학기", label: "학기" },
  { key: "평가구분", label: "평가구분" },
  { key: "교과목", label: "교과목" },
];

const NUMBER_FIELDS: Array<{ key: keyof ExamInfo; label: string; step?: number }> = [
  { key: "선택형문항수", label: "선택형 문항 수" },
  { key: "서답형문항수", label: "서답형 문항 수" },
  { key: "학생수", label: "학생 수" },
  { key: "선택형만점", label: "선택형 만점", step: 0.5 },
  { key: "서답형만점", label: "서답형 만점", step: 0.5 },
];

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="recognition-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function RecognitionSummary({
  result,
  value,
  questions,
  achievementCuts,
  isAnalyzing,
  onChange,
  onQuestionsChange,
  onAchievementCutsChange,
  onBack,
  onAnalyze,
}: RecognitionSummaryProps) {
  const cutsAreValid =
    achievementCuts.A > achievementCuts.B &&
    achievementCuts.B > achievementCuts.C &&
    achievementCuts.C > achievementCuts.D;
  const updateText = (key: keyof ExamInfo, nextValue: string) => {
    onChange({ ...value, [key]: nextValue });
  };
  const updateNumber = (key: keyof ExamInfo, nextValue: string) => {
    const numericValue = Math.max(0, Number(nextValue) || 0);
    const next = { ...value, [key]: numericValue };
    if (key === "선택형만점" || key === "서답형만점") {
      next.과목만점 = next.선택형만점 + next.서답형만점;
    }
    onChange(next);
  };

  return (
    <main className="recognition-page">
      <section className="step-banner">
        <span>1</span>
        <div>
          <h1>자동 인식 결과</h1>
          <p>
            업로드한 문항정보표와 학생답 정오표에서 인식한 평가 정보를
            확인하고, 필요한 값은 아래에서 수정합니다.
          </p>
        </div>
        <small>{result.elapsedSeconds.toFixed(1)}초</small>
      </section>

      <section className="recognition-card">
        <div className="recognition-metrics identity-row">
          <Metric
            label="학년/학기"
            value={`${value.학년 || "—"}/${value.학기 || "—"}`}
          />
          <Metric label="교과목" value={value.교과목 || "—"} />
          <Metric label="학생 수" value={value.학생수} />
          <Metric label="정오표 파일 수" value={value.정오표파일수} />
        </div>
        <div className="recognition-metrics question-row">
          <Metric label="선택형 문항 수" value={value.선택형문항수} />
          <Metric label="서답형 문항 수" value={value.서답형문항수} />
        </div>
        <div className="recognition-metrics score-row">
          <Metric label="선택형 만점" value={value.선택형만점.toFixed(1)} />
          <Metric label="서답형 만점" value={value.서답형만점.toFixed(1)} />
          <Metric label="과목 만점" value={value.과목만점.toFixed(1)} />
        </div>
      </section>

      <details className="recognition-editor">
        <summary>평가정보 자동 인식값 수정</summary>
        <p>
          수정한 값은 아래 분석 결과와 AI 분석에 반영됩니다. 정오표 파일
          수는 업로드한 파일을 기준으로 고정되며, 과목 만점은 선택형 만점과
          서답형 만점의 합으로 자동 계산됩니다.
        </p>
        <div className="recognition-form">
          {TEXT_FIELDS.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                type="text"
                value={String(value[field.key])}
                onChange={(event) => updateText(field.key, event.target.value)}
              />
            </label>
          ))}
          {NUMBER_FIELDS.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                type="number"
                min="0"
                step={field.step ?? 1}
                value={Number(value[field.key])}
                onChange={(event) => updateNumber(field.key, event.target.value)}
              />
            </label>
          ))}
        </div>
        <button
          className="text-button"
          type="button"
          onClick={() =>
            onChange({
              ...result.examInfo,
              과목만점:
                result.examInfo.선택형만점 + result.examInfo.서답형만점,
            })
          }
        >
          원본 인식값으로 되돌리기
        </button>
      </details>

      <section className="recognized-question-card">
        <div className="panel-heading">
          <div>
            <p className="section-number">02</p>
            <h2>문항정보 수정</h2>
          </div>
          <p>
            자동 인식한 평가요소, 성취기준, 난이도, 배점과 정답을 실제
            문항에 맞게 확인·수정합니다.
          </p>
        </div>
        <Notice>
          가로 입력칸에서 수정한 평가요소, 성취기준, 난이도, 배점, 정답은
          아래 분석과 AI 분석에 반영됩니다. 문항정보표 형식에 따라
          평가요소나 성취기준이 다음 페이지로 넘어가 일부만 인식될 수
          있으므로, 빠지거나 잘린 내용이 없는지 꼼꼼히 확인해 주세요.
        </Notice>
        <Notice tone="warning" title="평가요소를 구체적으로 확인해 주세요">
          평가요소는 평가영역별 분석과 AI 분석의 핵심 기준입니다. 단원명이나
          큰 주제만 적혀 있다면 문항이 실제로 평가하는 개념, 사고 과정, 자료
          해석 능력, 적용 상황이 드러나도록 보완하세요. 평가요소가
          구체적일수록 정답률, 오답 경향과 성취수준별 차이를 더 의미 있게
          해석할 수 있습니다.
        </Notice>
        <p className="editor-caption">
          누락된 문항은 ‘+ 문항 추가’를 사용하고, 삭제할 문항은 오른쪽 삭제
          칸을 선택한 뒤 ‘선택 문항 삭제’를 누르세요.
        </p>
        <QuestionEditor
          rows={questions}
          onChange={onQuestionsChange}
          onReset={() => onQuestionsChange(result.questions)}
        />
        <QuestionSummary rows={questions} />
      </section>

      <section className="analysis-settings-card">
        <div className="panel-heading">
          <div>
            <p className="section-number">03</p>
            <h2>분석 기준 및 결과 확인</h2>
          </div>
          <p>
            성취수준 분할점수를 확인한 뒤 분석을 실행합니다. 기본값은 과목
            만점의 90%, 80%, 70%, 60%입니다.
          </p>
        </div>
        <p className="editor-caption">
          선택형 만점과 서답형 만점은 위 ‘평가정보 자동 인식값 수정’에서
          조정할 수 있으며, 과목 만점은 두 값의 합으로 계산됩니다.
        </p>
        <div className="cut-grid">
          {(
            [
              ["A", "A/B 분할점수"],
              ["B", "B/C 분할점수"],
              ["C", "C/D 분할점수"],
              ["D", "D/E 분할점수"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="number"
                min="0"
                max={value.과목만점}
                step="1"
                value={achievementCuts[key]}
                onChange={(event) =>
                  onAchievementCutsChange({
                    ...achievementCuts,
                    [key]: Math.max(0, Number(event.target.value) || 0),
                  })
                }
              />
            </label>
          ))}
        </div>
        <button
          className="text-button"
          type="button"
          onClick={() =>
            onAchievementCutsChange({
              A: Math.round(value.과목만점 * 0.9 * 10) / 10,
              B: Math.round(value.과목만점 * 0.8 * 10) / 10,
              C: Math.round(value.과목만점 * 0.7 * 10) / 10,
              D: Math.round(value.과목만점 * 0.6 * 10) / 10,
            })
          }
        >
          90% · 80% · 70% · 60% 기본값 적용
        </button>
        {!cutsAreValid ? (
          <Notice tone="warning">
            분할점수는 A/B &gt; B/C &gt; C/D &gt; D/E 순서여야 합니다.
            현재 값을 다시 확인해 주세요.
          </Notice>
        ) : null}
      </section>

      <div className="recognition-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          파일 다시 선택
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={isAnalyzing || !cutsAreValid || questions.length === 0}
          onClick={onAnalyze}
        >
          {isAnalyzing ? "분석 중…" : "분석 결과 보기"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </main>
  );
}
