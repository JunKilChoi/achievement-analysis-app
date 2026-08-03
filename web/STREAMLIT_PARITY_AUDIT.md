# Streamlit 원본 UI·기능 감사

> 이 문서는 `app.py`에서 자동 추출한 1차 원본 명세입니다. 실제 이식 전
> 각 호출의 조건 분기와 상태 동작을 소스와 대조해 수동으로 보완합니다.

## 전체 현황

- 원본 코드: 4,727줄
- UI 관련 호출: 269개
- 세션 상태 키: 36개

### UI 호출 종류

| 호출 | 개수 |
|---|---:|
| `caption` | 19 |
| `checkbox` | 2 |
| `columns` | 16 |
| `container` | 24 |
| `dataframe` | 20 |
| `download_button` | 5 |
| `empty` | 2 |
| `error` | 10 |
| `expander` | 8 |
| `file_uploader` | 3 |
| `form` | 1 |
| `form_submit_button` | 3 |
| `info` | 18 |
| `markdown` | 35 |
| `metric` | 13 |
| `number_input` | 14 |
| `radio` | 5 |
| `render_step_header` | 4 |
| `render_student_selector` | 2 |
| `rerun` | 6 |
| `selectbox` | 8 |
| `spinner` | 2 |
| `stop` | 2 |
| `subheader` | 10 |
| `success` | 8 |
| `text_area` | 6 |
| `text_input` | 12 |
| `title` | 1 |
| `vega_lite_chart` | 2 |
| `warning` | 8 |

## 함수별 UI 호출

### `render_focus_request_with_preset`

| 줄 | UI | 표시/인자 | 도움말 | 조건 |
|---:|---|---|---|---|
| 1596 | `st.selectbox` | preset_label |  | `` |
| 1601 | `st.text_area` | text_area_label | help_text | `` |

### `_render_stream_progress`

| 줄 | UI | 표시/인자 | 도움말 | 조건 |
|---:|---|---|---|---|
| 1953 | `placeholder.markdown` | normalize_ai_math_markdown(full_text) + suffix |  | `should_render` |

### `render_wrapped_table`

| 줄 | UI | 표시/인자 | 도움말 | 조건 |
|---:|---|---|---|---|
| 2779 | `st.info` | 표시할 데이터가 없습니다. |  | `df is None or df.empty` |
| 2828 | `st.markdown` | table_html |  | `` |

### `render_student_selector`

| 줄 | UI | 표시/인자 | 도움말 | 조건 |
|---:|---|---|---|---|
| 2959 | `st.info` | 학생 데이터가 없습니다. |  | `individual_df.empty` |
| 2967 | `st.info` | 선택할 수 있는 반 정보가 없습니다. |  | `not class_values` |
| 2970 | `st.columns` | [1, 2] |  | `` |
| 2972 | `st.selectbox` | 반 선택 |  | `` |
| 2975 | `st.info` | 선택한 반의 학생 데이터가 없습니다. |  | `class_students.empty` |
| 2985 | `st.selectbox` | 학생 선택 |  | `` |

### `main`

| 줄 | UI | 표시/인자 | 도움말 | 조건 |
|---:|---|---|---|---|
| 2989 | `st.title` | 성취수준별 평가결과 분석 웹앱 |  | `` |
| 2990 | `st.caption` | f"{APP_VERSION} · 나이스 문항정보표/학생답 정오표 자동 분석" |  | `` |
| 2992 | `st.expander` | 사용 흐름 |  | `` |
| 2993 | `st.markdown` | 1. 문항정보표와 학생답 정오표를 업로드합니다.
2. 앱이 문항정보, 정답, 배점, 학생 정오표를 자동 인식합니다.
3. 성취수준 분할점수를 확인하고 분석 결과를 웹에서 먼저 봅니다.
4. 확인용 엑셀과 5종 분석 엑셀 ZIP을 다운로드합니다.
5. 필요한 경우 OpenAI API 키를 입력해 전체/개별 학생 AI 분석 초안을 생성합니다. |  | `` |
| 3001 | `st.markdown` | 
        <style>
        .big-step-header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin: 34px 0 16px 0;
            padding: 18px 20px;
            border: 1px solid #d1d5db;
            border-left: 8px solid #374151;
            border-radius: 14px;
            background: linear-gradient(90deg, #f3f4f6 0%, #ffffff 100%);
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .big-step-badge {
            min-width: 44px;
            height: 44px;
            border-radius: 999px;
            background: #374151;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            font-weight: 800;
        }
        .big-step-title {
            font-size: 1.45rem;
            font-weight: 800;
            color: #111827;
            line-height: 1.25;
        }
        .big-step-desc {
            margin-top: 4px;
            font-size: 0.95rem;
            color: #4b5563;
            line-height: 1.45;
        }
        .big-section-gap {
            height: 22px;
            margin: 36px 0 20px 0;
            border: 0;
            border-top: 2px solid rgba(75, 85, 99, 0.36);
            box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.9) inset;
        }
        </style>
         |  | `` |
