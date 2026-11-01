/* Hero: đổi kiểu thanh điều hướng khi cuộn qua hero, và xử lý video nền. */
(function () {
  var nav = document.querySelector('.nav');
  var hero = document.querySelector('.hero');
  if (!nav || !hero) return;

  var ticking = false;
  function update() {
    ticking = false;
    nav.classList.toggle('solid', hero.getBoundingClientRect().bottom < 90);
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

/* video mờ dưới hero: chỉ chạy khi đang ở gần màn hình, đỡ nặng máy */
(function () {
  var v = document.querySelector('.bridge-video');
  if (!v) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { v.pause(); return; }
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
  }, { rootMargin: '200px' }).observe(v);
})();

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
