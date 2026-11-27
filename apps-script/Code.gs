/**
 * YOONSFLOW 상담 데스크 — 5석 실시간 공유 API (Google Apps Script)
 * ------------------------------------------------------------------
 * 5석 상담원 PC가 같은 상담 접수·콜백 상태·메모를 함께 보도록,
 * 상담일지 스프레드시트 안에 `상담접수_공유` 탭을 따로 만들어 읽고 씁니다.
 * 기존 문의함 시트(1,951행)는 건드리지 않습니다.
 *
 * ■ 설치 (한 번만, 스프레드시트 소유 계정으로)
 *   1. 상담일지 스프레드시트(1KmzJPAI3BJppZEmuvpgQRmKO_kWC6BeAy6XLnRKUV-E)를 연다.
 *   2. 확장 프로그램 → Apps Script 를 연다.
 *   3. 이 파일 내용을 Code.gs 에 모두 붙여넣고 저장(Ctrl+S)한다.
 *   4. 배포 → 새 배포 → 유형 '웹 앱'
 *        - 설명: 상담 데스크 5석 공유
 *        - 다음 사용자로 실행: 나
 *        - 액세스 권한: 모든 사용자
 *      → 배포 → '웹 앱 URL'(.../exec)을 복사한다.
 *   5. 상담 데스크 → 설정 → '5석 실시간 공유' 칸에 그 URL을 붙여넣고 저장한다.
 *      (나머지 상담원 PC도 같은 URL을 한 번씩 넣으면 끝입니다.)
 *
 * ■ API
 *   GET  ?action=list            → { ok:true, calls:[ {...}, ... ] }
 *   GET  ?action=ping            → { ok:true, pong:true, count:N }
 *   GET  ?callback=cb            → 위 응답을 cb({...}); 로 감싼 JSONP (CORS 대비)
 *   POST  body = JSON (Content-Type: text/plain;charset=utf-8)
 *         { action:'upsert', call:{ id, ... } }  → id 기준 수정, 없으면 새 행
 *         { action:'delete', id:'...' }          → id 행 삭제
 *         { action:'ping' }                      → 쓰기 연결 확인
 *         응답: { ok:true, calls:[ ...최신 전체 목록... ] }
 *   오류는 HTTP 200 + { ok:false, error:'...' } 로 돌려줍니다.
 */

var SPREADSHEET_ID = '1KmzJPAI3BJppZEmuvpgQRmKO_kWC6BeAy6XLnRKUV-E';
var SHEET_NAME = '상담접수_공유';

/** 공유 시트 열 (순서 고정) */
var HEADERS = ['id', 'lead_key', 'created_at', 'updated_at', 'customer_name', 'phone',
               'channel', 'agent', 'type', 'status', 'callback_at', 'memo'];

var COL = {};
HEADERS.forEach(function (h, i) { COL[h] = i + 1; }); // 1부터 시작하는 열 번호

/* ============================ 진입점 ============================ */

function doGet(e) {
  var params = (e && e.parameter) || {};
  var payload;
  try {
    var action = String(params.action || 'list').toLowerCase();
    if (action === 'ping') {
      payload = { ok: true, pong: true, count: readAll_().length, sheet: SHEET_NAME };
    } else {
      payload = { ok: true, calls: readAll_() };
    }
  } catch (err) {
    payload = { ok: false, error: errorText_(err) };
  }
  return respond_(payload, params.callback);
}

function doPost(e) {
  var payload;
  try {
    var body = parseBody_(e);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) {
      return respond_({ ok: false, error: '다른 상담원이 저장 중입니다. 잠시 후 다시 시도해 주세요.' },
                      (e && e.parameter && e.parameter.callback) || null);
    }
    try {
      payload = handle_(body);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    payload = { ok: false, error: errorText_(err) };
  }
  return respond_(payload, (e && e.parameter && e.parameter.callback) || null);
}

/* ============================ 요청 처리 ============================ */

