import { useEffect, useMemo, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import rehypeKatex from "rehype-katex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
  analysisEngine,
  type AiPresetConfiguration,
  type AnalysisOutput,
} from "../lib/analysisEngine";
import { streamOpenAiResponse } from "../lib/openaiClient";
import { Notice } from "./Notice";

const MODE_DEFAULT = "기본 프롬프트 그대로 사용";
const MODE_FOCUS = "기본 프롬프트 + 추가 의뢰 사용";
const MODE_DIRECT = "직접 작성한 프롬프트만 사용";

function downloadBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes.slice().buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseItemNumbers(raw: string, maxQuestion: number) {
  const values: number[] = [];
  raw
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean)
    .forEach((part) => {
      const range = part.match(/^(\d+)\s*[-~]\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        const low = Math.min(start, end);
        const high = Math.max(start, end);
        for (let value = low; value <= high; value += 1) values.push(value);
      } else if (/^\d+$/.test(part)) {
        values.push(Number(part));
      }
    });
  return Array.from(new Set(values))
    .filter((value) => value >= 1 && value <= maxQuestion)
    .sort((left, right) => left - right);
}

function inferAdvancedScope(preset: string) {
  if (preset === "오답 선택지 설계 분석") return "오답 선택지 분석";
  if (
    preset === "주요 문항 집중 분석" ||
    preset === "학생들이 헷갈렸을 가능성이 큰 문항 분석"
  ) {
    return "주요 문항 집중 분석";
  }
  return "원안지 기반 전체 시험 분석";
}

