const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/";
const PYODIDE_SCRIPT = `${PYODIDE_INDEX}pyodide.js`;

type EngineState = "loading" | "ready" | "error";

export interface EngineStatus {
  state: EngineState;
  message: string;
}

export interface AnalysisSummary {
  questionCount: number;
  studentCount: number;
  answerFileCount: number;
  totalFullScore: number;
  validationWarningCount: number;
  reliabilityAlpha: number | null;
  levelCounts: Record<"A" | "B" | "C" | "D" | "E", number>;
}

export interface AnalysisOutput {
  summary: AnalysisSummary;
  examInfo: ExamInfo;
  tables: AnalysisTables;
  confirmWorkbook: Uint8Array;
  analysisWorkbook: Uint8Array;
  elapsedSeconds: number;
}

export interface AchievementCuts {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface AnswerFilePreview {
  file: File;
  signature: string;
  size: number;
  studentCount: number;
  questionCount: number;
  classes: number[];
  error?: string;
}

export interface AiPresetConfiguration {
  promptModes: string[];
  promptModeHelp: string;
  basicOverall: Record<string, string>;
  basicIndividual: Record<string, string>;
  advanced: Record<string, string>;
}

export interface AiPromptRequest {
  kind: "basic-overall" | "basic-individual" | "advanced";
  promptMode: string;
  focusRequest?: string;
  customPrompt?: string;
  studentKey?: string;
  pdfName?: string;
  advancedScope?: string;
  itemNumbers?: number[];
}

export interface AiPromptResult {
  basePreview: string;
  finalPrompt: string;
}

export interface ExamInfo {
  학년도: string;
  학년: string;
  학기: string;
  평가구분: string;
  교과목: string;
  선택형문항수: number;
  서답형문항수: number;
  학생수: number;
  정오표파일수: number;
  선택형만점: number;
  서답형만점: number;
  과목만점: number;
}

export interface RecognitionResult {
  examInfo: ExamInfo;
  questions: TableRow[];
  validation: TableRow[];
  elapsedSeconds: number;
}

export type TableRow = Record<string, string | number | boolean | null>;

export interface AnalysisTables {
  questions: TableRow[];
  rawStudents: TableRow[];
  students: TableRow[];
  validation: TableRow[];
  achievement: TableRow[];
  classAchievement: TableRow[];
  item: TableRow[];
  difficultyGap: TableRow[];
  classItem: TableRow[];
  classItemPivot: TableRow[];
  domain: TableRow[];
  domainScores: TableRow[];
  standard: TableRow[];
  standardScores: TableRow[];
  levelItem: TableRow[];
  individual: TableRow[];
  long: TableRow[];
}

interface PyodideRuntime {
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
  };
  globals: {
    set(name: string, value: unknown): void;
  };
  loadPackage(packages: string[]): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
  }
}

const INITIAL_STATUS: EngineStatus = {
  state: "loading",
  message: "분석 기능을 준비하고 있습니다.",
};

class AnalysisEngine {
  private runtime?: PyodideRuntime;
  private initialization?: Promise<void>;
  private status = INITIAL_STATUS;
  private listeners = new Set<(status: EngineStatus) => void>();

