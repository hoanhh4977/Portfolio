/* Dải ảnh "vision": chỉ chạy khi đang ở gần màn hình (đỡ tốn máy). */
(function () {
  var v = document.querySelector('.vision');
  if (!v) return;
  v.classList.add('paused');
  if (!('IntersectionObserver' in window)) { v.classList.remove('paused'); return; }
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { v.classList.toggle('paused', !e.isIntersecting); });
  }, { rootMargin: '150px' }).observe(v);
})();