function parseBody_(e) {
  if (!e) return {};
  var raw = (e.postData && e.postData.contents) || '';
  if (!raw && e.parameter && e.parameter.payload) raw = e.parameter.payload;
  raw = String(raw == null ? '' : raw).trim();
  if (!raw) return {};
  try {
    var parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (err) {
    throw new Error('요청 본문이 JSON 이 아닙니다. Content-Type: text/plain 으로 JSON 문자열을 보내 주세요.');
  }
}

function handle_(body) {
  var action = String(body.action || 'upsert').toLowerCase();

  if (action === 'ping') {
    return { ok: true, pong: true, count: readAll_().length, sheet: SHEET_NAME };
  }
  if (action === 'list') {
    return { ok: true, calls: readAll_() };
  }
  if (action === 'upsert') {
    var call = body.call || body;
    var id = String(call.id == null ? '' : call.id).trim();
    if (!id) throw new Error('upsert 에는 id 가 필요합니다.');
    upsert_(call);
    return { ok: true, calls: readAll_() };
  }
  if (action === 'delete') {
    var delId = String(body.id || (body.call && body.call.id) || '').trim();
    if (!delId) throw new Error('delete 에는 id 가 필요합니다.');
    remove_(delId);
    return { ok: true, calls: readAll_() };
  }
  return { ok: false, error: '알 수 없는 action 입니다: ' + action };
}

/* ============================ 시트 ============================ */

function getSpreadsheet_() {
  var ss = null;
  // 바운드 스크립트면 활성 스프레드시트를 그대로 쓰되, 다른 시트가 열려 있어도
  // 엉뚱한 파일에 탭을 만들지 않도록 ID 를 확인합니다.
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active && String(active.getId()) === SPREADSHEET_ID) ss = active;
  } catch (err) {
    ss = null;
  }
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss) throw new Error('스프레드시트를 열지 못했습니다.');
  return ss;
}

/** `상담접수_공유` 탭을 찾고, 없으면 머리글까지 만들어 돌려줍니다. */
function getSheet_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#F4EDE3');
    sh.setFrozenRows(1);
    // 날짜처럼 보이는 값이 날짜로 바뀌지 않도록 전체를 텍스트 서식으로
    sh.getRange('A:L').setNumberFormat('@');
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange('A:L').setNumberFormat('@');
  }
  return sh;
}

function readAll_() {
  var sh = getSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getDisplayValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    var any = false;
    for (var c = 0; c < HEADERS.length; c++) {
      var v = row[c] == null ? '' : String(row[c]);
      if (v) any = true;
      obj[HEADERS[c]] = v;
    }
    if (!any) continue;
    if (!obj.id) obj.id = 'row-' + (i + 2);
    out.push(obj);
  }
  return out;
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
  var wanted = String(id == null ? '' : id).trim();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === wanted) return i + 2;
  }
  return 0;
}

function upsert_(call) {
  var sh = getSheet_();
  var now = new Date().toISOString();
  var rowIndex = findRow_(sh, call.id);

  var row = HEADERS.map(function (h) {
    var v = call[h];
    return v == null ? '' : String(v);
  });

  if (rowIndex) {
    // 생성 시각은 비어 있는 요청이 덮어쓰지 않도록 기존 값 유지
    if (!row[COL.created_at - 1]) {
      row[COL.created_at - 1] = String(sh.getRange(rowIndex, COL.created_at).getDisplayValue() || now);
    }
  } else {
    rowIndex = Math.max(sh.getLastRow() + 1, 2);
    if (!row[COL.created_at - 1]) row[COL.created_at - 1] = now;
  }
  if (!row[COL.updated_at - 1]) row[COL.updated_at - 1] = now;

  sh.getRange(rowIndex, 1, 1, HEADERS.length)
    .setNumberFormat('@')
    .setValues([row]);
  SpreadsheetApp.flush();
}

function remove_(id) {
  var sh = getSheet_();
  var rowIndex = findRow_(sh, id);
  if (!rowIndex) return;
  sh.deleteRow(rowIndex);
  SpreadsheetApp.flush();
}

/* ============================ 응답 ============================ */

function respond_(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback) {
    var fn = String(callback).replace(/[^A-Za-z0-9_$.]/g, '');
    if (fn) {
      return ContentService.createTextOutput(fn + '(' + json + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function errorText_(err) {
  return String((err && err.message) || err || '알 수 없는 오류');
}

/* ============================ 편의 ============================ */

/** 편집기에서 한 번 실행하면 공유 탭을 만들고 상태를 로그로 보여 줍니다. */
function setupSheet() {
  var sh = getSheet_();
  var rows = readAll_();
  Logger.log('시트: %s / 탭: %s / 상담 %s건', getSpreadsheet_().getName(), sh.getName(), rows.length);
  Logger.log('배포 → 새 배포 → 웹 앱 (액세스 권한: 모든 사용자) 으로 URL 을 만든 뒤 상담 데스크 설정에 넣으세요.');
  return rows.length;
}