  subscribe(listener: (status: EngineStatus) => void) {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  initialize() {
    if (!this.initialization) {
      this.initialization = this.initializeOnce();
    }
    return this.initialization;
  }

  async analyze(questionFile: File, answerFiles: File[]): Promise<AnalysisOutput> {
    return this.analyzeWithOverrides(questionFile, answerFiles, undefined);
  }

  async previewAnswerFiles(files: File[]): Promise<AnswerFilePreview[]> {
    await this.initialize();
    if (!this.runtime) {
      throw new Error("분석 엔진이 준비되지 않았습니다.");
    }

    const previews: AnswerFilePreview[] = [];
    for (const [index, file] of files.entries()) {
      const targetName = `preview-${index + 1}.xlsx`;
      await this.writeFile(file, targetName);
      const signature = await digestFile(file);
      try {
        this.runtime.globals.set("PREVIEW_TARGET_NAME", targetName);
        const result = await this.runtime.runPythonAsync(`
import json
from pathlib import Path

preview = APP_NAMESPACE["preview_answer_file"](
    Path("/tmp/" + PREVIEW_TARGET_NAME).read_bytes()
)
json.dumps({
    "studentCount": int(preview["student_count"]),
    "questionCount": int(preview["question_count"]),
    "classes": [int(value) for value in preview["classes"]],
}, ensure_ascii=False)
`);
        previews.push({
          file,
          signature,
          size: file.size,
          ...(JSON.parse(String(result)) as Pick<
            AnswerFilePreview,
            "studentCount" | "questionCount" | "classes"
          >),
        });
      } catch (error) {
        previews.push({
          file,
          signature,
          size: file.size,
          studentCount: 0,
          questionCount: 0,
          classes: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return previews;
  }

  async makeQuestionTemplate(): Promise<Uint8Array> {
    await this.initialize();
    if (!this.runtime) {
      throw new Error("분석 엔진이 준비되지 않았습니다.");
    }
    await this.runtime.runPythonAsync(`
from pathlib import Path
Path("/tmp/question-template.xlsx").write_bytes(
    APP_NAMESPACE["make_question_info_template_xlsx"]()
)
`);
    return this.runtime.FS.readFile("/tmp/question-template.xlsx");
  }

  async getAiPresetConfiguration(): Promise<AiPresetConfiguration> {
    await this.initialize();
    if (!this.runtime) {
      throw new Error("분석 엔진이 준비되지 않았습니다.");
    }
    const result = await this.runtime.runPythonAsync(`
import json
json.dumps({
    "promptModes": APP_NAMESPACE["PROMPT_MODE_OPTIONS"],
    "promptModeHelp": APP_NAMESPACE["PROMPT_MODE_HELP"],
    "basicOverall": APP_NAMESPACE["BASIC_OVERALL_FOCUS_PRESETS"],
    "basicIndividual": APP_NAMESPACE["BASIC_INDIVIDUAL_FOCUS_PRESETS"],
    "advanced": APP_NAMESPACE["ADVANCED_FOCUS_PRESETS"],
}, ensure_ascii=False)
`);
    return JSON.parse(String(result)) as AiPresetConfiguration;
  }

  async buildAiPrompt(request: AiPromptRequest): Promise<AiPromptResult> {
    await this.initialize();
    if (!this.runtime) {
      throw new Error("분석 엔진이 준비되지 않았습니다.");
    }
    this.runtime.globals.set("AI_PROMPT_REQUEST_JSON", JSON.stringify(request));
    const result = await this.runtime.runPythonAsync(`
import json

request = json.loads(AI_PROMPT_REQUEST_JSON)
kind = request["kind"]
if kind == "basic-individual":
    base_prompt = APP_NAMESPACE["build_individual_ai_prompt"](
        parsed,
        analysis,
        request.get("studentKey", ""),
    )
    label = "기본 분석: 학생 개별 분석"
elif kind == "advanced":
    base_prompt = APP_NAMESPACE["build_advanced_exam_ai_prompt"](
        parsed,
        analysis,
        pdf_name=request.get("pdfName", "원안지 PDF"),
        scope=request.get("advancedScope", "원안지 기반 전체 시험 분석"),
        item_numbers=request.get("itemNumbers", []),
        student_key=(
            request.get("studentKey")
            if request.get("advancedScope") == "원안지 기반 학생 개별 분석"
            else None
        ),
    )
    label = "고급 분석: " + request.get("advancedScope", "원안지 기반 전체 시험 분석")
else:
    base_prompt = APP_NAMESPACE["build_basic_statistics_ai_prompt"](parsed, analysis)
    label = "기본 분석: 전체 통계 분석"

final_prompt = APP_NAMESPACE["compose_ai_prompt_by_mode"](
    base_prompt,
    request.get("promptMode", APP_NAMESPACE["PROMPT_MODE_DEFAULT"]),
    focus_request=request.get("focusRequest", ""),
    custom_prompt=request.get("customPrompt", ""),
    analysis_label=label,
)
json.dumps({
    "basePreview": APP_NAMESPACE["extract_prompt_instruction_preview"](base_prompt),
    "finalPrompt": final_prompt,
}, ensure_ascii=False)
`);
    return JSON.parse(String(result)) as AiPromptResult;
  }

  async makeAiReport(options: {
    title: string;
    body: string;
    reportType: string;
    focusRequest?: string;
  }): Promise<Uint8Array> {
    await this.initialize();
    if (!this.runtime) {
      throw new Error("분석 엔진이 준비되지 않았습니다.");
    }
    this.setStatus({
      state: "loading",
      message: "Word 보고서와 수식 이미지 도구를 준비하고 있습니다.",
    });
    try {
      // make_ai_report_docx renders LaTeX with matplotlib MathText and inserts
      // the resulting transparent PNG via python-docx.  Loading only lxml made
      // the Python renderer silently fall back to raw $...$ text in Word.
      await this.runtime.loadPackage(["lxml", "matplotlib"]);
      await this.runtime.runPythonAsync(`
import micropip
await micropip.install("python-docx")

# Fail before document generation if the image renderer is unavailable instead
# of allowing make_ai_report_docx to replace every equation with raw LaTeX.
from matplotlib.mathtext import math_to_image
from PIL import Image
`);
      this.runtime.globals.set("AI_REPORT_OPTIONS_JSON", JSON.stringify(options));
      await this.runtime.runPythonAsync(`
import json
from pathlib import Path

options = json.loads(AI_REPORT_OPTIONS_JSON)
Path("/tmp/ai-report.docx").write_bytes(
    APP_NAMESPACE["make_ai_report_docx"](
        parsed,
        analysis,
        options["title"],
        options["body"],
        report_type=options["reportType"],
        focus_request=options.get("focusRequest", ""),
    )
)
`);
      return this.runtime.FS.readFile("/tmp/ai-report.docx");
    } finally {
      this.setStatus({
        state: "ready",
        message: "평가 파일을 선택해 주세요.",
      });
    }
  }

  async recognize(
    questionFile: File,
    answerFiles: File[],
  ): Promise<RecognitionResult> {
    await this.initialize();
    if (!this.runtime) {
      throw new Error("분석 엔진이 준비되지 않았습니다.");
    }

    const startedAt = performance.now();
    await this.prepareInputFiles(questionFile, answerFiles);
    const result = await this.runtime.runPythonAsync(`
import io
import json
from pathlib import Path

question_bytes = Path("/tmp/question.xlsx").read_bytes()
question_file = io.BytesIO(question_bytes)
question_file.name = "문항정보표.xlsx"

answer_items = []
for item in ANSWER_FILE_METADATA.to_py():
    answer_items.append({
        "name": item["originalName"],
        "data": Path("/tmp/" + item["targetName"]).read_bytes(),
    })

parsed = APP_NAMESPACE["prepare_parsed"](question_file, answer_items)
selected_full = float(
    parsed.exam_info.get("선택형만점")
    or parsed.question_df["배점"].fillna(0).sum()
)
written_full = float(parsed.exam_info.get("서답형만점") or 0)
total_full = float(
    parsed.exam_info.get("과목만점")
    or selected_full + written_full
    or 100
)

def value(key, fallback):
    raw = parsed.exam_info.get(key, fallback)
    return fallback if raw is None else raw

def records(frame):
    return json.loads(frame.to_json(orient="records", force_ascii=False))

json.dumps({
    "examInfo": {
        "학년도": str(value("학년도", "")),
        "학년": str(value("학년", "")),
        "학기": str(value("학기", "")),
        "평가구분": str(value("평가구분", "")),
        "교과목": str(value("교과목", "")),
        "선택형문항수": int(value("선택형문항수", len(parsed.question_df))),
        "서답형문항수": int(value("서답형문항수", 0)),
        "학생수": int(value("학생수", len(parsed.students_df))),
        "정오표파일수": int(value("정오표파일수", len(answer_items))),
        "선택형만점": selected_full,
        "서답형만점": written_full,
        "과목만점": total_full,
    },
    "questions": records(parsed.question_df),
    "validation": records(parsed.validation_df),
}, ensure_ascii=False)
`);
    const parsedResult = JSON.parse(String(result)) as Omit<
      RecognitionResult,
      "elapsedSeconds"
    >;
    return {
      ...parsedResult,
      elapsedSeconds: (performance.now() - startedAt) / 1000,
    };
  }

  async analyzeWithOverrides(
    questionFile: File,
    answerFiles: File[],
    examInfoOverrides?: ExamInfo,
    questionOverrides?: TableRow[],
    achievementCuts?: AchievementCuts,
  ): Promise<AnalysisOutput> {
    await this.initialize();
    if (!this.runtime) {
      throw new Error("분석 엔진이 준비되지 않았습니다.");
    }

    const startedAt = performance.now();
    await this.prepareInputFiles(questionFile, answerFiles);
    this.runtime.globals.set(
      "EXAM_INFO_OVERRIDES_JSON",
      JSON.stringify(examInfoOverrides ?? {}),
    );
    this.runtime.globals.set(
      "QUESTION_OVERRIDES_JSON",
      JSON.stringify(questionOverrides ?? []),
    );
    this.runtime.globals.set(
      "ACHIEVEMENT_CUTS_JSON",
      JSON.stringify(achievementCuts ?? {}),
    );

    const result = await this.runtime.runPythonAsync(`
import io
import json
from pathlib import Path
import pandas as pd

question_bytes = Path("/tmp/question.xlsx").read_bytes()
question_file = io.BytesIO(question_bytes)
question_file.name = "문항정보표.xlsx"

answer_items = []
for item in ANSWER_FILE_METADATA.to_py():
    answer_items.append({
        "name": item["originalName"],
        "data": Path("/tmp/" + item["targetName"]).read_bytes(),
    })

parsed = APP_NAMESPACE["prepare_parsed"](question_file, answer_items)
exam_info_overrides = json.loads(EXAM_INFO_OVERRIDES_JSON)
parsed.exam_info.update(exam_info_overrides)
question_overrides = json.loads(QUESTION_OVERRIDES_JSON)
if question_overrides:
    edited_questions = pd.DataFrame(question_overrides)
    preferred_columns = ["문항번호", "평가영역", "성취기준", "난이도", "배점", "정답"]
    for column in preferred_columns:
        if column not in edited_questions.columns:
            edited_questions[column] = 0 if column in ["문항번호", "배점"] else ""
    edited_questions["문항번호"] = (
        pd.to_numeric(edited_questions["문항번호"], errors="coerce")
        .fillna(0)
        .astype(int)
    )
    edited_questions["배점"] = (
        pd.to_numeric(edited_questions["배점"], errors="coerce")
        .fillna(0.0)
        .astype(float)
    )
    for column in ["평가영역", "성취기준", "난이도", "정답"]:
        edited_questions[column] = edited_questions[column].fillna("").astype(str)
    edited_questions = (
        edited_questions[edited_questions["문항번호"] > 0]
        .drop_duplicates(subset=["문항번호"], keep="last")
        .sort_values("문항번호")
        .reset_index(drop=True)
    )
    cross_file_validation = parsed.validation_df[
        parsed.validation_df["검증결과"] == "정오표 파일 간 확인 필요"
    ].copy()
    parsed.question_df = edited_questions
    parsed.validation_df = APP_NAMESPACE["make_validation"](
        parsed.question_df,
        parsed.answer_key_df,
    )
    if not cross_file_validation.empty:
        parsed.validation_df = pd.concat(
            [parsed.validation_df, cross_file_validation],
            ignore_index=True,
        )
    parsed.long_df = APP_NAMESPACE["build_long_data"](
        parsed.question_df,
        parsed.students_df,
    )
selected_full = float(
    parsed.exam_info.get("선택형만점")
    or parsed.question_df["배점"].fillna(0).sum()
)
written_full = float(parsed.exam_info.get("서답형만점") or 0)
total_full = float(
    parsed.exam_info.get("과목만점")
    or selected_full + written_full
    or 100
)
cut_overrides = json.loads(ACHIEVEMENT_CUTS_JSON)
cuts = cut_overrides or {
    "A": round(total_full * 0.9, 1),
    "B": round(total_full * 0.8, 1),
    "C": round(total_full * 0.7, 1),
    "D": round(total_full * 0.6, 1),
}
analysis = APP_NAMESPACE["analyze_all"](parsed, total_full, cuts)

Path("/tmp/confirm.xlsx").write_bytes(
    APP_NAMESPACE["make_confirm_excel"](parsed, analysis)
)
Path("/tmp/analysis.xlsx").write_bytes(
    APP_NAMESPACE["make_analysis_excel"](parsed, analysis)
)

warning_count = (
    int((parsed.validation_df["검증결과"] == "확인 필요").sum())
    if not parsed.validation_df.empty
    else 0
)
level_counts = (
    analysis["students"]["성취수준"]
    .value_counts()
    .reindex(list("ABCDE"), fill_value=0)
)
def records(frame):
    return json.loads(frame.to_json(orient="records", force_ascii=False))

json.dumps({
    "examInfo": exam_info_overrides,
    "summary": {
        "questionCount": int(len(parsed.question_df)),
        "studentCount": int(len(parsed.students_df)),
        "answerFileCount": len(answer_items),
        "totalFullScore": total_full,
        "validationWarningCount": warning_count,
        "reliabilityAlpha": (
            float(analysis["alpha"])
            if analysis["alpha"] is not None
            else None
        ),
        "levelCounts": {
            str(level): int(count)
            for level, count in level_counts.items()
        },
    },
    "tables": {
        "questions": records(parsed.question_df),
        "rawStudents": records(parsed.students_df),
        "students": records(analysis["students"]),
        "validation": records(parsed.validation_df),
        "achievement": records(analysis["achievement"]),
        "classAchievement": records(analysis["class_achievement"]),
        "item": records(analysis["item"]),
        "difficultyGap": records(analysis["difficulty_gap"]),
        "classItem": records(analysis["class_item"]),
        "classItemPivot": records(analysis["class_item_pivot"]),
        "domain": records(analysis["domain"]),
        "domainScores": records(analysis["domain_scores"]),
        "standard": records(analysis["standard"]),
        "standardScores": records(analysis["standard_scores"]),
        "levelItem": records(analysis["level_item"]),
        "individual": records(analysis["individual"]),
        "long": records(analysis["long"]),
    },
}, ensure_ascii=False)
`);

    const parsedResult = JSON.parse(String(result)) as {
      examInfo: ExamInfo;
      summary: AnalysisSummary;
      tables: AnalysisTables;
    };
    return {
      examInfo: parsedResult.examInfo,
      summary: parsedResult.summary,
      tables: parsedResult.tables,
      confirmWorkbook: this.runtime.FS.readFile("/tmp/confirm.xlsx"),
      analysisWorkbook: this.runtime.FS.readFile("/tmp/analysis.xlsx"),
      elapsedSeconds: (performance.now() - startedAt) / 1000,
    };
  }

  private async prepareInputFiles(questionFile: File, answerFiles: File[]) {
    await this.writeFile(questionFile, "question.xlsx");
    const answerMetadata: Array<{
      targetName: string;
      originalName: string;
    }> = [];
    for (const [index, file] of answerFiles.entries()) {
      const targetName = `answer-${index + 1}.xlsx`;
      await this.writeFile(file, targetName);
      answerMetadata.push({ targetName, originalName: file.name });
    }
    this.runtime!.globals.set("ANSWER_FILE_METADATA", answerMetadata);
  }

  private setStatus(status: EngineStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  private async initializeOnce() {
    try {
      await this.loadScript();
      if (!window.loadPyodide) {
        throw new Error("Pyodide를 불러오지 못했습니다.");
      }

      this.runtime = await window.loadPyodide({ indexURL: PYODIDE_INDEX });
      this.setStatus({
        state: "loading",
        message: "분석 기능을 준비하고 있습니다.",
      });
      await this.runtime.loadPackage(["micropip", "numpy", "pandas"]);
      await this.runtime.runPythonAsync(`
import micropip
await micropip.install(["openpyxl", "xlsxwriter"])
`);

      const response = await fetch("/core/app.py");
      if (!response.ok) {
        throw new Error(`분석 코드를 읽지 못했습니다: ${response.status}`);
      }
      this.runtime.globals.set("APP_SOURCE", await response.text());
      await this.runtime.runPythonAsync(`
import sys
import types

sys.modules.setdefault("streamlit", types.ModuleType("streamlit"))
app_module = types.ModuleType("achievement_browser_core")
sys.modules[app_module.__name__] = app_module
exec(APP_SOURCE, app_module.__dict__)
APP_NAMESPACE = app_module.__dict__
`);
      this.setStatus({
        state: "ready",
        message: "평가 파일을 선택해 주세요.",
      });
    } catch (error) {
      this.setStatus({
        state: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private loadScript() {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PYODIDE_SCRIPT}"]`,
    );
    if (existing) {
      return new Promise<void>((resolve, reject) => {
        if (window.loadPyodide) {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Pyodide 다운로드 실패")), {
          once: true,
        });
      });
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PYODIDE_SCRIPT;
      script.async = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("Pyodide 다운로드 실패")), {
        once: true,
      });
      document.head.append(script);
    });
  }

  private async writeFile(file: File, targetName: string) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    this.runtime!.FS.writeFile(`/tmp/${targetName}`, bytes);
  }
}

export const analysisEngine = new AnalysisEngine();

export async function digestFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
