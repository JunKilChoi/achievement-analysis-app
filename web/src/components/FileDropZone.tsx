import { useId, useRef, useState } from "react";

interface FileDropZoneProps {
  accept: string;
  eyebrow: string;
  title: string;
  description: string;
  files: File[];
  multiple?: boolean;
  onFilesChange(files: File[]): void;
  onRemoveFile?(index: number): void;
  onClear?(): void;
}

export function FileDropZone({
  accept,
  eyebrow,
  title,
  description,
  files,
  multiple = false,
  onFilesChange,
  onRemoveFile,
  onClear,
}: FileDropZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const selectFiles = (list: FileList | null) => {
    if (!list) return;
    const selected = Array.from(list);
    onFilesChange(multiple ? selected : selected.slice(0, 1));
  };

  return (
    <section
      className={`drop-zone ${dragging ? "is-dragging" : ""} ${files.length ? "has-files" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        selectFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => selectFiles(event.target.files)}
      />
      <div className="file-icon" aria-hidden="true">
        {files.length ? "✓" : "＋"}
      </div>
      <p className="card-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <p className="drop-instruction">
        {dragging ? "이곳에 놓으세요" : "여기로 끌어놓거나 아래 버튼으로 선택하세요"}
      </p>
      <button
        className="secondary-button"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        {files.length ? "파일 다시 선택" : "내 컴퓨터에서 선택"}
      </button>
      {files.length > 0 ? (
        <div className="file-selection" aria-live="polite">
          <strong>{multiple ? `${files.length}개 파일 선택됨` : files[0].name}</strong>
          {multiple ? (
            <ul className="selected-file-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  {onRemoveFile ? (
                    <button
                      type="button"
                      className="file-remove-button"
                      aria-label={`${file.name} 제거`}
                      onClick={() => onRemoveFile(index)}
                    >
                      제거
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {onClear ? (
            <button className="text-button" type="button" onClick={onClear}>
              {multiple ? "목록 전체 초기화" : "파일 초기화"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
