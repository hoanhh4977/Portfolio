/* Màn hình tải: đếm 0 → 100 theo tiến độ tải thật (phông chữ, trang, video hero), tối thiểu ~1,8 giây,
   tối đa ~7 giây. Xong thì mở hai cánh đen ra. Thêm ?noloader vào địa chỉ để bỏ qua. */
(function () {
  var html = document.documentElement;
  var L = document.getElementById('loader');
  function finish() {
    html.classList.remove('loading');
    if (L && L.parentNode) L.parentNode.removeChild(L);
    window.dispatchEvent(new Event('resize'));
  }
  if (!L) { html.classList.remove('loading'); return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || location.search.indexOf('noloader') > -1) { finish(); return; }

  var num = document.getElementById('ld-num');
  var fill = L.querySelector('.ld-line i');
  var MIN = 1800, MAX = 7000;
  var done = { fonts: false, load: false, media: false };

  /* các nguồn tiến độ thật */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { done.fonts = true; });
  else done.fonts = true;

  if (document.readyState === 'complete') done.load = true;
  else window.addEventListener('load', function () { done.load = true; });

  var video = document.querySelector('.hero video');
  if (!video || video.readyState >= 3) done.media = true;
  else {
    var m = function () { done.media = true; };
    video.addEventListener('canplay', m, { once: true });
    video.addEventListener('loadeddata', m, { once: true });
    video.addEventListener('error', m, { once: true });
  }

  var start = performance.now(), shown = 0, last = -1, opened = false;

  function open() {
    if (opened) return;
    opened = true;
    L.classList.add('open');            // hai cánh đen trượt đi
    html.classList.remove('loading');   // hero phóng vào và chữ bắt đầu hiện
    setTimeout(finish, 1500);
  }

  function tick(now) {
    var el = Math.max(0, now - start);
    var ready = done.fonts && done.load && done.media && el >= MIN;
    var target = (ready || el >= MAX) ? 100 : Math.min(92, 92 * (1 - Math.exp(-el / 1100)));
    shown += Math.max((target - shown) * 0.1, target > shown ? 0.18 : 0);
    if (shown > target) shown = target;
    var n = Math.min(100, Math.floor(shown + 0.0001));
    if (n !== last) {
      last = n;
      num.textContent = n;
      fill.style.transform = 'scaleX(' + (n / 100) + ')';
    }
    if (n >= 100) { setTimeout(open, 380); return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* an toàn: nếu có lỗi gì khiến vòng đếm dừng, vẫn mở trang sau MAX + 1,5 giây */
  setTimeout(open, MAX + 1500);
})();
