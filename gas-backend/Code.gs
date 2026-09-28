// 스마트워크 강의자료 - 구글 스프레드시트 백엔드 (Supabase 대체)
// 웹사이트(Vercel)가 이 Apps Script 웹앱에 데이터를 요청하면, 스프레드시트의 각 시트를 표처럼 읽고 씁니다.
// 시트 이름 = 예전 Supabase 테이블 이름, 1행 = 열 이름(영문 키). 열 순서는 바꿔도 되지만 1행 이름은 바꾸지 마세요.
//
// 설치 방법
// 1) 새 구글 스프레드시트를 만들고 확장 프로그램 > Apps Script 에 이 파일(Code.gs)과 appsscript.json 내용을 붙여넣습니다.
//    (clasp 사용 시: 이 폴더에서 clasp create --type sheets --title "스마트워크 DB" 후 clasp push)
// 2) 프로젝트 설정 > 스크립트 속성에 추가합니다.
//      ADMIN_PASSWORD = 관리자 페이지 비밀번호
//      SUPABASE_SERVICE_KEY = (선택) Supabase service_role 키 - '의견' 데이터까지 옮기려면 필요, 옮긴 뒤 삭제하세요.
// 3) 편집기에서 importFromSupabase 함수를 한 번 실행합니다. (시트 생성 + 기존 데이터/사진 복사, 권한 승인 필요)
// 4) 배포 > 새 배포 > 유형 "웹 앱", 실행 사용자 "나", 액세스 권한 "모든 사용자" 로 배포하고
//    나온 URL(…/exec)을 app/js/sheet-client.js 의 SHEET_API_URL 에 넣습니다.
//    코드를 고친 뒤에는 배포 > 배포 관리 > 수정 > 버전 "새 버전" 으로 해야 반영됩니다(URL 유지).

var SCHEMA = {
  '설정': { id: 'int', course_name: 'text', instructor_name: 'text', instructor_contact: 'text', intro: 'text',
    education_date: 'text', admin_email: 'text', period1_title: 'text', period1_desc: 'text', period2_title: 'text', period2_desc: 'text' },
  '공지사항': { id: 'int', title: 'text', content: 'text', is_visible: 'bool', created_at: 'text' },
  '교육자료': { id: 'int', title: 'text', description: 'text', link: 'text', icon: 'text', sort_order: 'int', created_at: 'text' },
  '실습주제': { id: 'int', title: 'text', sort_order: 'int', created_at: 'text' },
  '실습자료': { id: 'int', topic_id: 'int', category: 'text', title: 'text', description: 'text', code: 'text', link: 'text',
    sort_order: 'int', created_at: 'text' },
  'AI도구': { id: 'int', name: 'text', description: 'text', link: 'text', icon: 'text', sort_order: 'int', created_at: 'text' },
  '참고자료': { id: 'int', title: 'text', description: 'text', link: 'text', sort_order: 'int', created_at: 'text' },
  '질문': { id: 'int', content: 'text', wants_answer: 'bool', affiliation: 'text', name: 'text', contact: 'text', email: 'text',
    edit_token: 'text', created_at: 'text' },
  '답변': { id: 'int', question_id: 'int', content: 'text', created_at: 'text' },
  '의견': { id: 'int', content: 'text', affiliation: 'text', name: 'text', contact: 'text', email: 'text', created_at: 'text' },
  '실습공유': { id: 'int', name: 'text', content: 'text', link: 'text', image_url: 'text', created_at: 'text' }
};

// 로그인 없이 누구나 등록할 수 있는 시트와, 등록 시 받을 수 있는 열
var PUBLIC_INSERT = {
  '질문': ['content', 'wants_answer', 'affiliation', 'name', 'contact', 'email'],
  '의견': ['content', 'affiliation', 'name', 'contact', 'email'],
  '실습공유': ['name', 'content', 'link', 'image_url']
};
// 관리자만 볼 수 있는 시트
var ADMIN_READ_ONLY = { '의견': true };
// 일반 방문자에게는 숨기는 열 (개인정보, 본인 수정용 토큰)
var PRIVATE_FIELDS = { '질문': ['affiliation', 'name', 'contact', 'email', 'edit_token'] };