| 3079 | `st.columns` | 2 |  | `` |
| 3081 | `st.file_uploader` | 문항정보표 업로드 |  | `` |
| 3103 | `st.caption` | f"현재 분석에 사용 중인 문항정보표: {q_store.get('name', '')}" |  | `question_file is not None` |
| 3115 | `st.rerun` |  |  | `st.button("문항정보표 초기화", key="reset_question_file_store", use_container_width=True)` |
| 3117 | `st.download_button` | 문항정보표 양식 다운하기 | 나이스 문항정보표를 사용하지 않는 학교는 이 양식을 내려받아 문항번호, 평가요소, 성취기준, 난이도, 배점, 정답을 입력한 뒤 문항정보표 업로드에 다시 올리면 됩니다. | `` |
| 3125 | `st.caption` | 나이스 문항정보표가 없는 경우 위 양식을 내려받아 작성한 뒤, 같은 문항정보표 업로드 칸에 올리면 나이스 문항정보표처럼 인식됩니다. |  | `` |
| 3127 | `st.file_uploader` | 학생답 정오표 업로드 | 1반 파일을 먼저 올린 뒤 2반 파일을 추가로 올려도 되고, 여러 파일을 한꺼번에 선택해도 됩니다. 같은 파일은 자동으로 중복 제외됩니다. | `` |
| 3166 | `st.expander` | 업로드된 학생답 정오표 파일 |  | `st.session_state.answer_file_store or failed_files or duplicate_files` |
| 3178 | `st.dataframe` | file_view |  | `st.session_state.answer_file_store` |
| 3180 | `st.success` | f"정오표 {len(added_files)}개를 추가했습니다: " + ", ".join(added_files) |  | `added_files` |
| 3182 | `st.info` | f"이미 등록된 정오표 {len(duplicate_files)}개는 중복 제외했습니다: " + ", ".join(duplicate_files) |  | `duplicate_files` |
| 3184 | `st.warning` | f"정오표 {len(failed_files)}개는 읽지 못해 제외했습니다." |  | `failed_files` |
| 3185 | `st.dataframe` | pd.DataFrame(failed_files) |  | `failed_files` |
| 3195 | `st.rerun` |  |  | `st.button("정오표 목록 초기화", key="reset_answer_file_store")` |
| 3212 | `st.markdown` | 
        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:18px 20px; background:#f8fafc; margin:16px 0 18px 0;">
            <div style="font-size:1.08rem; font-weight:800; color:#111827; margin-bottom:10px;">파일 업로드 안내</div>
            <div style="color:#374151; line-height:1.65; font-size:0.95rem;">
                문항정보표와 교과목별학생정오표는 반드시 나이스에서 <b>XLS data</b> 형식으로 다운로드한 파일을 업로드해 주세요.
            </div>
            <div style="margin-top:14px; color:#111827; font-weight:700;">문항정보표</div>
            <div style="color:#374151; line-height:1.65; font-size:0.94rem;">
                나이스 → [교과담임] → [정기시험] → [문항정보표관리] → 학년·과목 선택 → [조회] → [출력] → [XLS data]
            </div>
            <div style="margin-top:8px; color:#475569; line-height:1.65; font-size:0.93rem;">
                나이스 문항정보표를 사용하지 않는 경우에는 위의 <b>문항정보표 양식 다운하기</b> 버튼으로 양식을 내려받아 작성한 뒤, 문항정보표 업로드 칸에 올릴 수 있습니다.
            </div>
            <div style="margin-top:14px; color:#111827; font-weight:700;">교과목별학생정오표</div>
            <div style="color:#374151; line-height:1.65; font-size:0.94rem;">
                나이스 → [교과담임] → [정기시험조회/통계] → [교과목별학생정오표] → 강의실별 [조회] → [XLS data]
            </div>
            <div style="margin-top:8px; color:#475569; line-height:1.65; font-size:0.93rem;">
                여러 강의실을 담당하는 경우, 각 강의실을 선택하여 조회한 뒤 강의실별 정오표 파일을 각각 저장해 주세요. 저장한 파일들은 이 앱에 한꺼번에 업로드할 수 있습니다.
            </div>
            <div style="margin-top:14px; padding:10px 12px; border-radius:10px; background:#fff7ed; border:1px solid #fed7aa; color:#7c2d12; line-height:1.55; font-size:0.93rem;">
                <b>주의</b> · 두 파일 모두 XLS data 버전이어야 합니다. PDF, 화면 출력용 파일, 임의로 편집한 엑셀 파일은 정상 인식되지 않을 수 있습니다.
            </div>
        </div>
         |  | `not question_file and not answer_files` |
