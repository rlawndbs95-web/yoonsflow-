# YOONSFLOW 상담 데스크

병원 CS 센터(5석) 상담 접수·콜백 관리 웹앱. `index.html` 한 파일로 동작하는 정적 웹앱이라
GitHub Pages, 사내 웹서버, 파일 직접 열기 어디서든 그대로 실행됩니다.

- 라이브: https://rlawndbs95-web.github.io/yoonsflow-/
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
| 5석 실시간 공유 | 공유 주소가 앱에 기본 내장되어 열면 바로 연결됩니다. 저장·수정·삭제가 `상담접수_공유` 시트에 바로 반영되고 20초마다 새로고침. 상세 화면에 `삭제` 버튼 추가(5석 모두에게서 삭제) |

## 5석 실시간 공유 (Apps Script)

각 상담원 PC의 브라우저가 따로 저장하던 상담을 하나의 시트로 모아 실시간 공유합니다.
**공유 주소가 `index.html`에 기본 내장되어 있어**, 5석 PC는
https://rlawndbs95-web.github.io/yoonsflow-/ 에 접속하기만 하면 별도 설정 없이 바로 연결됩니다.

- 기본 주소: `https://script.google.com/macros/s/AKfycbxSWZ5hiKOTSk3OXf-xPgB48fjihgQzGsgepAD_cPOMRJkBPAgxyICJbpNSJn36y4oYEQ/exec`
- 기본 대상 시트: 공유 DB `YOONSFLOW 상담접수 공유DB` (`1I-I-OeiXbCH5k4HinOMdqHeQxpr2UJ4PKum_JwWnoh0`)
- 다른 주소로 바꾸거나 공유를 끄려면 → 설정 → **5석 실시간 공유** 칸 수정(칸을 비우고 저장하면 이 브라우저에만 저장)

새로 설치할 때만:

1. 공유 DB 스프레드시트(`YOONSFLOW 상담접수 공유DB`, `1I-I-OeiXbCH5k4HinOMdqHeQxpr2UJ4PKum_JwWnoh0`) → 확장 프로그램 → Apps Script
2. `apps-script/Code.gs` 내용을 붙여넣고 저장
3. 배포 → 새 배포 → 웹 앱 · 실행: `나` · 액세스: `모든 사용자` → `/exec` 주소 복사
4. 받은 주소를 `index.html`의 `DEFAULT_SHARE_URL`(또는 설정 → 5석 실시간 공유 칸)에 넣기

- 시트에는 `상담접수_공유` 탭이 자동으로 생깁니다. 문의함 시트(상담일지, 1,951행)는 읽지도 쓰지도 않습니다.
- 열: `id`, `lead_key`, `created_at`, `updated_at`, `customer_name`, `phone`, `channel`, `agent`, `type`, `status`, `callback_at`, `memo`
- 저장·수정·삭제는 `text/plain` POST(`action: upsert | delete`)로 보내 CORS 프리플라이트를 피합니다.
  읽기는 GET(JSON), 브라우저가 막으면 `callback` 을 붙인 JSONP 로 자동 전환합니다.
- 연결이 끊긴 동안 저장한 건은 이 브라우저에 남기고 `전송 대기`로 두었다가 20초마다 다시 보냅니다.
- 저장소가 비어 있거나(`shareCleared`) 이전 버전이 빈 값을 저장해 둔 경우: 저장값이 비어 있고 사용자가 직접 해제한 기록이 없으면 내장 기본 주소를 사용합니다.
- 주소를 비우고 저장하면 기존처럼 이 브라우저에만 저장합니다.

## Google 시트 연결 (기본 설정됨)

`index.html`에는 아래 시트가 **기본 연결**되어 있어, 링크를 열면 별도 설정 없이 바로 문의함이 채워집니다.

- 시트: `1KmzJPAI3BJppZEmuvpgQRmKO_kWC6BeAy6XLnRKUV-E` (상담일지, 2026-11-27 기준 1,953행)
- 시트를 바꾸려면 → 오른쪽 위 `설정` → 저장 방식 `Google 시트 연결` → 새 링크 입력

시트 공유는 **링크가 있는 모든 사용자 · 뷰어**여야 합니다. 앱은 링크를 Google CSV 주소
(`/gviz/tq?tqx=out:csv`)로 바꿔 브라우저에서 직접 읽으며, Google의 CSV 응답은
`github.io` 도메인에 CORS 허용 헤더(`access-control-allow-origin`)를 돌려주는 것을
2026-11-27 확인했습니다. 실제 시트 데이터는 사용자 브라우저에서만 읽히고 저장소에는
들어가지 않습니다(공개 저장소에 고객 개인정보 없음).

### 열 자동 인식

머리글(상위 8행)에서 아래 낱말을 정확히 일치하는 열을 먼저 찾고, 없으면 부분 일치로 잡습니다.
현재 시트의 13개 열은 모두 자동 인식됩니다(확인함).

| 항목 | 사용 중인 시트 열 | 기본 인식 낱말 |
| --- | --- | --- |
| 날짜 | A `날짜` | 날짜, 일자, 접수일, 문의일 |
| 예약자 | B `예약자` | 예약자, 작성자, 담당자 |
| 유입경로 | C `내원경로` | 내원경로, 유입경로, 경로, 채널, 매체 |
| 구분 | D `환자구분` | 환자구분, 구분 |
| 고객명 | E `고객명` | 고객명, 환자명, 이름, 성함, 성명 |
| 연락처 | F `연락처` | 연락처, 전화, 휴대폰, 번호 |
| 시술명 | G `시술명 / 상담내용` | 시술명, 시술 |
| 콜결과 | H `콜결과` | 콜결과, 결과, 상태 |
| 예약일 | I `예약일` | 예약일, 예약 |
| 사유 | J `미예약 사유` | 미예약 사유, 사유 |
| 메모 | K `상담메모` | 상담메모, 메모, 상담내용, 내용 |
| 내원여부 | L `내원여부` | 내원여부, 방문여부 |
| 리콜 | M `리콜` | 리콜, 재콜 |

머리글을 못 찾으면 기본 순서(`날짜, 예약자, 내원경로, 환자구분, 고객명, 연락처, 시술명, 콜결과, 예약일, 사유, 상담메모, 내원여부, 리콜`)로 읽습니다.

목록은 **날짜 최신순**(같은 날짜면 시트 아래쪽 행이 먼저)으로 정렬되고, 빈 행은 건너뜁니다.

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
git remote add origin https://github.com/rlawndbs95-web/yoonsflow-call-desk.git
git push -u origin main
```

GitHub → Settings → Pages → Source: `Deploy from a branch` → `main` / `/ (root)` → Save.
1~2분 뒤 https://rlawndbs95-web.github.io/yoonsflow-call-desk/ 가 열립니다.

## 파일

- `index.html` — 앱 전체 (스타일·스크립트 포함, 외부 의존 없음)
- `apps-script/Code.gs` — 5석 공유용 Apps Script (스프레드시트에 붙여넣는 파일)
- `.nojekyll` — GitHub Pages에서 Jekyll 처리 생략
- `README.md` — 이 문서
