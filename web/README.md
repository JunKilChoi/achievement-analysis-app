# 성취수준별 평가결과 분석 — Cloudflare 웹앱

기존 Streamlit 앱을 Cloudflare Pages에서 실행되는 정적 웹앱으로 옮기는
작업 디렉터리입니다. Excel 파일과 분석 결과는 서버로 전송하지 않고
Pyodide를 이용해 사용자의 브라우저 안에서 처리합니다.

## 현재 구현 범위

- 문항정보표 1개와 학생답 정오표 여러 개 선택
- 기존 Python 분석 로직을 브라우저에서 실행
- 90/80/70/60% 기준 A/B/C/D/E 성취수준 계산
- 확인용 Excel과 분석 ZIP 생성
- 데스크톱·모바일 반응형 업로드/결과 화면

현재는 마이그레이션의 첫 번째 기능 단위입니다. 기존 Streamlit의 상세
분석 탭, 문항정보 편집, 차트, OpenAI 연동, Word 보고서 생성은 이후
단계에서 순차적으로 이식합니다.

## 로컬 실행

```powershell
pnpm install
pnpm dev
```

프로덕션 빌드는 다음과 같습니다.

```powershell
pnpm build
```

빌드 결과는 `dist`에 생성됩니다.

## Cloudflare Pages 설정

- Root directory: `web`
- Build command: `pnpm build`
- Build output directory: `dist`
- Node.js: 24 이상

현재 단계에서는 서버, 데이터베이스, Cloudflare Functions가 필요하지
않습니다.