| 3239 | `st.info` | 문항정보표와 학생답 정오표를 모두 업로드하면 자동 분석을 시작합니다. 정오표는 여러 개 업로드할 수 있습니다. |  | `not question_file or not answer_files` |
| 3255 | `st.error` | f"파일을 읽는 중 오류가 발생했습니다: {e}" |  | `` |
| 3256 | `st.stop` |  |  | `` |
| 3300 | `render_step_header` | 1 |  | `` |
| 3301 | `st.columns` | 6 |  | `` |
| 3302 | `m1.metric` | 교과목 |  | `` |
| 3303 | `m2.metric` | 학년/학기 |  | `` |
| 3304 | `m3.metric` | 선택형 문항 수 |  | `` |
| 3305 | `m4.metric` | 서답형 문항 수 |  | `` |
| 3306 | `m5.metric` | 학생 수 |  | `` |
| 3307 | `m6.metric` | 정오표 파일 수 |  | `` |
| 3309 | `st.columns` | 3 |  | `` |
| 3310 | `s1.metric` | 선택형 만점 |  | `` |
| 3311 | `s2.metric` | 서답형 만점 |  | `` |
| 3312 | `s3.metric` | 과목 만점 |  | `` |
| 3330 | `st.expander` | 평가정보 자동 인식값 수정 |  | `` |
| 3331 | `st.caption` | 위 자동 인식 결과에 표시된 값을 모두 수정할 수 있습니다. 수정한 값은 '자동 인식값 수정 적용' 버튼을 눌러야 아래 분석과 AI 분석에 반영됩니다. 학생 수와 정오표 파일 수는 실제 데이터 행을 바꾸는 값이 아니라 보고서와 AI 분석에 표시되는 평가 정보입니다. |  | `` |
| 3334 | `st.columns` | 5 |  | `` |
| 3335 | `cols[0].text_input` | 학년도 |  | `` |
| 3336 | `cols[1].text_input` | 학년 |  | `` |
| 3337 | `cols[2].text_input` | 학기 |  | `` |
| 3338 | `cols[3].text_input` | 평가구분 |  | `` |
| 3339 | `cols[4].text_input` | 교과목 |  | `` |
| 3341 | `st.columns` | 4 |  | `` |
| 3342 | `cols[0].number_input` | 선택형 문항 수 |  | `` |
| 3343 | `cols[1].number_input` | 서답형 문항 수 |  | `` |
| 3344 | `cols[2].number_input` | 학생 수 |  | `` |
| 3345 | `cols[3].number_input` | 정오표 파일 수 |  | `` |
| 3347 | `st.columns` | 3 |  | `` |
| 3348 | `cols[0].number_input` | 선택형 만점 |  | `` |
| 3349 | `cols[1].number_input` | 서답형 만점 |  | `` |
| 3350 | `cols[2].number_input` | 과목 만점 |  | `` |
| 3352 | `st.columns` | [1, 1, 4] |  | `` |
| 3355 | `st.success` | 자동 인식값 수정 내용이 적용되었습니다. |  | `btn_cols[0].button("자동 인식값 수정 적용", key=f"apply_auto_info_{auto_info_key_suffix}")` |
| 3356 | `st.rerun` |  |  | `btn_cols[0].button("자동 인식값 수정 적용", key=f"apply_auto_info_{auto_info_key_suffix}")` |
| 3362 | `st.rerun` |  |  | `btn_cols[1].button("원본으로 되돌리기", key=f"reset_auto_info_{auto_info_key_suffix}")` |
| 3367 | `st.markdown` | <div class='big-section-gap'></div> |  | `` |
| 3368 | `render_step_header` | 2 |  | `` |
| 3369 | `st.caption` | 나이스 문항정보표에서 자동 인식한 값입니다. 평가 후 분석 자료를 더 구체화하려면 평가영역, 성취기준, 난이도 등을 여기서 수정하세요. 수정한 값은 아래 분석 결과, 확인용 엑셀, 5종 분석 엑셀, AI 분석에 모두 반영됩니다. |  | `` |
| 3386 | `st.info` | 가로 입력칸에서 수정한 평가요소, 성취기준, 난이도, 배점, 정답은 아래 분석과 AI 분석에 반영됩니다. 수정 후에는 반드시 아래의 '문항정보 수정값 적용' 버튼을 눌러 주세요. 파일을 다시 올리거나 정오표 목록을 초기화하기 전까지 적용한 수정값이 유지됩니다. 문항정보표 형식에 따라 평가요소나 성취기준이 엑셀에서 다음 페이지로 넘어가며 일부만 인식될 수 있으므로, 평가요소와 성취기준이 빠지거나 잘리지 않았는지 꼼꼼히 확인해 주세요. |  | `` |
| 3387 | `st.warning` | 평가요소는 이후 평가영역별 분석과 AI 분석의 핵심 기준이 되므로, 문항정보표의 내용을 그대로 사용하기보다 반드시 문항의 실제 평가 내용을 반영하도록 수정해 주세요. 특히 평가영역이 단원명이나 큰 주제처럼 넓게 입력되어 있다면, 해당 문항이 실제로 평가하는 개념, 사고 과정, 자료 해석 능력, 적용 상황 등이 드러나도록 구체적으로 보완해야 합니다. 평가요소가 자세할수록 문항별 정답률, 오답 경향, 성취수준별 차이를 더 정확하고 의미 있게 해석할 수 있습니다. |  | `` |
| 3388 | `st.caption` | 문항이 잘못 인식되었거나 누락된 경우 아래의 '+ 문항 추가'를 사용하고, 삭제할 문항은 오른쪽 삭제 칸을 체크한 뒤 하단의 '선택 문항 삭제'를 누르세요. |  | `` |
| 3394 | `st.columns` | [0.75, 2.4, 2.4, 0.9, 0.8, 0.9, 0.55] |  | `` |
| 3397 | `col.markdown` | f"<div style='text-align:center; font-weight:700;'>{label}</div>" |  | `` |
| 3400 | `st.form` |  |  | `` |
| 3403 | `st.columns` | [0.75, 2.4, 2.4, 0.9, 0.8, 0.9, 0.55] |  | `` |
| 3405 | `c1.text_input` | 문항번호 |  | `` |
| 3407 | `c2.text_input` | 평가요소 |  | `` |
| 3408 | `c3.text_input` | 성취기준 |  | `` |
| 3412 | `c4.selectbox` | 난이도 |  | `` |
| 3413 | `c5.number_input` | 배점 |  | `` |
| 3414 | `c6.text_input` | 정답 |  | `` |
| 3415 | `c7.checkbox` | 삭제 |  | `` |
| 3418 | `st.columns` | [1.4, 1.0, 1.2, 3.1] |  | `` |
| 3419 | `action_cols[0].form_submit_button` | 문항정보 수정값 적용 |  | `` |
| 3420 | `action_cols[1].form_submit_button` | + 문항 추가 |  | `` |
| 3421 | `action_cols[2].form_submit_button` | 선택 문항 삭제 |  | `` |
| 3436 | `st.error` | 적용할 문항이 없습니다. 최소 1개 이상의 문항을 남겨 주세요. |  | `edited_question_df.empty` |
| 3437 | `st.stop` |  |  | `edited_question_df.empty` |
| 3445 | `st.success` | 선택한 문항을 삭제하고 문항정보 수정값을 적용했습니다. |  | `delete_question_rows` |
| 3447 | `st.success` | 새 문항을 추가했습니다. 내용을 입력한 뒤 문항정보 수정값 적용을 눌러 주세요. |  | `add_question_row` |
| 3449 | `st.success` | 문항정보 수정값을 적용했습니다. 아래 요약과 분석 결과에 적용된 값이 반영됩니다. |  | `apply_question_edits or delete_question_rows or add_question_row` |
| 3450 | `st.rerun` |  |  | `apply_question_edits or delete_question_rows or add_question_row` |
| 3456 | `st.caption` | f"마지막 적용 시각: {applied_at}" |  | `applied_at` |
| 3466 | `st.expander` | 수정된 문항정보 요약 |  | `` |
| 3467 | `st.caption` | 성취기준별로 평가요소, 난이도 배치, 문항 구성, 총점을 카드형으로 확인할 수 있습니다. 평가요소를 수정한 뒤 각 성취기준 안에서 문항의 평가 내용이 충분히 구체적으로 구분되는지 점검하세요. |  | `` |
| 3533 | `st.markdown` | 
            <style>
            .standard-summary-card {
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                padding: 18px 20px;
                margin: 14px 0;
                background: #ffffff;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
            }
            .standard-card-standard {
                font-size: 1.02rem;
                font-weight: 700;
                line-height: 1.5;
                color: #111827;
                margin-bottom: 12px;
                word-break: keep-all;
                overflow-wrap: anywhere;
            }
            .standard-card-metrics {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 12px;
            }
            .standard-card-metrics div {
                background: #f9fafb;
                border: 1px solid #eef0f3;
                border-radius: 10px;
                padding: 8px 12px;
                min-width: 110px;
            }
            .standard-card-metrics span {
                display: block;
                color: #6b7280;
                font-size: 0.82rem;
                margin-bottom: 2px;
            }
            .standard-card-metrics strong {
                color: #111827;
                font-size: 1rem;
            }
            .standard-card-section {
                margin-top: 12px;
            }
            .standard-card-label {
                font-weight: 700;
                color: #374151;
                margin-bottom: 6px;
            }
            .standard-summary-card ul {
                margin: 4px 0 0 1.1rem;
                padding: 0;
                line-height: 1.55;
            }
            .standard-summary-card li {
                margin: 3px 0;
                word-break: keep-all;
                overflow-wrap: anywhere;
            }
            .summary-chip-wrap {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }
            .summary-chip {
                display: inline-block;
                background: #f3f4f6;
                border: 1px solid #e5e7eb;
                border-radius: 999px;
                padding: 5px 9px;
                font-size: 0.9rem;
                color: #374151;
            }
            </style>
             |  | `` |