var NOTIFY_TO_DEFAULT = 'kwonzihyun@sdmsenior.or.kr';
var SESSION_DAYS = 7;
var PHOTO_FOLDER_NAME = '스마트워크_실습공유사진';
var MAX_PHOTO_BYTES = 8 * 1024 * 1024;

// ------------------------------------------------------------------
// 웹앱 진입점
// ------------------------------------------------------------------
function doGet() {
  return json_({ data: 'ok' });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: { message: '잘못된 요청입니다.' } });
  }
  var admin = isAdmin_(req.token);
  try {
    return json_({ data: handle_(req, admin), admin: admin });
  } catch (err) {
    return json_({ error: { message: err.message, code: err.code || null }, admin: admin });
  }
}

function handle_(req, admin) {
  switch (req.action) {
    case 'select': return select_(req, admin);
    case 'insert': return insert_(req, admin);
    case 'update': return update_(req, admin);
    case 'delete': return delete_(req, admin);
    case 'upsert': return upsert_(req, admin);
    case 'rpc': return rpc_(req);
    case 'upload': return uploadPhoto_(req);
    case 'login': return login_(req.password);
    case 'logout': return logout_(req.token);
    case 'checkAdmin': return admin;
    default: throw new Error('알 수 없는 요청입니다: ' + req.action);
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(message, code) {
  var err = new Error(message);
  if (code) err.code = code;
  throw err;
}

function requireAdmin_(admin) {
  if (!admin) fail_('관리자 로그인이 필요합니다. (로그인이 만료되었다면 관리자 페이지에서 다시 로그인해주세요)', 'auth');
}

function checkTable_(table) {
  if (!SCHEMA[table]) fail_('알 수 없는 시트입니다: ' + table);
}

// ------------------------------------------------------------------
// 시트 읽기/쓰기
// ------------------------------------------------------------------
function getSheet_(table) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(table);
  if (!sh) fail_('시트를 찾을 수 없습니다: ' + table + ' (importFromSupabase 또는 setup을 먼저 실행하세요)');
  return sh;
}

function headerOf_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function parseCell_(type, v) {
  if (v === '' || v === null) return type === 'bool' ? false : null;
  if (type === 'int') return Number(v);
  if (type === 'bool') return v === true || String(v).toUpperCase() === 'TRUE';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd');
  return String(v);
}

function serializeCell_(type, v) {
  if (v === null || v === undefined) return '';
  if (type === 'bool') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

// 시트 전체를 [{...}, ...] 로 읽습니다. _row 는 실제 시트 행 번호입니다.
function readAll_(table) {
  var sh = getSheet_(table);
  var header = headerOf_(sh);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var types = SCHEMA[table];
  var values = sh.getRange(2, 1, last - 1, header.length).getValues();
  var rows = [];
  values.forEach(function (r, i) {
    if (r.join('') === '') return;
    var obj = { _row: i + 2 };
    header.forEach(function (col, c) {
      if (types[col]) obj[col] = parseCell_(types[col], r[c]);
    });
    rows.push(obj);
  });
  return rows;
}

// 텍스트 서식(@)으로 써야 '='로 시작하는 코드가 수식이 되거나 날짜가 자동 변환되지 않습니다.
function writeRow_(sh, rowNum, header, table, obj) {
  var types = SCHEMA[table];
  var values = header.map(function (col) { return types[col] ? serializeCell_(types[col], obj[col]) : ''; });
  sh.getRange(rowNum, 1, 1, header.length).setNumberFormat('@').setValues([values]);
}

function clean_(obj) {
  var out = {};
  Object.keys(obj).forEach(function (k) { if (k !== '_row') out[k] = obj[k]; });
  return out;
}

function matches_(row, filters) {
  return (filters || []).every(function (f) { return String(row[f.col]) === String(f.val); });
}

function pickFields_(table, values, allowed) {
  var types = SCHEMA[table];
  var out = {};
  Object.keys(values || {}).forEach(function (k) {
    if (!types[k] || k === 'id' || k === 'created_at') return;
    if (allowed && allowed.indexOf(k) === -1) return;
    out[k] = values[k];
  });
  return out;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------
// 조회 / 등록 / 수정 / 삭제
// ------------------------------------------------------------------
function select_(req, admin) {
  var table = req.table;
  checkTable_(table);
  if (ADMIN_READ_ONLY[table]) requireAdmin_(admin);

  var rows = readAll_(table).filter(function (r) { return matches_(r, req.filters); });
  if (table === '공지사항' && !admin) rows = rows.filter(function (r) { return r.is_visible; });

  if (req.order) {
    var col = req.order.col, dir = req.order.ascending === false ? -1 : 1;
    rows.sort(function (a, b) {
      var x = a[col], y = b[col];
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x < y ? -1 : 1) * dir;
    });
  }
  if (req.limit) rows = rows.slice(0, req.limit);

  var hidden = admin ? [] : (PRIVATE_FIELDS[table] || []);
  rows = rows.map(function (r) {
    var o = clean_(r);
    hidden.forEach(function (k) { delete o[k]; });
    return o;
  });

  if (req.single) {
    if (!rows.length) fail_('데이터가 없습니다.');
    return rows[0];
  }
  return rows;
}

function insert_(req, admin) {
  var table = req.table;
  checkTable_(table);
  if (!admin && !PUBLIC_INSERT[table]) requireAdmin_(admin);
  var list = Array.isArray(req.values) ? req.values : [req.values];

  var inserted = withLock_(function () {
    var sh = getSheet_(table);
    var header = headerOf_(sh);
    var nextId = readAll_(table).reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0) + 1;
    return list.map(function (values) {
      var obj = pickFields_(table, values, admin ? null : PUBLIC_INSERT[table]);
      obj.id = nextId++;
      if (SCHEMA[table].created_at) obj.created_at = new Date().toISOString();
      if (table === '질문') obj.edit_token = Utilities.getUuid();
      if (table === '공지사항' && obj.is_visible === undefined) obj.is_visible = true;
      if (SCHEMA[table].sort_order && obj.sort_order === undefined) obj.sort_order = 0;
      writeRow_(sh, sh.getLastRow() + 1, header, table, obj);
      return obj;
    });
  });

  if (table === '질문' || table === '의견') {
    inserted.forEach(function (r) { notify_(table, r); });
  }
  // 질문을 쓴 사람에게만 본인 수정용 edit_token 을 돌려주고, 개인정보는 되돌려주지 않습니다.
  return inserted.map(function (r) {
    if (admin || table !== '질문') return r;
    return { id: r.id, content: r.content, created_at: r.created_at, edit_token: r.edit_token };
  });
}

function update_(req, admin) {
  requireAdmin_(admin);
  var table = req.table;
  checkTable_(table);
  var changes = pickFields_(table, req.values, null);
  return withLock_(function () {
    var sh = getSheet_(table);
    var header = headerOf_(sh);
    var updated = [];
    readAll_(table).forEach(function (r) {
      if (!matches_(r, req.filters)) return;
      Object.keys(changes).forEach(function (k) { r[k] = changes[k]; });
      writeRow_(sh, r._row, header, table, r);
      updated.push(clean_(r));
    });
    return updated;
  });
}

function delete_(req, admin) {
  requireAdmin_(admin);
  var table = req.table;
  checkTable_(table);
  if (!req.filters || !req.filters.length) fail_('삭제 조건이 없습니다.');
  return withLock_(function () {
    var targets = readAll_(table).filter(function (r) { return matches_(r, req.filters); });
    if (table === '실습주제') {
      var ids = targets.map(function (t) { return t.id; });
      var inUse = readAll_('실습자료').some(function (i) { return ids.indexOf(i.topic_id) !== -1; });
      if (inUse) fail_('이 주제 안에 항목이 남아있습니다.', '23503');
    }
    deleteRows_(table, targets);
    if (table === '질문') {
      var qids = targets.map(function (t) { return t.id; });
      deleteRows_('답변', readAll_('답변').filter(function (a) { return qids.indexOf(a.question_id) !== -1; }));
    }
    if (table === '실습공유') targets.forEach(function (t) { trashPhoto_(t.image_url); });
    return targets.map(clean_);
  });
}

function deleteRows_(table, rows) {
  var sh = getSheet_(table);
  rows.map(function (r) { return r._row; }).sort(function (a, b) { return b - a; })
    .forEach(function (n) { sh.deleteRow(n); });
}

// 답변처럼 "질문 1개당 1개" 인 데이터: onConflict 열 값이 같은 행이 있으면 수정, 없으면 등록
function upsert_(req, admin) {
  requireAdmin_(admin);
  var table = req.table;
  checkTable_(table);
  var key = req.onConflict;
  var existing = readAll_(table).filter(function (r) { return String(r[key]) === String(req.values[key]); })[0];
  if (existing) return update_({ table: table, values: req.values, filters: [{ col: 'id', val: existing.id }] }, admin);
  return insert_({ table: table, values: req.values }, admin);
}

// 로그인 없는 질문 게시판에서, 글쓴이 브라우저에 저장된 토큰이 일치할 때만 수정/삭제 허용
function rpc_(req) {
  var p = req.params || {};
  if (!p.token) fail_('수정 권한이 없습니다.');
  return withLock_(function () {
    var row = readAll_('질문').filter(function (r) { return r.id === Number(p.q_id) && r.edit_token === p.token; })[0];
    if (!row) return false;
    if (req.fn === 'update_own_question') {
      row.content = String(p.new_content || '');
      var sh = getSheet_('질문');
      writeRow_(sh, row._row, headerOf_(sh), '질문', row);
      return true;
    }
    if (req.fn === 'delete_own_question') {
      deleteRows_('질문', [row]);
      deleteRows_('답변', readAll_('답변').filter(function (a) { return a.question_id === row.id; }));
      return true;
    }
    fail_('알 수 없는 요청입니다: ' + req.fn);
  });
}

// ------------------------------------------------------------------
// 관리자 로그인 (스크립트 속성 ADMIN_PASSWORD 와 비교, 로그인 토큰은 7일 유지)
// ------------------------------------------------------------------
function login_(password) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('ADMIN_PASSWORD');
  if (!expected) fail_('관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았습니다.');

  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('login_fails') || 0);
  if (fails >= 10) fail_('로그인 시도가 너무 많습니다. 10분 뒤에 다시 시도해주세요.');
  if (String(password) !== expected) {
    cache.put('login_fails', String(fails + 1), 600);
    fail_('비밀번호가 올바르지 않습니다.');
  }

  var now = Date.now();
  var all = props.getProperties();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('session_') === 0 && Number(all[k]) < now) props.deleteProperty(k);
  });
  var token = Utilities.getUuid();
  props.setProperty('session_' + token, String(now + SESSION_DAYS * 24 * 3600 * 1000));
  return token;
}

