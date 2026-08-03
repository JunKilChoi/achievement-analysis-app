import { useEffect, useState } from "react";
import { AnalysisDashboard } from "./components/AnalysisDashboard";
import { AnswerFilePreviewTable } from "./components/AnswerFilePreviewTable";
import { FileDropZone } from "./components/FileDropZone";
import { Notice } from "./components/Notice";
import { RecognitionSummary } from "./components/RecognitionSummary";
import {
  analysisEngine,
  type AnalysisOutput,
  type AnswerFilePreview,
  type AchievementCuts,
  type EngineStatus,
  type ExamInfo,
  type RecognitionResult,
  type TableRow,
} from "./lib/analysisEngine";

const INITIAL_ENGINE_STATUS: EngineStatus = {
  state: "loading",
  message: "브라우저 분석 엔진을 준비하고 있습니다.",
};

function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([bytes.slice().buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [answerPreviews, setAnswerPreviews] = useState<AnswerFilePreview[]>([]);
  const [failedAnswerPreviews, setFailedAnswerPreviews] = useState<AnswerFilePreview[]>([]);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [engineStatus, setEngineStatus] = useState(INITIAL_ENGINE_STATUS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [output, setOutput] = useState<AnalysisOutput>();
  const [recognition, setRecognition] = useState<RecognitionResult>();
  const [examInfoDraft, setExamInfoDraft] = useState<ExamInfo>();
  const [questionDraft, setQuestionDraft] = useState<TableRow[]>([]);
  const [achievementCuts, setAchievementCuts] = useState<AchievementCuts>({
    A: 90,
    B: 80,
    C: 70,
    D: 60,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = analysisEngine.subscribe(setEngineStatus);
    analysisEngine.initialize().catch(() => undefined);
    return unsubscribe;
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [output, recognition]);

  const canRecognize =
    engineStatus.state === "ready" &&
    questionFiles.length === 1 &&
    answerFiles.length > 0 &&
    !isAnalyzing &&
    !isPreviewing;

  const addAnswerFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    setIsPreviewing(true);
    setDuplicateNames([]);
    try {
      const incoming = await analysisEngine.previewAnswerFiles(selectedFiles);
      const knownSignatures = new Set(answerPreviews.map((item) => item.signature));
      const accepted: AnswerFilePreview[] = [];
      const duplicates: string[] = [];
      for (const preview of incoming) {
        if (knownSignatures.has(preview.signature)) {
          duplicates.push(preview.file.name);
          continue;
        }
        knownSignatures.add(preview.signature);
        if (!preview.error) accepted.push(preview);
      }
      setAnswerPreviews((current) => [...current, ...accepted]);
      setFailedAnswerPreviews(incoming.filter((item) => item.error));
      setDuplicateNames(duplicates);
      setAnswerFiles((current) => [...current, ...accepted.map((item) => item.file)]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setIsPreviewing(false);
    }
  };

  const removeAnswerFile = (index: number) => {
    setAnswerFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setAnswerPreviews((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const clearAnswerFiles = () => {
    setAnswerFiles([]);
    setAnswerPreviews([]);
    setFailedAnswerPreviews([]);
    setDuplicateNames([]);
  };

  const runRecognition = async () => {
    if (!canRecognize) return;
    setIsAnalyzing(true);
    setRecognition(undefined);
    setOutput(undefined);
    setError("");
    setAnalysisStatus("파일을 브라우저 메모리로 옮기고 있습니다.");

    try {
      setAnalysisStatus("평가정보와 문항정보를 인식하고 있습니다.");
      const nextRecognition = await analysisEngine.recognize(
        questionFiles[0],
        answerFiles,
      );
      setRecognition(nextRecognition);
      setQuestionDraft(nextRecognition.questions);
      setExamInfoDraft({
        ...nextRecognition.examInfo,
        과목만점:
          nextRecognition.examInfo.선택형만점 +
          nextRecognition.examInfo.서답형만점,
      });
      const totalFullScore =
        nextRecognition.examInfo.선택형만점 +
        nextRecognition.examInfo.서답형만점;
      setAchievementCuts({
        A: Math.round(totalFullScore * 0.9 * 10) / 10,
        B: Math.round(totalFullScore * 0.8 * 10) / 10,
        C: Math.round(totalFullScore * 0.7 * 10) / 10,
        D: Math.round(totalFullScore * 0.6 * 10) / 10,
      });
      setAnalysisStatus("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
      setAnalysisStatus("파일 인식을 완료하지 못했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runAnalysis = async () => {
    if (!recognition || !examInfoDraft || isAnalyzing) return;
    setIsAnalyzing(true);
    setError("");

    try {
      const nextOutput = await analysisEngine.analyzeWithOverrides(
        questionFiles[0],
        answerFiles,
        examInfoDraft,
        questionDraft,
        achievementCuts,
      );
      setOutput(nextOutput);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="성취분석 홈">
          <span className="brand-mark">成</span>
          <span>
            <strong>성취분석</strong>
            <small>Achievement Insight</small>
          </span>
        </a>
        <div className="privacy-pill">
          <span aria-hidden="true">●</span>
          모든 파일은 이 기기에서만 처리됩니다
        </div>
      </header>

      {output ? (
        <AnalysisDashboard
          output={output}
          onReset={() => {
            setOutput(undefined);
          }}
          onDownloadConfirm={() =>
            downloadBytes(
              output.confirmWorkbook,
              "확인용_분석입력자료.xlsx",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
          }
          onDownloadZip={() =>
            downloadBytes(
              output.analysisZip,
              "성취수준별_평가결과_분석.zip",
              "application/zip",
            )
          }
        />
      ) : recognition && examInfoDraft ? (
        <RecognitionSummary
          result={recognition}
          value={examInfoDraft}
          questions={questionDraft}
          achievementCuts={achievementCuts}
          isAnalyzing={isAnalyzing}
          onChange={setExamInfoDraft}
          onQuestionsChange={setQuestionDraft}
          onAchievementCutsChange={setAchievementCuts}
          onBack={() => {
            setRecognition(undefined);
            setExamInfoDraft(undefined);
            setQuestionDraft([]);
            setError("");
          }}
          onAnalyze={runAnalysis}
        />
      ) : (
      <main>
        <section className="hero">
          <div>
            <p className="hero-kicker">교사를 위한 평가 분석 도구</p>
            <h1>
              평가 결과를 올리면,
              <br />
              <em>수업에 필요한 해석</em>이 보입니다.
            </h1>
            <p className="hero-copy">
              문항정보표와 학생별 정오표를 결합해 성취수준, 문항, 학급,
              평가영역별 결과를 한 번에 분석합니다.
            </p>
          </div>
          <aside className="engine-card" aria-live="polite">
            <span className={`status-light is-${engineStatus.state}`} />
            <div>
              <small>브라우저 분석 엔진</small>
              <strong>{engineStatus.message}</strong>
            </div>
          </aside>
        </section>

        <details className="use-flow">
          <summary>사용 흐름</summary>
          <ol>
            <li>문항정보표와 학생답 정오표를 업로드합니다.</li>
            <li>앱이 문항정보, 정답, 배점, 학생 정오표를 자동 인식합니다.</li>
            <li>인식 결과와 문항정보를 확인·수정하고 성취수준 분할점수를 정합니다.</li>
            <li>다운로드 없이 각 분석 결과를 웹 화면에서 먼저 확인합니다.</li>
            <li>필요한 경우 본인의 OpenAI API 키로 전체·개별·원안지 AI 분석을 실행합니다.</li>
          </ol>
        </details>

        <section className="workflow" aria-label="분석 준비">
          <div className="section-heading">
            <div>
              <p className="section-number">01</p>
              <h2>분석 자료 준비</h2>
            </div>
            <p>두 종류의 파일만 준비하면 됩니다.</p>
          </div>

          <div className="upload-grid">
            <FileDropZone
              accept=".xlsx"
              eyebrow="필수 · 1개"
              title="문항정보표"
              description="문항번호, 배점, 정답, 난이도, 평가영역이 담긴 XLSX 파일"
              files={questionFiles}
              onFilesChange={(files) => {
                setQuestionFiles(files);
                setError("");
              }}
              onClear={() => setQuestionFiles([])}
            />
            <FileDropZone
              accept=".xlsx"
              eyebrow="필수 · 여러 개 가능"
              title="학생답 정오표"
              description="반별로 내려받은 학생 정오표 XLSX 파일을 모두 선택하세요"
              files={answerFiles}
              multiple
              onFilesChange={addAnswerFiles}
              onRemoveFile={removeAnswerFile}
              onClear={clearAnswerFiles}
            />
          </div>

          <AnswerFilePreviewTable
            previews={[...answerPreviews, ...failedAnswerPreviews]}
            duplicateNames={duplicateNames}
            isLoading={isPreviewing}
          />

          <details className="upload-guide">
            <summary>나이스 파일 다운로드 경로와 업로드 주의사항</summary>
            <div className="guide-grid">
              <div>
                <h3>문항정보표</h3>
                <p>
                  나이스 → [교과담임] → [정기시험] → [문항정보표관리] →
                  학년·과목 선택 → [조회] → [출력] → [XLS data]
                </p>
              </div>
              <div>
                <h3>교과목별학생정오표</h3>
                <p>
                  나이스 → [교과담임] → [정기시험조회/통계] →
                  [교과목별학생정오표] → 강의실별 [조회] → [XLS data]
                </p>
              </div>
            </div>
            <p>
              여러 강의실을 담당하는 경우 강의실별 정오표를 각각 저장한 뒤
              한꺼번에 올리거나, 나중에 추가로 올릴 수 있습니다.
            </p>
            <Notice tone="warning" title="주의">
              두 파일 모두 XLS data 버전이어야 합니다. PDF, 화면 출력용 파일,
              임의로 편집한 엑셀 파일은 정상 인식되지 않을 수 있습니다.
            </Notice>
          </details>

          <div className="template-download">
            <div>
              <strong>나이스 문항정보표가 없나요?</strong>
              <p>
                앱 양식에 문항번호, 평가요소, 성취기준, 난이도, 배점, 정답을
                입력한 뒤 같은 문항정보표 칸에 올릴 수 있습니다.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              disabled={engineStatus.state !== "ready"}
              onClick={async () => {
                try {
                  const bytes = await analysisEngine.makeQuestionTemplate();
                  downloadBytes(
                    bytes,
                    "문항정보표_입력양식.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                  );
                } catch (caughtError) {
                  setError(
                    caughtError instanceof Error ? caughtError.message : String(caughtError),
                  );
                }
              }}
            >
              문항정보표 양식 내려받기
            </button>
          </div>

          <div className="action-bar">
            <div>
              <span className="step-check">{questionFiles.length === 1 ? "✓" : "1"}</span>
              문항정보표
              <i />
              <span className="step-check">{answerFiles.length ? "✓" : "2"}</span>
              정오표
              <i />
              <span className="step-check">3</span>
              결과 확인
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={!canRecognize}
              onClick={runRecognition}
            >
              {isAnalyzing ? "인식 중…" : "파일 인식"}
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {analysisStatus ? (
            <p
              className={error ? "error-message" : "analysis-status"}
              aria-live="polite"
            >
              <span
                className={
                  isAnalyzing ? "spinner" : error ? "status-error" : "status-check"
                }
              >
                {isAnalyzing ? "" : error ? "!" : "✓"}
              </span>
              {analysisStatus}
            </p>
          ) : null}
          {!questionFiles.length || !answerFiles.length ? (
            <Notice>
              문항정보표와 학생답 정오표를 모두 올리면 파일 인식을 시작할 수
              있습니다. 정오표는 여러 개를 누적해서 추가할 수 있습니다.
            </Notice>
          ) : null}
        </section>

      </main>
      )}

      <footer>
        <p>서버 업로드 없음 · 학생 개인정보 저장 없음 · 설치 없이 사용</p>
        <span>v0.1 Cloudflare migration</span>
      </footer>
    </div>
  );
}