| 3614 | `st.info` | 표시할 문항정보가 없습니다. |  | `q_summary.empty` |
| 3619 | `st.markdown` | <div class='big-section-gap'></div> |  | `` |
| 3620 | `render_step_header` | 3 |  | `` |
| 3621 | `st.caption` | 선택형 만점, 서답형 만점, 과목 만점은 1. 자동 인식 결과의 '평가정보 자동 인식값 수정'에서 조정할 수 있습니다. |  | `` |
| 3625 | `st.columns` | 4 |  | `` |
| 3626 | `c1.number_input` | A/B 분할점수 |  | `` |
| 3627 | `c2.number_input` | B/C 분할점수 |  | `` |
| 3628 | `c3.number_input` | C/D 분할점수 |  | `` |
| 3629 | `c4.number_input` | D/E 분할점수 |  | `` |
| 3647 | `st.success` | 문항정보표와 학생답 정오표의 정답/배점 검증 결과가 정상입니다. |  | `warn_df.empty` |
| 3649 | `st.warning` | 문항정보표와 학생답 정오표의 정답/배점이 다른 문항이 있습니다. 검증결과 탭에서 확인하세요. |  | `` |
| 3654 | `st.radio` | 분석 영역 선택 |  | `` |
| 3666 | `st.container` |  |  | `selected_analysis_tab == "데이터 확인"` |
| 3671 | `st.dataframe` | parsed.question_df |  | `selected_analysis_tab == "데이터 확인"` |
| 3672 | `st.container` |  |  | `selected_analysis_tab == "데이터 확인"` |
| 3677 | `st.dataframe` | parsed.students_df |  | `selected_analysis_tab == "데이터 확인"` |
| 3678 | `st.container` |  |  | `selected_analysis_tab == "데이터 확인"` |
| 3683 | `st.dataframe` | parsed.validation_df |  | `selected_analysis_tab == "데이터 확인"` |
| 3687 | `st.container` |  |  | `selected_analysis_tab == "성취도 분석"` |
| 3688 | `st.columns` | 4 |  | `selected_analysis_tab == "성취도 분석"` |
| 3689 | `a1.metric` | 평균(점) |  | `selected_analysis_tab == "성취도 분석"` |
| 3690 | `a2.metric` | 표준편차 |  | `selected_analysis_tab == "성취도 분석"` |
| 3691 | `a3.metric` | 최고/최저(점) |  | `selected_analysis_tab == "성취도 분석"` |
| 3692 | `a4.metric` | 검사신뢰도 α |  | `selected_analysis_tab == "성취도 분석"` |
| 3693 | `st.dataframe` | fmt_percent_df(analysis["achievement"]) |  | `selected_analysis_tab == "성취도 분석"` |
| 3697 | `st.info` | "표준편차는 학생들의 점수가 평균을 중심으로 얼마나 흩어져 있는지를 보여주는 값입니다. " "시험 만점과 점수 범위의 영향을 받으므로 절대 점수만으로 크고 작음을 판단하기보다 " f"만점 대비 비율을 함께 보는 것이 좋습니다. 현재 표준편차는 만점 대비 {std_ratio:.1f}%입니다. " "대략 10% 이하는 점수 분포가 좁은 편, 10~20%는 어느 정도 차이가 있는 편, " "20% 이상은 학생 간 점수 차이가 큰 편으로 참고할 수 있습니다. " "최종 해석은 평균 점수, 성취수준 분포, 문항별 정답률과 함께 판단하세요." |  | `selected_analysis_tab == "성취도 분석"` |
| 3706 | `st.columns` | 2 |  | `selected_analysis_tab == "성취도 분석"` |
| 3709 | `st.container` |  |  | `selected_analysis_tab == "성취도 분석"` |
| 3710 | `st.subheader` | 전체 분석 그래프 | 전체 학급의 점수 분포, 최고점, 최저점, 평균을 함께 보여주는 그래프입니다. 회색 점수 분포 그래프는 학생 점수를 5점 단위로 나누어 각 구간의 학생 수를 폭으로 나타낸 것입니다. 폭이 넓을수록 그 점수 구간에 학생이 많다는 뜻입니다. 검은 I형 표시는 최저점~최고점 범위, 빨간 점은 평균입니다. | `selected_analysis_tab == "성취도 분석"` |
| 3724 | `st.vega_lite_chart` | chart_source_df |  | `not summary_chart_df.empty` |
| 3891 | `st.info` | 표시할 학급별 점수 데이터가 없습니다. |  | `selected_analysis_tab == "성취도 분석"` |
| 3893 | `st.markdown` | ##### 전체 성취수준별 비율 |  | `selected_analysis_tab == "성취도 분석"` |
| 3896 | `st.dataframe` | fmt_percent_df(total_level_chart_df) |  | `not total_level_chart_df.empty` |
| 3898 | `st.info` | 표시할 전체 성취수준 데이터가 없습니다. |  | `selected_analysis_tab == "성취도 분석"` |
| 3901 | `st.container` |  |  | `selected_analysis_tab == "성취도 분석"` |
| 3902 | `st.subheader` | 개별 반 분석 그래프 | 선택한 반의 성취수준 비율을 전체 성취수준 비율과 비교하는 그래프입니다. 해당 반이 전체에 비해 A~E 수준 중 어느 구간이 많은지 확인하세요. | `selected_analysis_tab == "성취도 분석"` |
| 3908 | `st.selectbox` | 분석할 반 선택 |  | `class_values` |
| 3952 | `st.caption` | f"빨간색 막대는 전체 성취수준 비율, 파란색 막대는 {selected_class_label} 성취수준 비율입니다." |  | `not class_level_chart_df.empty` |
| 3953 | `st.vega_lite_chart` | grouped_chart_df |  | `not class_level_chart_df.empty` |
| 4008 | `st.dataframe` | fmt_percent_df(comparison_table) |  | `not class_level_chart_df.empty` |
| 4010 | `st.info` | 선택한 반의 성취수준 데이터가 없습니다. |  | `class_values` |
| 4012 | `st.info` | 표시할 학급 데이터가 없습니다. |  | `selected_analysis_tab == "성취도 분석"` |
| 4014 | `st.container` |  |  | `selected_analysis_tab == "성취도 분석"` |
| 4015 | `st.subheader` | 학급별 성취도 | 학급별 응시자 수, 평균, 표준편차, 최고점, 최저점, 성취수준별 인원을 비교하는 표입니다. 학급 간 평균 차이와 성취수준 분포 차이를 확인하세요. | `selected_analysis_tab == "성취도 분석"` |
| 4019 | `st.dataframe` | fmt_percent_df(analysis["class_achievement"]) |  | `selected_analysis_tab == "성취도 분석"` |
| 4022 | `st.container` |  |  | `selected_analysis_tab == "문항별 분석"` |
| 4023 | `st.markdown` | 정답률과 변별도를 기준으로 취약 문항을 먼저 확인할 수 있습니다. |  | `selected_analysis_tab == "문항별 분석"` |
| 4024 | `st.info` | 이 표는 정답률이 낮은 문항부터 배열되어 있어 학생들이 상대적으로 어려워한 문항을 먼저 확인할 수 있습니다. 각 열 제목을 클릭하면 정답률, 변별도, 평가영역, 난이도, 선택지별 응답 비율 등을 기준으로 오름차순·내림차순 정렬을 바꿀 수 있습니다.