function logout_(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('session_' + token);
  return true;
}

function isAdmin_(token) {
  if (!token) return false;
  var exp = PropertiesService.getScriptProperties().getProperty('session_' + token);
  return !!exp && Number(exp) > Date.now();
}

// ------------------------------------------------------------------
// 실습공유 사진 (구글 드라이브 폴더에 저장, 링크가 있는 사람은 누구나 보기)
// ------------------------------------------------------------------
function photoFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PHOTO_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) { /* 폴더가 삭제된 경우 새로 만듦 */ }
  }
  var folder = DriveApp.createFolder(PHOTO_FOLDER_NAME);
  props.setProperty('PHOTO_FOLDER_ID', folder.getId());
  return folder;
}

function savePhoto_(blob) {
  var file = photoFolder_().createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // 회사(Workspace) 정책으로 외부 공개가 막힌 경우: 같은 도메인 사용자만 볼 수 있음
    file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
  }
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600';
}

function uploadPhoto_(req) {
  if (!/^image\//.test(req.mimeType || '')) fail_('이미지 파일만 올릴 수 있습니다.');
  var bytes = Utilities.base64Decode(req.base64 || '');
  if (bytes.length > MAX_PHOTO_BYTES) fail_('사진 용량이 너무 큽니다.');
  var name = Date.now() + '_' + String(req.name || 'photo').replace(/[^\w.\-가-힣]/g, '_');
  return savePhoto_(Utilities.newBlob(bytes, req.mimeType, name));
}

function trashPhoto_(url) {
  var m = /[?&]id=([\w-]+)/.exec(url || '');
  if (!m) return;
  try { DriveApp.getFileById(m[1]).setTrashed(true); } catch (err) { /* 이미 지워진 파일 */ }
}

// ------------------------------------------------------------------
// 새 질문/의견 이메일 알림 (설정 시트의 admin_email, 비어 있으면 기본 주소)
// ------------------------------------------------------------------
function notify_(table, r) {
  try {
    var settings = readAll_('설정')[0] || {};
    var to = settings.admin_email || NOTIFY_TO_DEFAULT;
    var contact = '\n\n소속: ' + (r.affiliation || '') + '\n이름: ' + (r.name || '') +
      '\n연락처: ' + (r.contact || '') + '\n이메일: ' + (r.email || '');
    var subject, body;
    if (table === '질문') {
      subject = '[스마트워크 강의] 새 질문이 등록되었습니다';
      body = '질문 내용:\n' + r.content + '\n\n개별 답변 요청: ' + (r.wants_answer ? '예' + contact : '아니오');
    } else {
      var hasContact = [r.affiliation, r.name, r.contact, r.email].some(function (v) { return v && String(v).trim() !== ''; });
      subject = '[스마트워크 강의] 새 의견이 등록되었습니다';
      body = '의견 내용:\n' + r.content + (hasContact ? contact : '');
    }
    MailApp.sendEmail({ to: to, subject: subject, body: body });
  } catch (err) {
    console.error('메일 알림 실패: ' + err.message);
  }
}

// ------------------------------------------------------------------
// 최초 설정 / Supabase 데이터 가져오기 (편집기에서 직접 실행)
// ------------------------------------------------------------------

// 없는 시트만 만들고 1행에 열 이름을 넣습니다. 이미 있는 시트는 건드리지 않습니다.
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (table) {
    if (ss.getSheetByName(table)) return;
    var sh = ss.insertSheet(table);
    var cols = Object.keys(SCHEMA[table]);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e8f5e9');
    sh.setFrozenRows(1);
  });
  var blank = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  if (!ss.getSheetByName('설정').getRange(2, 1).getValue()) {
    var sh1 = ss.getSheetByName('설정');
    writeRow_(sh1, 2, headerOf_(sh1), '설정', { id: 1 });
  }
}