export function AiAnalysis({ output }: { output: AnalysisOutput }) {
  const [configuration, setConfiguration] = useState<AiPresetConfiguration>();
  const [configurationError, setConfigurationError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [sectionMode, setSectionMode] = useState<"basic" | "advanced">("basic");
  const [basicMode, setBasicMode] = useState<"overall" | "individual">("overall");
  const [anonymize, setAnonymize] = useState(true);
  const [studentKey, setStudentKey] = useState(
    String(output.tables.individual[0]?.["반/번호"] ?? ""),
  );
  const [promptMode, setPromptMode] = useState(MODE_DEFAULT);
  const [preset, setPreset] = useState("직접 입력");
  const [focusRequest, setFocusRequest] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [pdf, setPdf] = useState<File>();
  const [isPdfDragging, setIsPdfDragging] = useState(false);
  const [itemNumberRaw, setItemNumberRaw] = useState("");
  const [basePreview, setBasePreview] = useState("");
  const [finalPrompt, setFinalPrompt] = useState("");
  const [promptError, setPromptError] = useState("");
  const [isPreparingPrompt, setIsPreparingPrompt] = useState(false);
  const [basicResult, setBasicResult] = useState("");
  const [advancedResult, setAdvancedResult] = useState("");
  const [resultContext, setResultContext] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [isBuildingWord, setIsBuildingWord] = useState(false);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    let active = true;
    analysisEngine
      .getAiPresetConfiguration()
      .then((value) => {
        if (active) setConfiguration(value);
      })
      .catch((error) => {
        if (active) {
          setConfigurationError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const presetMap =
    sectionMode === "advanced"
      ? configuration?.advanced
      : basicMode === "individual"
        ? configuration?.basicIndividual
        : configuration?.basicOverall;
  const maxQuestion = Math.max(
    0,
    ...output.tables.questions.map((row) => Number(row["문항번호"]) || 0),
  );
  const itemNumbers = useMemo(
    () => parseItemNumbers(itemNumberRaw, maxQuestion),
    [itemNumberRaw, maxQuestion],
  );
  const advancedScope = inferAdvancedScope(preset);
  const kind =
    sectionMode === "advanced"
      ? "advanced"
      : basicMode === "individual"
        ? "basic-individual"
        : "basic-overall";

  useEffect(() => {
    if (!configuration) return;
    let active = true;
    const timeoutId = window.setTimeout(() => {
      setIsPreparingPrompt(true);
      setPromptError("");
      analysisEngine
        .buildAiPrompt({
          kind,
          promptMode,
          focusRequest,
          customPrompt,
          studentKey,
          anonymize,
          pdfName: pdf?.name ?? "원안지 PDF 미업로드",
          advancedScope,
          itemNumbers,
        })
        .then((result) => {
          if (!active) return;
          setBasePreview(result.basePreview);
          setFinalPrompt(result.finalPrompt);
        })
        .catch((error) => {
          if (active) {
            setPromptError(error instanceof Error ? error.message : String(error));
          }
        })
        .finally(() => {
          if (active) setIsPreparingPrompt(false);
        });
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    configuration,
    kind,
    promptMode,
    focusRequest,
    customPrompt,
    studentKey,
    anonymize,
    pdf,
    advancedScope,
    itemNumbers,
  ]);

  const context = useMemo(
    () =>
      JSON.stringify({
        kind,
        finalPrompt,
        pdf: pdf ? `${pdf.name}-${pdf.size}-${pdf.lastModified}` : "",
      }),
    [kind, finalPrompt, pdf],
  );
  const result = sectionMode === "advanced" ? advancedResult : basicResult;
  const setResult = sectionMode === "advanced" ? setAdvancedResult : setBasicResult;

  const changePreset = (nextPreset: string) => {
    setPreset(nextPreset);
    const text = presetMap?.[nextPreset] ?? "";
    if (promptMode === MODE_DIRECT) setCustomPrompt(text);
    else setFocusRequest(text);
  };

  const acceptPdf = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setRunError("PDF 형식의 원안지만 업로드할 수 있습니다.");
      return;
    }
    setPdf(file);
    setRunError("");
  };

  const runAnalysis = async () => {
    setRunError("");
    if (!apiKey.trim()) {
      setRunError("OpenAI API Key를 입력하세요.");
      return;
    }
    if (!finalPrompt.trim()) {
      setRunError("AI 전달 프롬프트를 준비하지 못했습니다.");
      return;
    }
    if (promptMode === MODE_DIRECT && !customPrompt.trim()) {
      setRunError("직접 작성한 프롬프트만 사용하려면 분석 지시문을 입력하세요.");
      return;
    }
    if (sectionMode === "advanced" && !pdf) {
      setRunError("원안지 PDF를 업로드하세요.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setResult("");
    setResultContext(context);
    try {
      const text = await streamOpenAiResponse({
        apiKey: apiKey.trim(),
        model: model.trim() || "gpt-4o-mini",
        prompt: finalPrompt,
        pdf: sectionMode === "advanced" ? pdf : undefined,
        signal: controller.signal,
        onText: setResult,
      });
      if (text.length < 300) {
        setRunError(
          sectionMode === "advanced"
            ? "AI 응답이 예상보다 짧습니다. PDF 인식, 모델 출력 제한, API 오류와 프롬프트 입력량을 확인해 주세요."
            : "AI 응답이 예상보다 짧습니다. 모델 출력 제한, API 오류와 프롬프트 입력량을 확인해 주세요.",
        );
      }
    } catch (error) {
      if ((error as { name?: string }).name !== "AbortError") {
        setRunError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsRunning(false);
      abortRef.current = undefined;
    }
  };

  const buildWord = async () => {
    if (!result) return;
    setIsBuildingWord(true);
    setRunError("");
    try {
      const isAdvanced = sectionMode === "advanced";
      const bytes = await analysisEngine.makeAiReport({
        title: isAdvanced
          ? "성취수준별 평가결과 원안지 기반 고급 분석 보고서"
          : "성취수준별 평가결과 AI 분석 보고서",
        body: result,
        reportType: isAdvanced
          ? `고급 분석: ${advancedScope}`
          : `기본 분석: ${basicMode === "individual" ? "학생 개별 분석" : "전체 통계 분석"}`,
        focusRequest: promptMode === MODE_DIRECT ? customPrompt : focusRequest,
      });
      downloadBytes(
        bytes,
        isAdvanced
          ? "AI_고급분석_원안지기반심층해석.docx"
          : basicMode === "individual"
            ? "AI_기본분석_학생개별.docx"
            : "AI_기본분석_통계기반해석.docx",
      );
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBuildingWord(false);
    }
  };

  if (configurationError) {
    return <Notice tone="error">{configurationError}</Notice>;
  }
  if (!configuration) {
    return <p className="analysis-status">AI 분석 설정을 준비하고 있습니다.</p>;
  }

  return (
    <div className="ai-analysis">
      <Notice>
        기본 분석은 원안지 없이 통계 자료를 바탕으로 해석하고, 고급 분석은
        원안지 PDF를 OpenAI API에 함께 보내 심층 해석합니다. API Key는 이
        화면의 메모리에만 두며 저장하지 않습니다.
      </Notice>
      <div className="ai-credentials">
        <label>
          <span>OpenAI API Key</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            placeholder="sk-..."
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <label>
          <span>모델</span>
          <input
            type="text"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />
        </label>
      </div>

      <div className="segmented-control" role="radiogroup" aria-label="AI 분석 종류">
        <button
          type="button"
          className={sectionMode === "basic" ? "is-active" : ""}
          onClick={() => {
            setSectionMode("basic");
            setPreset("직접 입력");
            setFocusRequest("");
            setCustomPrompt("");
          }}
        >
          기본 분석: 통계 기반 해석
        </button>
        <button
          type="button"
          className={sectionMode === "advanced" ? "is-active" : ""}
          onClick={() => {
            setSectionMode("advanced");
            setPreset("직접 입력");
            setFocusRequest("");
            setCustomPrompt("");
          }}
        >
          고급 분석: 원안지 기반 심층 해석
        </button>
      </div>

      {sectionMode === "basic" ? (
        <section className="ai-config-card">
          <h3>기본 분석: 통계 기반 해석</h3>
          <p>
            원안지 없이 현재 분석 데이터로 전체 경향, 취약 영역, 문항별 이상
            신호 또는 학생 개별 피드백을 생성합니다.
          </p>
          <div className="segmented-control compact" role="radiogroup" aria-label="기본 분석 유형">
            <button
              type="button"
              className={basicMode === "overall" ? "is-active" : ""}
              onClick={() => {
                setBasicMode("overall");
                setPreset("직접 입력");
                setFocusRequest("");
                setCustomPrompt("");
              }}
            >
              전체 통계 분석
            </button>
            <button
              type="button"
              className={basicMode === "individual" ? "is-active" : ""}
              onClick={() => {
                setBasicMode("individual");
                setPreset("직접 입력");
                setFocusRequest("");
                setCustomPrompt("");
              }}
            >
              학생 개별 분석
            </button>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={anonymize}
              onChange={(event) => setAnonymize(event.target.checked)}
            />
            학생 개별 분석에서 이름을 API로 보내지 않기
          </label>
          {basicMode === "individual" ? (
            <label className="ai-field">
              <span>AI 분석 대상 학생</span>
              <select value={studentKey} onChange={(event) => setStudentKey(event.target.value)}>
                {output.tables.individual.map((row) => (
                  <option key={String(row["반/번호"])} value={String(row["반/번호"])}>
                    {row["반/번호"]} · {row["이름"]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>
      ) : (
        <section className="ai-config-card">
          <h3>고급 분석: 원안지 기반 심층 해석</h3>
          <p>
            원안지 PDF의 문항 내용과 앱의 통계 결과를 연결해 발문, 자료,
            선택지, 정답 근거와 요구 사고 과정을 분석합니다.
            전체·문항 분석에는 학생별 원자료가 아닌 익명 집계 통계만 API로 전송됩니다.
          </p>
          <label
            className={`pdf-drop ${pdf ? "has-file" : ""} ${
              isPdfDragging ? "is-dragging" : ""
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsPdfDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setIsPdfDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setIsPdfDragging(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsPdfDragging(false);
              acceptPdf(event.dataTransfer.files?.[0]);
            }}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => acceptPdf(event.target.files?.[0])}
            />
            <span>{pdf ? pdf.name : "원안지 PDF를 여기에 놓거나 선택하세요"}</span>
          </label>
          {pdf ? (
            <button className="text-button" type="button" onClick={() => setPdf(undefined)}>
              원안지 PDF 초기화
            </button>
          ) : (
            <Notice>원안지 PDF를 업로드하면 고급 분석을 실행할 수 있습니다.</Notice>
          )}
        </section>
      )}

      <section className="ai-config-card">
        <h3>프롬프트 사용 방식</h3>
        <Notice>{configuration.promptModeHelp}</Notice>
        <div className="prompt-mode-grid" role="radiogroup">
          {configuration.promptModes.map((mode) => (
            <button
              type="button"
              key={mode}
              className={promptMode === mode ? "is-active" : ""}
              onClick={() => {
                setPromptMode(mode);
                setPreset("직접 입력");
                setFocusRequest("");
                setCustomPrompt("");
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {promptMode !== MODE_DEFAULT ? (
          <>
            <label className="ai-field">
              <span>중점 분석 요청 프리셋</span>
              <select value={preset} onChange={(event) => changePreset(event.target.value)}>
                {Object.keys(presetMap ?? {}).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="ai-field">
              <span>
                {promptMode === MODE_DIRECT
                  ? "AI에게 직접 전달할 분석 지시문"
                  : "중점적으로 분석을 의뢰할 부분"}
              </span>
              <textarea
                rows={6}
                value={promptMode === MODE_DIRECT ? customPrompt : focusRequest}
                onChange={(event) =>
                  promptMode === MODE_DIRECT
                    ? setCustomPrompt(event.target.value)
                    : setFocusRequest(event.target.value)
                }
                placeholder={
                  promptMode === MODE_DIRECT
                    ? "원하는 분석 구조와 범위를 직접 작성하세요."
                    : "비워두면 기본 프롬프트만 사용합니다."
                }
              />
            </label>
          </>
        ) : (
          <p className="section-description">
            웹앱 기본 프롬프트만 사용합니다. 추가 의뢰나 직접 작성
            프롬프트는 붙지 않습니다.
          </p>
        )}

        {sectionMode === "advanced" ? (
          <label className="ai-field">
            <span>분석할 문항번호</span>
            <input
              type="text"
              value={itemNumberRaw}
              placeholder="예: 3, 7, 12 또는 3-7"
              onChange={(event) => setItemNumberRaw(event.target.value)}
            />
            <small>
              {itemNumberRaw.trim() && !itemNumbers.length
                ? "입력한 문항번호를 인식하지 못했습니다."
                : itemNumbers.length
                  ? `선택 문항: ${itemNumbers.map((value) => `${value}번`).join(", ")}`
                  : "비워두면 통계 결과를 기준으로 AI가 우선 분석 문항을 선정합니다."}
            </small>
          </label>
        ) : null}

        <details className="prompt-preview">
          <summary>웹앱 기본 프롬프트 보기</summary>
          <textarea readOnly rows={18} value={basePreview} />
        </details>
        <details className="prompt-preview">
          <summary>최종 AI 전달 프롬프트 확인</summary>
          <textarea readOnly rows={20} value={finalPrompt} />
        </details>
        {isPreparingPrompt ? (
          <p className="analysis-status">프롬프트를 갱신하고 있습니다.</p>
        ) : null}
        {promptError ? <Notice tone="error">{promptError}</Notice> : null}
      </section>

      <section className="ai-result-card">
        <div className="ai-run-actions">
          <button
            className="primary-button"
            type="button"
            disabled={isRunning || isPreparingPrompt || (sectionMode === "advanced" && !pdf)}
            onClick={runAnalysis}
          >
            {isRunning
              ? "분석 중…"
              : sectionMode === "advanced"
                ? "고급 분석 실행"
                : "기본 분석 실행"}
          </button>
          {isRunning ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => abortRef.current?.abort()}
            >
              생성 중지
            </button>
          ) : null}
        </div>
        {runError ? <Notice tone="error">{runError}</Notice> : null}
        {result ? (
          <>
            <h3>
              {resultContext === context ? "AI 분석 결과" : "이전 설정의 저장된 AI 분석 결과"}
            </h3>
            <p className="section-description">
              분석 결과가 생성되는 대로 아래에 실시간으로 표시됩니다.
            </p>
            <div className="ai-result-text">
              <ReactMarkdown
                remarkPlugins={[remarkMath, [remarkGfm, { singleTilde: false }]]}
                rehypePlugins={[rehypeKatex]}
              >
                {result}
              </ReactMarkdown>
            </div>
            <button
              className="secondary-button"
              type="button"
              disabled={isBuildingWord}
              onClick={buildWord}
            >
              {isBuildingWord ? "Word 보고서 만드는 중…" : "AI 분석 Word 보고서 만들기"}
            </button>
          </>
        ) : null}
      </section>
    </div>
  );
}
