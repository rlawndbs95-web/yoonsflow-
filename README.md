# YOONSFLOW 상담 데스크

병원 CS 센터(5석) 상담 접수·콜백 관리 웹앱. `index.html` 한 파일로 동작하는 정적 웹앱이라
GitHub Pages, 사내 웹서버, 파일 직접 열기 어디서든 그대로 실행됩니다.

- 라이브(예정): https://rlawndbs95-web.github.io/yoonsflow-/
- 원본 앱: https://yoonsflow-call-desk.rlawndbs95.chatgpt.site/

## 이번에 추가된 것

| 항목 | 내용 |
| --- | --- |
| 문의함 → 접수 자동 채움 | 문의함의 `접수하기`를 누르면 고객명·전화번호·유입경로·메모가 상담 접수 폼에 자동 입력. 이미 접수된 번호/건은 `접수됨` 배지로 표시되고, 누르면 그 상담으로 이동 |
| 콜백 예정 시각 | 처리 상태가 `콜백 대기`일 때 예정 시각 입력. 30분 내 임박(주황)·지난 건(빨강)은 목록 최상단 강조 + 상단 알림 배너 |
| 상담원 실명 | 설정에서 5석 이름 편집·저장(localStorage). 기본값 `천서희 / 강효은 / 이지은 / 문예지 / 신입`. 상담 목록 담당자 필터 |
| 문의함 레이아웃·통합 검색 | 목록 높이/패딩 확대, 긴 메모 2줄 처리로 행 잘림 방지. 상담 목록 검색이 고객명·전화번호·메모·유입경로·담당자까지 검색 |
| 데이터 | localStorage 저장 + 데모 데이터 + JSON 내보내기/가져오기 + 전체 초기화 |
| 저장 방식 3종 | ① 이 브라우저(localStorage) ② Google 시트 직접 연결 ③ 원격 API(`/api/...`) 연결 |

## Google 시트 연결 (권장)

1. Google 시트 → `공유` → 일반 액세스 **링크가 있는 모든 사용자 · 뷰어**로 변경
2. 시트 주소 복사 (`.../spreadsheets/d/…/edit#gid=0`)
3. 앱 오른쪽 위 `설정` → 저장 방식 `Google 시트 연결` → 링크 붙여넣기
   (탭을 지정하려면 `시트 탭 이름`도 입력)
4. `시트 연결 확인` → `N건을 읽었습니다 · 열: …` 이 나오면 `저장`

앱은 링크를 Google CSV 주소(`/gviz/tq?tqx=out:csv`)로 바꿔 브라우저에서 직접 읽습니다.
Google의 CSV 응답은 `github.io` 도메인에 CORS 허용 헤더(`access-control-allow-origin`)를
돌려주므로 별도 서버 없이 동작합니다(2026-11-27 확인).

### 열 자동 인식

머리글(1~8행)에서 아래 낱말을 찾아 열을 잡습니다. 못 찾으면 기본 순서로 읽습니다.

| 항목 | 인식 낱말 |
| --- | --- |
| 날짜 | 날짜, 일자, 접수일, 문의일, date |
| 이름 | 이름, 성함, 고객명, 고객, 성명 |
| 연락처 | 연락처, 전화, 휴대폰, 핸드폰, 번호 |
| 유입경로 | 유입, 경로, 채널, 매체, 광고 |
| 메모 | 메모, 상담내용, 문의내용, 내용, 비고, 특이 |
| 결과 | 결과, 콜결과, 상태 |
| 예약일 | 예약일, 예약 |

기본 순서(머리글 없을 때): `날짜, 이름, 연락처, 유입경로, 메모, 결과, 예약일`

## 원격 API 모드에 대해

기존 사이트(`yoonsflow-call-desk.rlawndbs95.chatgpt.site`)의 `/api/calls`, `/api/leads`는
응답에 CORS 헤더가 없고 `OPTIONS` 프리플라이트가 `405`를 돌려줍니다. 따라서 다른 도메인
(`rlawndbs95-web.github.io`)에서 그대로 호출하면 브라우저가 막습니다.
원격 API 모드는 서버에 CORS를 열어 준 뒤 주소를 넣어 쓰는 확장용 옵션입니다.
(서버 쪽에 `Access-Control-Allow-Origin: https://rlawndbs95-web.github.io` 와
`OPTIONS` 처리만 추가하면 됩니다.)

## 배포

```bash
# 저장소를 만든 뒤 (public)
git remote add origin https://github.com/rlawndbs95-web/yoonsflow-.git
git push -u origin main
```

GitHub → Settings → Pages → Source: `Deploy from a branch` → `main` / `/ (root)` → Save.
1~2분 뒤 https://rlawndbs95-web.github.io/yoonsflow-/ 가 열립니다.

## 파일

- `index.html` — 앱 전체 (스타일·스크립트 포함, 외부 의존 없음)
- `.nojekyll` — GitHub Pages에서 Jekyll 처리 생략
- `README.md` — 이 문서