var SUPABASE_URL = 'https://gaivwuzeafxeecgcidfr.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaXZ3dXplYWZ4ZWVjZ2NpZGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMTMyNjMsImV4cCI6MjEwMDY4OTI2M30.Nu7pYV9tvqZjReppD7MAzgGaRs2XDmZ_xmEQ5zvnUJA';

// Supabase의 모든 테이블을 같은 이름의 시트로 복사합니다. (시트 내용을 덮어씀 - 옮길 때 한 번만 실행)
// 실습공유 사진은 Supabase Storage에서 내려받아 드라이브 폴더로 옮기고 주소를 바꿉니다.
function importFromSupabase() {
  setup();
  var serviceKey = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
  var key = serviceKey || SUPABASE_ANON_KEY;

  Object.keys(SCHEMA).forEach(function (table) {
    if (table === '의견' && !serviceKey) {
      console.log('의견: SUPABASE_SERVICE_KEY가 없어 건너뜀 (관리자만 읽을 수 있는 테이블)');
      return;
    }
    var res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent(table) + '?select=*&order=id.asc', {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      console.log(table + ': 가져오기 실패 ' + res.getContentText());
      return;
    }
    var rows = JSON.parse(res.getContentText());

    rows.forEach(function (r) {
      if (table === '질문' && !r.edit_token) r.edit_token = Utilities.getUuid();
      if (table === '실습공유' && r.image_url && r.image_url.indexOf(SUPABASE_URL) === 0) {
        try {
          var blob = UrlFetchApp.fetch(r.image_url).getBlob().setName(r.image_url.split('/').pop());
          r.image_url = savePhoto_(blob);
        } catch (err) {
          console.log('사진 복사 실패 (' + r.image_url + '): ' + err.message);
        }
      }
    });

    var sh = getSheet_(table);
    var header = headerOf_(sh);
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    rows.forEach(function (r, i) { writeRow_(sh, i + 2, header, table, r); });
    console.log(table + ': ' + rows.length + '행 복사');
  });
}
