const OPENAI_API_BASE = "https://api.openai.com/v1";

interface StreamRequest {
  apiKey: string;
  model: string;
  prompt: string;
  pdf?: File;
  onText(text: string): void;
  signal?: AbortSignal;
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
    };
    return payload.error?.message || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

async function uploadPdf(apiKey: string, pdf: File, signal?: AbortSignal) {
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", pdf, pdf.name);
  const response = await fetch(`${OPENAI_API_BASE}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal,
  });
  if (!response.ok) {
    throw new Error(`원안지 PDF 업로드 실패: ${await readError(response)}`);
  }
  const payload = (await response.json()) as { id?: string };
  if (!payload.id) throw new Error("원안지 PDF 파일 ID를 받지 못했습니다.");
  return payload.id;
}

async function deleteUploadedFile(apiKey: string, fileId: string) {
  try {
    await fetch(`${OPENAI_API_BASE}/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    // 분석 결과는 유지하고, 임시 파일 정리 실패만으로 전체 요청을 실패시키지 않는다.
  }
}

function outputTextFromResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown[] }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((part) =>
      part &&
      typeof part === "object" &&
      (part as { type?: string }).type === "output_text"
        ? String((part as { text?: string }).text ?? "")
        : "",
    )
    .join("");
}

function valueAt(value: unknown, path: string[]) {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function streamingErrorMessage(event: Record<string, unknown>) {
  const messagePaths = [
    ["message"],
    ["error", "message"],
    ["response", "error", "message"],
    ["response", "incomplete_details", "reason"],
  ];
  const codePaths = [
    ["code"],
    ["error", "code"],
    ["response", "error", "code"],
  ];
  const message = messagePaths
    .map((path) => valueAt(event, path))
    .find((value) => typeof value === "string" && value.trim());
  const code = codePaths
    .map((path) => valueAt(event, path))
    .find((value) => typeof value === "string" && value.trim());
  if (message) {
    return `OpenAI 스트리밍 오류${code ? ` (${code})` : ""}: ${message}`;
  }
  return "OpenAI 스트리밍 오류: 서버가 상세 원인을 전달하지 않았습니다. 잠시 후 다시 시도하거나 모델과 PDF 파일을 확인하세요.";
}

export async function streamOpenAiResponse({
  apiKey,
  model,
  prompt,
  pdf,
  onText,
  signal,
}: StreamRequest) {
  let uploadedFileId = "";
  try {
    if (pdf) uploadedFileId = await uploadPdf(apiKey, pdf, signal);
    const input = uploadedFileId
      ? [
          {
            role: "user",
            content: [
              { type: "input_file", file_id: uploadedFileId },
              { type: "input_text", text: prompt },
            ],
          },
        ]
      : prompt;
    const response = await fetch(`${OPENAI_API_BASE}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input,
        max_output_tokens: 16000,
        stream: true,
        store: false,
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${await readError(response)}`);
    }
    if (!response.body) {
      const payload = await response.json();
      const text = outputTextFromResponse(payload).trim();
      onText(text);
      return text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let finalPayload: unknown;

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";
      for (const eventBlock of events) {
        const data = eventBlock
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (!data || data === "[DONE]") continue;
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(data) as Record<string, unknown>;
        } catch {
          continue;
        }
        if (event.type === "response.output_text.delta") {
          fullText += String(event.delta ?? "");
          onText(fullText);
        } else if (event.type === "response.completed") {
          finalPayload = event.response;
        } else if (event.type === "error" || event.type === "response.failed") {
          throw new Error(streamingErrorMessage(event));
        }
      }
      if (done) break;
    }

    const finalText = (outputTextFromResponse(finalPayload) || fullText).trim();
    onText(finalText);
    return finalText;
  } finally {
    if (uploadedFileId) {
      await deleteUploadedFile(apiKey, uploadedFileId);
    }
  }
}
