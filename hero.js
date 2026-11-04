/* Hero: đổi kiểu thanh điều hướng khi cuộn qua hero, và xử lý video nền. */
(function () {
  var nav = document.querySelector('.nav');
  var hero = document.querySelector('.hero');
  if (!nav || !hero) return;

  var ticking = false;
  function update() {
    ticking = false;
    nav.classList.toggle('solid', window.scrollY > 40);
  }
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();

  var video = hero.querySelector('video');
  if (!video) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    video.removeAttribute('autoplay');
    video.pause();
    return;
  }
  /* có video chạy được thì bỏ nền gradient dự phòng */
  function ready() { hero.classList.remove('no-video'); }
  video.addEventListener('playing', ready);
  video.addEventListener('timeupdate', ready, { once: true });
  if (!video.paused && video.currentTime > 0) ready();
  var p = video.play();
  if (p && p.catch) p.catch(function () {});
})();

/* video mờ dưới hero do world.js bật/tắt theo độ hiện của lớp */

/* journey-progress: đường giữa của dòng thời gian sáng dần theo lúc cuộn */
(function () {
  var ol = document.querySelector('.journey-stage .journey');
  if (!ol) return;
  var t = false;
  function upd() {
    t = false;
    var r = ol.getBoundingClientRect(), vh = window.innerHeight;
    var p = (vh * 0.62 - r.top) / Math.max(r.height, 1);
    ol.style.setProperty('--jp', Math.max(0, Math.min(1, p)).toFixed(3));
  }
  function req() { if (!t) { t = true; requestAnimationFrame(upd); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  upd();
})();

/* hero-pause: dừng video hero khi đã cuộn khỏi hero (đỡ giải mã video khi xem phần khác) */
(function () {
  var hero = document.querySelector('.hero'), v = hero && hero.querySelector('video');
  if (!v || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
  }, { threshold: 0.02 }).observe(hero);
})();

/* menu điện thoại: mở/đóng bằng nút ☰; đóng khi chọn mục, bấm ra ngoài hoặc nhấn Esc */
(function () {
  var nav = document.querySelector('.nav'), btn = nav && nav.querySelector('.nav-toggle');
  if (!btn) return;
  function set(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(!nav.classList.contains('open')); });
  nav.querySelectorAll('nav a, .nav-cta').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) set(false); });
})();

/* scroll-spy: làm sáng mục menu của phần đang xem */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav nav a[href^="#"]'));
  if (!links.length) return;
  var items = links.map(function (a) {
    var id = a.getAttribute('href');
    var el = id === '#top' ? document.querySelector('.hero') : document.querySelector(id);
    return el ? { a: a, el: el } : null;
  }).filter(Boolean);
  var t = false, last = null;
  function upd() {
    t = false;
    var line = window.innerHeight * 0.4, cur = items[0];
    items.forEach(function (it) { if (it.el.getBoundingClientRect().top <= line) cur = it; });
    if (cur !== last) { last = cur; items.forEach(function (it) { it.a.classList.toggle('active', it === cur); }); }
  }
  function req() { if (!t) { t = true; requestAnimationFrame(upd); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  upd();
})();