변별도는 상위 집단과 하위 집단의 정답률 차이를 나타내는 지표입니다. 계산식은 `변별도 = 상위 집단 정답률 - 하위 집단 정답률`입니다. 값이 클수록 성취 수준이 높은 학생과 낮은 학생을 잘 구분한 문항으로 볼 수 있습니다. 일반적으로 40% 이상이면 변별도가 높은 문항, 20~40%는 어느 정도 변별력이 있는 문항, 20% 미만은 변별력이 낮은 문항으로 참고할 수 있습니다.

다만 변별도가 지나치게 높은 경우에도 단순히 좋은 문항이라고만 해석하기보다는 검토가 필요합니다. 70% 이상처럼 상위 집단과 하위 집단의 정답률 차이가 매우 크게 나타나는 문항은 성취 수준을 강하게 구분한 문항일 수 있지만, 하위 성취 학생에게 지나치게 어려웠는지, 특정 개념 결손이 크게 작용했는지, 발문이나 선택지가 일부 학생에게 과도한 혼란을 주었는지 함께 살펴볼 필요가 있습니다. 따라서 변별도는 정답률, 난이도, 선택지 반응, 평가 내용과 함께 종합적으로 해석하는 것이 좋습니다. |  | `selected_analysis_tab == "문항별 분석"` |
| 4041 | `st.dataframe` | style_item_analysis_df(item_display) |  | `selected_analysis_tab == "문항별 분석"` |
| 4043 | `st.subheader` | 예상 난이도-실제 정답률 일치 여부 | 문항정보표에 입력한 예상 난이도와 실제 학생 정답률이 잘 맞았는지 비교하는 영역입니다. 설정한 정답률 기준에 따라 실제 난이도를 판단하고, 예상보다 어려웠던 문항이나 예상보다 쉬웠던 문항을 확인할 수 있습니다. 문항의 난이도 설정이 적절했는지, 학생들이 예상과 다르게 어려워한 문항은 무엇인지 살펴보세요. | `selected_analysis_tab == "문항별 분석"` |
| 4048 | `st.container` |  |  | `selected_analysis_tab == "문항별 분석"` |
| 4049 | `st.markdown` | ##### 실제 난이도 판정 기준 |  | `selected_analysis_tab == "문항별 분석"` |
| 4050 | `st.columns` | [1.2, 1.2, 1.6] |  | `selected_analysis_tab == "문항별 분석"` |
| 4052 | `st.number_input` | 어려움/보통 난이도 구분 정답률(%) |  | `selected_analysis_tab == "문항별 분석"` |
| 4061 | `st.number_input` | 보통/쉬움 난이도 구분 정답률(%) |  | `selected_analysis_tab == "문항별 분석"` |
| 4070 | `st.markdown` | f""" <div style="height:100%; min-height:74px; display:flex; align-items:center; padding:0.6rem 0.2rem; color:#475569; font-size:0.92rem; line-height:1.55;"> <div> <b>어려움</b> &lt; {int(hard_cut)}% &nbsp;·&nbsp; <b>보통</b> {int(hard_cut)}% 이상 {int(easy_cut)}% 미만 &nbsp;·&nbsp; <b>쉬움</b> {int(easy_cut)}% 이상 </div> </div> """ |  | `selected_analysis_tab == "문항별 분석"` |
| 4084 | `st.warning` | 보통/쉬움 난이도 구분 정답률은 어려움/보통 난이도 구분 정답률보다 커야 합니다. 현재는 기본값 33%, 66%로 계산합니다. |  | `int(hard_cut) >= int(easy_cut)` |
| 4097 | `st.markdown` | f""" <style> .difficulty-summary-grid {{ display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 0.7rem; margin: 0.85rem 0 1.05rem 0; }} .difficulty-summary-card {{ border: 1px solid #E5E7EB; border-radius: 14px; padding: 0.85rem 1rem; background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%); box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); }} .difficulty-summary-label {{ color: #64748B; font-size: 0.86rem; font-weight: 600; margin-bottom: 0.25rem; white-space: nowrap; }} .di… |  | `selected_analysis_tab == "문항별 분석"` |
| 4162 | `st.container` |  |  | `selected_analysis_tab == "문항별 분석"` |
| 4163 | `st.dataframe` | display_gap |  | `selected_analysis_tab == "문항별 분석"` |
| 4166 | `st.container` |  |  | `selected_analysis_tab == "학급별 분석"` |
| 4167 | `st.subheader` | 학급별 문항 분석 | 학급별로 각 문항의 정답률을 비교하는 표입니다. 특정 학급에서 유독 정답률이 낮은 문항은 그 반에서 해당 개념이나 자료 해석 과정이 충분히 정리되지 않았을 가능성을 보여줍니다. 전체 정답률뿐 아니라 반별 차이를 함께 보며, 학급별 보충 설명이나 피드백이 필요한 문항을 확인하세요. | `selected_analysis_tab == "학급별 분석"` |
| 4171 | `st.markdown` | 문항별 전체 정답률과 학급별 정답률을 함께 확인합니다. 특히 학급 간 정답률 차이를 보면 특정 반에서 유독 어려워한 문항을 찾을 수 있습니다. |  | `selected_analysis_tab == "학급별 분석"` |
| 4183 | `st.dataframe` | style_class_item_analysis_df(class_item_display) |  | `selected_analysis_tab == "학급별 분석"` |
| 4185 | `st.container` |  |  | `selected_analysis_tab == "학급별 분석"` |
| 4186 | `st.subheader` | 학급 간 정답률 차이가 큰 문항 | 학급 간 정답률 차이가 크게 나타난 문항을 따로 보여주는 표입니다. 같은 문항인데도 반별 결과 차이가 크다면 수업 진행 방식, 활동 경험, 개념 정리 정도, 문항을 받아들이는 방식에 차이가 있었는지 점검할 수 있습니다. 특정 반만 낮은 문항은 해당 반 중심으로, 여러 반에서 낮은 문항은 전체 보충 지도로 연결해 보세요. | `selected_analysis_tab == "학급별 분석"` |
| 4190 | `st.markdown` | 학급별 정답률의 최고값과 최저값 차이가 큰 문항을 먼저 보여줍니다. 학급별 수업 흐름, 활동 경험, 오개념 차이를 확인할 때 유용합니다. |  | `selected_analysis_tab == "학급별 분석"` |
| 4213 | `st.dataframe` | fmt_percent_df(gap_df.sort_values("학급간차이", ascending=False)) |  | `not gap_df.empty` |
| 4215 | `st.info` | 학급 간 정답률 차이를 계산할 데이터가 없습니다. |  | `selected_analysis_tab == "학급별 분석"` |
| 4217 | `st.markdown` | --- |  | `selected_analysis_tab == "학급별 분석"` |
| 4220 | `st.container` |  |  | `selected_analysis_tab == "평가영역별 분석"` |
| 4221 | `st.subheader` | 평가영역별 분석 | 평가영역별로 학생들의 성취 정도를 비교하는 영역입니다. 특정 영역의 결과가 낮게 나타났다면 단순히 점수가 낮다는 의미를 넘어, 그 영역에서 요구한 개념 이해, 자료 해석, 계산 과정, 실험 설계, 추론 등의 사고 과정 중 어디에서 어려움이 있었는지 살펴볼 필요가 있습니다. 학생의 사고가 막힌 지점을 더 자세히 파악하려면 이후 AI 분석 기능을 활용하여 평가영역별 결과를 심층적으로 해석해 보세요. | `selected_analysis_tab == "평가영역별 분석"` |
| 4225 | `st.info` | 환산점수는 각 평가영역에서 얻은 점수를 100점 만점 기준으로 바꾸어 표시한 값입니다. 서로 배점이 다른 평가영역을 같은 기준에서 비교하기 위한 값이며, 이미 해당 시험의 만점이 100점인 경우에는 원점수와 같은 값으로 표시됩니다. |  | `selected_analysis_tab == "평가영역별 분석"` |
| 4231 | `st.dataframe` | style_domain_analysis_df(domain_display) |  | `selected_analysis_tab == "평가영역별 분석"` |
| 4232 | `st.container` |  |  | `selected_analysis_tab == "평가영역별 분석"` |
| 4233 | `st.markdown` | #### 개인별 평가영역 분석 |  | `selected_analysis_tab == "평가영역별 분석"` |
| 4234 | `render_student_selector` | analysis["individual"] |  | `selected_analysis_tab == "평가영역별 분석"` |
| 4239 | `st.dataframe` | style_domain_analysis_df(domain_one_display) |  | `selected_student_domain` |
| 4242 | `st.container` |  |  | `selected_analysis_tab == "성취기준별 분석"` |
| 4243 | `st.subheader` | 성취기준별 분석 | 성취기준별로 학생들의 도달 정도를 확인하는 영역입니다. 하나의 성취기준은 개념 이해, 자료 해석, 원리 적용, 탐구 과정 등 여러 평가요소를 포함할 수 있으므로, 결과가 낮게 나타났다고 해서 단순히 성취기준 전체를 달성하지 못했다고 해석하기보다 어떤 평가요소에서 어려움이 있었는지 함께 살펴볼 필요가 있습니다. 관련 문항과 평가요소를 함께 확인하면 성취기준 도달 여부를 더 구체적으로 고찰할 수 있으며, 이후 AI 분석 기능을 활용해 학생의 이해가 막힌 지점과 보충 지도가 필요한 부분을 더 자세히 해석할 수 있습니다. | `selected_analysis_tab == "성취기준별 분석"` |
| 4249 | `st.dataframe` | style_standard_analysis_df(standard_display) |  | `selected_analysis_tab == "성취기준별 분석"` |
| 4250 | `st.container` |  |  | `selected_analysis_tab == "성취기준별 분석"` |
| 4251 | `st.markdown` | #### 개인별 성취기준 분석 |  | `selected_analysis_tab == "성취기준별 분석"` |
| 4252 | `render_student_selector` | analysis["individual"] |  | `selected_analysis_tab == "성취기준별 분석"` |
| 4263 | `st.dataframe` | style_standard_analysis_df(standard_one_display) |  | `selected_student_standard` |
| 4266 | `st.container` |  |  | `selected_analysis_tab == "성취수준별 분석"` |
| 4267 | `st.subheader` | 성취수준별 문항 분석 | 성취수준별로 학생들이 각 문항을 얼마나 맞혔는지 확인하는 영역입니다. 표의 값은 해당 성취수준에 속한 학생들 중 그 문항을 맞힌 학생의 비율을 의미합니다. 예를 들어 A 수준의 1번 문항 정답률이 90%라면, A 수준 학생의 90%가 1번 문항을 해결했다는 뜻입니다. 이 표는 단순히 문항별 정답률을 보는 것보다, 성취수준에 따라 학생들의 이해가 어떻게 달라지는지 해석하는 데 활용할 수 있습니다. 상위 성취수준에서도 정답률이 낮은 문항은 전체적으로 어려웠거나 문항에서 요구한 사고 과정이 복잡했을 가능성이 있고, 특정 성취수준부터 정답률이 급격히 낮아지는 문항은 그 지점에서 학생들의 이해가 갈라졌을 가능성을 보여줍니다. 성취수준별 차이가 큰 문항을 중심으로 어떤 개념이나 풀이 과정에서 차이가 생겼는지 살펴보세요. | `selected_analysis_tab == "성취수준별 분석"` |
| 4271 | `st.info` | A~E 열은 각 성취수준 학생들의 문항별 정답률입니다. 기본 정렬은 문항번호 순이며, 해당 성취수준 학생이 없는 경우에는 '-'로 표시됩니다. 연한 빨간색 구간은 뒤쪽의 더 낮은 성취수준 정답률이 앞쪽 수준보다 높아 A ≥ B ≥ C ≥ D ≥ E 순서가 역전된 범위입니다. |  | `selected_analysis_tab == "성취수준별 분석"` |
| 4279 | `st.warning` | 성취수준별 문항 분석에 표시할 데이터가 없습니다. 성취수준 분할점수와 학생 총점이 정상적으로 산출되었는지 확인해 주세요. |  | `level_df.empty` |
| 4290 | `st.dataframe` | style_level_item_analysis_df(level_display) |  | `selected_analysis_tab == "성취수준별 분석"` |
| 4293 | `st.container` |  |  | `selected_analysis_tab == "학생 개별"` |
| 4294 | `st.markdown` | 학생 이름은 웹앱 내부 확인용입니다. AI 분석에 보낼 때는 익명화 옵션을 권장합니다. |  | `selected_analysis_tab == "학생 개별"` |
| 4305 | `st.dataframe` | style_individual_analysis_df(fmt_percent_df(individual_view)) |  | `selected_analysis_tab == "학생 개별"` |
| 4306 | `st.container` |  |  | `selected_analysis_tab == "학생 개별"` |
| 4308 | `st.selectbox` | 학생 선택 |  | `selected_analysis_tab == "학생 개별"` |
| 4310 | `st.dataframe` | fmt_percent_df(one_long[["문항번호", "평가영역", "난이도", "배점", "정답", "원본표시", "선택지", "정오", "점수", "성취기준"]]) |  | `selected_analysis_tab == "학생 개별"` |
| 4313 | `st.container` |  |  | `selected_analysis_tab == "AI 분석"` |
| 4314 | `st.markdown` | #### AI 분석 |  | `selected_analysis_tab == "AI 분석"` |
| 4315 | `st.markdown` | 기본 분석은 원안지 없이 통계 자료를 바탕으로 해석하고, 고급 분석은 원안지 PDF를 함께 활용하는 구조입니다. |  | `selected_analysis_tab == "AI 분석"` |
| 4316 | `st.text_input` | OpenAI API Key |  | `selected_analysis_tab == "AI 분석"` |
| 4317 | `st.text_input` | 모델 |  | `selected_analysis_tab == "AI 분석"` |
| 4319 | `st.radio` | AI 분석 종류 |  | `selected_analysis_tab == "AI 분석"` |
| 4327 | `st.container` |  |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4328 | `st.markdown` | #### 기본 분석: 통계 기반 해석 |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4329 | `st.markdown` | 원안지 PDF 없이 현재 분석 데이터만으로 전체 경향, 취약 영역, 문항별 이상 신호, 학생 개별 피드백을 생성합니다. 결과는 평가 정보가 포함된 Word 문서로 저장할 수 있습니다. |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4330 | `st.radio` | 기본 분석 유형 |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4336 | `st.checkbox` | 학생 개별 분석에서 이름을 API로 보내지 않기 |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4339 | `st.selectbox` | AI 분석 대상 학생 |  | `basic_mode == "학생 개별 분석"` |
| 4354 | `st.radio` | 프롬프트 사용 방식 | PROMPT_MODE_HELP | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4361 | `st.expander` | 웹앱 기본 프롬프트 보기 |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4362 | `st.text_area` | 웹앱 기본 프롬프트 |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4409 | `st.caption` | 웹앱 기본 프롬프트만 사용합니다. 추가 의뢰나 직접 작성 프롬프트는 붙지 않습니다. |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4420 | `st.container` |  |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4421 | `st.expander` | 최종 AI 전달 프롬프트 확인 |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4422 | `st.text_area` | 최종 AI 전달 프롬프트 |  | `ai_section_mode == "기본 분석: 통계 기반 해석"` |
| 4439 | `st.error` | OpenAI API Key를 입력하세요. |  | `not api_key` |
| 4441 | `st.error` | 직접 작성한 프롬프트만 사용하려면 분석 지시문을 입력하세요. |  | `basic_prompt_mode == PROMPT_MODE_DIRECT and not basic_custom_prompt.strip()` |
| 4448 | `st.markdown` | #### 기본 분석 결과 |  | `st.button("기본 분석 실행", type="primary", key="run_basic_ai")` |
| 4449 | `st.caption` | 분석 결과가 생성되는 대로 아래에 실시간으로 표시됩니다. |  | `st.button("기본 분석 실행", type="primary", key="run_basic_ai")` |
| 4450 | `st.empty` |  |  | `st.button("기본 분석 실행", type="primary", key="run_basic_ai")` |
| 4462 | `st.warning` | AI 응답이 예상보다 짧습니다. 모델 출력 제한, API 오류, 프롬프트 입력량을 확인해 주세요. |  | `len(result.strip()) < 300` |
| 4464 | `st.error` | f"AI 분석 중 오류가 발생했습니다: {e}" |  | `st.button("기본 분석 실행", type="primary", key="run_basic_ai")` |
| 4468 | `st.markdown` | #### 저장된 기본 분석 결과 |  | `not basic_just_ran` |
| 4469 | `st.markdown` | normalize_ai_math_markdown(st.session_state[result_state_key]) |  | `not basic_just_ran` |
| 4473 | `st.spinner` | Word 보고서를 만드는 중입니다... |  | `st.button("기본 분석 Word 보고서 만들기", key="build_basic_ai_docx", use_container_width=True)` |
| 4483 | `st.success` | Word 보고서를 만들었습니다. 아래 버튼으로 다운로드하세요. |  | `st.button("기본 분석 Word 보고서 만들기", key="build_basic_ai_docx", use_container_width=True)` |
| 4485 | `st.error` | f"Word 보고서를 만드는 중 오류가 발생했습니다: {e}" |  | `st.button("기본 분석 Word 보고서 만들기", key="build_basic_ai_docx", use_container_width=True)` |
| 4488 | `st.download_button` | 기본 분석 결과 Word 다운로드 |  | `st.session_state.get(docx_state_key)` |
| 4498 | `st.container` |  |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4499 | `st.markdown` | #### 고급 분석: 원안지 기반 심층 해석 |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4500 | `st.markdown` | 원안지 PDF를 업로드한 뒤, 프롬프트 사용 방식과 필요 시 중점 분석 요청 프리셋을 고르고 문항 내용 기반 심층 분석을 생성합니다. |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4506 | `st.file_uploader` | 원안지 PDF 업로드 |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4520 | `st.caption` | f"현재 분석에 사용 중인 원안지 PDF: {source_pdf.name}" |  | `source_pdf is not None` |
| 4524 | `st.rerun` |  |  | `st.button("원안지 PDF 초기화", key="reset_source_pdf_store", use_container_width=True)` |
| 4526 | `st.radio` | 프롬프트 사용 방식 | PROMPT_MODE_HELP | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4548 | `st.caption` | f"선택한 분석 관점: {selected_advanced_preset}" |  | `selected_advanced_preset != "직접 입력"` |
| 4550 | `st.selectbox` | 중점 분석 요청 프리셋 | 직접 작성 모드에서도 프리셋을 초안으로 불러올 수 있습니다. 프리셋을 고르면 아래 분석 지시문에 자동 입력되며, 원하는 대로 수정할 수 있습니다. | `advanced_prompt_mode == PROMPT_MODE_DIRECT` |
| 4561 | `st.caption` | f"선택한 분석 관점: {selected_advanced_preset}" |  | `selected_advanced_preset != "직접 입력"` |
| 4563 | `st.caption` | 웹앱 기본 프롬프트만 사용합니다. 추가 의뢰나 직접 작성 프롬프트는 붙지 않습니다. |  | `advanced_prompt_mode == PROMPT_MODE_DEFAULT` |
| 4569 | `st.text_input` | 분석할 문항번호 | 비워두면 통계 결과를 기준으로 AI가 우선 분석 문항을 선정합니다. | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4578 | `st.warning` | 입력한 문항번호를 인식하지 못했습니다. 예: 3, 7, 12 또는 3-7 형식으로 입력하세요. |  | `item_number_raw.strip() and not selected_item_numbers` |
| 4580 | `st.caption` | "선택 문항: " + ", ".join(f"{n}번" for n in selected_item_numbers) |  | `selected_item_numbers` |
| 4582 | `st.caption` | 문항번호를 비워두면 앱의 통계 결과를 바탕으로 우선 분석 문항을 AI가 선정합니다. |  | `need_item_input` |
| 4596 | `st.expander` | 웹앱 기본 프롬프트 보기 |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4597 | `st.text_area` | 웹앱 기본 프롬프트 |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4600 | `st.text_area` | AI에게 직접 전달할 분석 지시문 | 직접 작성 모드에서는 웹앱의 기본 분석 목차를 사용하지 않고, 여기에 작성한 지시문과 앱 분석 데이터, 원안지 PDF만 AI에 전달합니다. 위 프리셋을 초안으로 불러온 뒤 원하는 분석 방향으로 수정할 수 있습니다. | `advanced_prompt_mode == PROMPT_MODE_DIRECT` |
| 4617 | `st.container` |  |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4618 | `st.expander` | 최종 AI 전달 프롬프트 확인 |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4619 | `st.text_area` | 최종 AI 전달 프롬프트 |  | `ai_section_mode == "고급 분석: 원안지 기반 심층 해석"` |
| 4638 | `st.info` | 원안지 PDF를 업로드하면 고급 분석을 실행할 수 있습니다. |  | `source_pdf is None` |
| 4642 | `st.error` | OpenAI API Key를 입력하세요. |  | `not api_key` |
| 4644 | `st.error` | 직접 작성한 프롬프트만 사용하려면 분석 지시문을 입력하세요. |  | `advanced_prompt_mode == PROMPT_MODE_DIRECT and not advanced_custom_prompt.strip()` |
| 4652 | `st.markdown` | #### 고급 분석 결과 |  | `st.button("고급 분석 실행", type="primary", key="run_advanced_ai", disabled=(source_pdf is None))` |
| 4653 | `st.caption` | 원안지 PDF와 통계 자료를 함께 분석하며, 결과가 생성되는 대로 실시간으로 표시됩니다. |  | `st.button("고급 분석 실행", type="primary", key="run_advanced_ai", disabled=(source_pdf is None))` |
| 4654 | `st.empty` |  |  | `st.button("고급 분석 실행", type="primary", key="run_advanced_ai", disabled=(source_pdf is None))` |
| 4666 | `st.warning` | AI 응답이 예상보다 짧습니다. PDF 인식, 모델 출력 제한, API 오류, 프롬프트 입력량을 확인해 주세요. |  | `len(result.strip()) < 300` |
| 4668 | `st.error` | f"고급 분석 중 오류가 발생했습니다: {e}" |  | `st.button("고급 분석 실행", type="primary", key="run_advanced_ai", disabled=(source_pdf is None))` |
| 4672 | `st.markdown` | #### 저장된 고급 분석 결과 |  | `not advanced_just_ran` |
| 4673 | `st.markdown` | normalize_ai_math_markdown(st.session_state[adv_result_state_key]) |  | `not advanced_just_ran` |
| 4677 | `st.spinner` | Word 보고서를 만드는 중입니다... |  | `st.button("고급 분석 Word 보고서 만들기", key="build_advanced_ai_docx", use_container_width=True)` |
| 4687 | `st.success` | Word 보고서를 만들었습니다. 아래 버튼으로 다운로드하세요. |  | `st.button("고급 분석 Word 보고서 만들기", key="build_advanced_ai_docx", use_container_width=True)` |
| 4689 | `st.error` | f"Word 보고서를 만드는 중 오류가 발생했습니다: {e}" |  | `st.button("고급 분석 Word 보고서 만들기", key="build_advanced_ai_docx", use_container_width=True)` |
| 4692 | `st.download_button` | 고급 분석 결과 Word 다운로드 |  | `st.session_state.get(adv_docx_state_key)` |
| 4701 | `st.markdown` | <div class='big-section-gap'></div> |  | `` |
| 4702 | `render_step_header` | 4 |  | `` |
| 4703 | `st.columns` | 2 |  | `` |
| 4710 | `d1.download_button` | 확인용 엑셀 다운로드 |  | `` |
| 4717 | `d2.download_button` | 5종 분석 엑셀 ZIP 다운로드 |  | `` |

### `render_step_header`

| 줄 | UI | 표시/인자 | 도움말 | 조건 |
|---:|---|---|---|---|
| 3054 | `st.markdown` | f""" <div class="big-step-header"> <div class="big-step-badge">{html.escape(step_no)}</div> <div> <div class="big-step-title">{html.escape(title)}</div> {desc_html} </div> </div> """ |  | `` |

### `render_standard_card`

| 줄 | UI | 표시/인자 | 도움말 | 조건 |
|---:|---|---|---|---|
| 3531 | `st.markdown` | card_html |  | `` |

### `render_data_check_help_heading`

| 줄 | UI | 표시/인자 | 도움말 | 조건 |
|---:|---|---|---|---|
| 3664 | `st.subheader` | title | help_text | `selected_analysis_tab == "데이터 확인"` |

## 세션 상태 키

- `adv_context_state_key`
- `adv_docx_state_key`
- `adv_filename_state_key`
- `adv_focus_state_key`
- `adv_meta_state_key`
- `adv_result_state_key`
- `advanced_direct_prompt_v197`
- `answer_file_store`
- `answer_uploader_nonce`
- `auto_info_sig_key`
- `auto_info_state_key`
- `base_parsed_upload_signature`
- `base_parsed_value`
- `context_state_key`
- `direct_preset_last_key`
- `docx_state_key`
- `editor_sig_key`
- `editor_state_key`
- `export_confirm_bytes`
- `export_files_signature`
- `export_zip_bytes`
- `filename_state_key`
- `focus_state_key`
- `get`
- `last_key`
- `meta_state_key`
- `pop`
- `question_file_store`
- `question_info_editor_applied_at`
- `question_uploader_nonce`
- `result_state_key`
- `runtime_analysis_signature`
- `runtime_analysis_value`
- `source_pdf_store`
- `source_pdf_uploader_nonce`
- `text_key`
