/* Chuyển ngôn ngữ EN / VI. Bản dịch nằm trong lang-en.js; nội dung gốc (tiếng Việt) giữ ở HTML
   nên tắt JS hoặc chọn VI vẫn ra đúng bản gốc. Lựa chọn được nhớ trong trình duyệt. Thêm ?lang=en để mở thẳng bản tiếng Anh. */
(function () {
  var KEY = 'portfolio-lang';
  var EN = window.I18N_EN || {}, ATTR = window.I18N_ATTR || {}, TXT = window.I18N_TXT || {};
  var ATTRS = ['alt', 'aria-label', 'title', 'data-eyebrow'];
  var LETTER = /[A-Za-zÀ-ỹ]/;
  var lang = 'vi';
  try { if (localStorage.getItem(KEY) === 'en') lang = 'en'; } catch (e) {}
  var q = location.search.match(/[?&]lang=(en|vi)/);
  if (q) lang = q[1];

  var store = new WeakMap();
  function st(el) { var s = store.get(el); if (!s) { s = {}; store.set(el, s); } return s; }
  function textNode(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var c = el.childNodes[i];
      if (c.nodeType === 3 && LETTER.test(c.nodeValue)) return c;
    }
    return null;
  }

  function render(root, to) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-i18n]'), function (el) {
      var s = st(el), id = el.getAttribute('data-i18n');
      if (s.h === undefined) s.h = el.innerHTML;
      var next = to === 'en' && EN[id] != null ? EN[id] : s.h;
      if (el.innerHTML !== next) el.innerHTML = next;
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-i18nt]'), function (el) {
      var s = st(el), id = el.getAttribute('data-i18nt');
      if (!s.n) { var n = textNode(el); if (!n) return; s.n = n; s.v = n.nodeValue; }
      if (to === 'en' && EN[id] != null) {
        var m = s.v.match(/^(\s*)([\s\S]*?)(\s*)$/);
        s.n.nodeValue = m[1] + EN[id] + m[3];
      } else s.n.nodeValue = s.v;
    });
    Array.prototype.forEach.call(root.querySelectorAll('[alt],[aria-label],[title],[data-eyebrow]'), function (el) {
      var s = st(el); s.a = s.a || {};
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        if (!(a in s.a)) s.a[a] = el.getAttribute(a);
        var en = ATTR[s.a[a]];
        el.setAttribute(a, to === 'en' && en ? en : s.a[a]);
      });
    });
  }

  /* nút EN / VI cố định ở góc dưới bên phải */
  var box = document.createElement('div');
  box.className = 'lang-toggle';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Language');
  box.innerHTML = '<button type="button" data-l="en">EN</button><button type="button" data-l="vi">VI</button>';
  document.body.appendChild(box);

  function syncButtons() {
    Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-l') === lang ? 'true' : 'false'); });
  }

  function set(next, quiet) {
    lang = next;
    document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    render(document, lang);
    syncButtons();
    if (!quiet) window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  box.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && b.getAttribute('data-l') !== lang) set(b.getAttribute('data-l'));
  });

  window.I18N = {
    lang: function () { return lang; },
    t: function (s) { return lang === 'en' && TXT[s] ? TXT[s] : s; },
    applyTo: function (root) { render(root, lang); }
  };

  document.documentElement.lang = lang;
  render(document, lang);
  syncButtons();
})();
