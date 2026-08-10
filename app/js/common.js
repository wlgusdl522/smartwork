function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function copyText(text, btnEl) {
  var doCopy = function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  };
  doCopy().then(function () {
    showToast('복사되었습니다!');
    if (btnEl) {
      var original = btnEl.textContent;
      btnEl.textContent = '복사됨 ✓';
      setTimeout(function () { btnEl.textContent = original; }, 1500);
    }
  }).catch(function () {
    showToast('복사에 실패했습니다. 직접 선택해서 복사해주세요.');
  });
}

function getIsAdmin() {
  return sb.auth.getSession().then(function (res) {
    return !!(res.data && res.data.session);
  });
}

function applyActiveNav() {
  var page = document.body.getAttribute('data-page') || 'home';
  document.querySelectorAll('.nav-menu a[data-page]').forEach(function (a) {
    if (a.getAttribute('data-page') === page) a.classList.add('active');
  });
}

function fillBrand(settings) {
  var titleEl = document.getElementById('navBrandTitle');
  var subEl = document.getElementById('navBrandSub');
  var footerEl = document.getElementById('footerContact');
  if (settings) {
    if (titleEl && settings.course_name) titleEl.textContent = settings.course_name;
    if (subEl && settings.instructor_name) subEl.textContent = settings.instructor_name + ' 강사';
    if (footerEl) {
      var parts = [];
      if (settings.instructor_name) parts.push('이름: ' + settings.instructor_name);
      if (settings.instructor_contact) parts.push('연락처: ' + settings.instructor_contact);
      if (settings.admin_email) parts.push('이메일: ' + settings.admin_email);
      footerEl.textContent = parts.join(' · ');
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  applyActiveNav();
  sb.from('설정').select('*').eq('id', 1).single().then(function (res) {
    if (res.data) fillBrand(res.data);
  });
});
