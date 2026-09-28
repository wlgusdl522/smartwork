// 구글 스프레드시트(Apps Script 웹앱) 연결 정보
// Apps Script에서 배포 > 새 배포 > 웹 앱으로 배포한 뒤 나온 URL(…/exec)을 아래에 넣으세요.
// 사용법은 예전 Supabase와 같습니다: db.from('공지사항').select('*').order('created_at', { ascending: false })
// 결과는 항상 { data, error } 형태로 돌아옵니다.
var SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbz42FnPBxaWUPV7625yt1Jy7omwT6UBoFTZdbUkTtddTPddTVfQ3oTbNeycIfob1Iz9/exec';
var ADMIN_TOKEN_KEY = 'sw_admin_token';

function getAdminToken() {
  try { return localStorage.getItem(ADMIN_TOKEN_KEY); } catch (e) { return null; }
}
function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (e) { /* 저장소를 쓸 수 없는 브라우저 */ }
}

// Content-Type을 text/plain으로 보내야 브라우저가 사전 요청(CORS preflight) 없이 Apps Script로 바로 보냅니다.
function callSheetApi(payload) {
  var token = getAdminToken();
  payload.token = token;
  return fetch(SHEET_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).then(function (r) {
    return r.json();
  }).then(function (res) {
    if (token && res.admin === false) setAdminToken(null); // 로그인 만료
    return { data: res.data === undefined ? null : res.data, error: res.error || null };
  }).catch(function (err) {
    return { data: null, error: { message: '서버에 연결하지 못했습니다 (' + err.message + ')' } };
  });
}

function SheetQuery(table) {
  this.req = { action: 'select', table: table, filters: [] };
}
SheetQuery.prototype.select = function () { return this; }; // insert(...).select() 도 등록된 행을 돌려줌
SheetQuery.prototype.eq = function (col, val) { this.req.filters.push({ col: col, val: val }); return this; };
SheetQuery.prototype.order = function (col, opts) {
  this.req.order = { col: col, ascending: !(opts && opts.ascending === false) };
  return this;
};
SheetQuery.prototype.limit = function (n) { this.req.limit = n; return this; };
SheetQuery.prototype.single = function () { this.req.single = true; return this; };
SheetQuery.prototype.insert = function (values) { this.req.action = 'insert'; this.req.values = values; return this; };
SheetQuery.prototype.update = function (values) { this.req.action = 'update'; this.req.values = values; return this; };
SheetQuery.prototype.delete = function () { this.req.action = 'delete'; return this; };
SheetQuery.prototype.upsert = function (values, opts) {
  this.req.action = 'upsert';
  this.req.values = values;
  this.req.onConflict = opts && opts.onConflict;
  return this;
};
SheetQuery.prototype.then = function (resolve, reject) {
  return callSheetApi(this.req).then(resolve, reject);
};

// 사진을 긴 변 1600px JPEG로 줄여서 보냅니다 (휴대폰 사진은 수 MB라 그대로 보내면 느림)
function resizeImage(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = function () { reject(new Error('이미지를 읽을 수 없습니다.')); };
    img.src = URL.createObjectURL(file);
  });
}

var db = {
  from: function (table) { return new SheetQuery(table); },
  rpc: function (fn, params) { return callSheetApi({ action: 'rpc', fn: fn, params: params }); },

  // 성공하면 사진 주소(문자열)를 돌려주고, 실패하면 Error를 던집니다.
  uploadImage: function (file) {
    return resizeImage(file).then(function (base64) {
      var name = file.name.replace(/\.\w+$/, '') + '.jpg';
      return callSheetApi({ action: 'upload', name: name, mimeType: 'image/jpeg', base64: base64 });
    }).then(function (res) {
      if (res.error) throw new Error(res.error.message);
      return res.data;
    });
  },

  login: function (password) {
    return callSheetApi({ action: 'login', password: password }).then(function (res) {
      if (!res.error) setAdminToken(res.data);
      return res;
    });
  },
  logout: function () {
    return callSheetApi({ action: 'logout' }).then(function (res) {
      setAdminToken(null);
      return res;
    });
  },
  // 서버에 물어봐서 로그인이 아직 유효한지 확인 (관리자 페이지용)
  checkAdmin: function () {
    if (!getAdminToken()) return Promise.resolve(false);
    return callSheetApi({ action: 'checkAdmin' }).then(function (res) { return res.data === true; });
  }
};
