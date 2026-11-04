/* Băng chuyền thẻ dự án (coverflow) + cửa sổ chi tiết. Không dùng thư viện. */
(function () {
  var root = document.getElementById('proj-carousel');
  if (!root) return;
  var cards = Array.prototype.slice.call(root.querySelectorAll('.pcard'));
  var N = cards.length;
  var prevBtn = document.getElementById('car-prev');
  var nextBtn = document.getElementById('car-next');
  var countEl = document.getElementById('car-count');
  var dotsEl = document.getElementById('car-dots');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var pos = 0, target = 0, raf = 0;
  var dragging = false, moved = false, startX = 0, startPos = 0, lastX = 0, lastT = 0, vel = 0, suppressClick = false;

  function spacing() { return root.clientWidth < 700 ? 188 : 300; }
  function clampIdx(v) { return Math.max(0, Math.min(v, N - 1)); }

  /* chấm chọn nhanh */
  var dots = [];
  for (var i = 0; i < N; i++) {
    (function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', (window.I18N ? window.I18N.t('Dự án ') : 'Dự án ') + (k + 1));
      b.addEventListener('click', function () { go(k); });
      dotsEl.appendChild(b); dots.push(b);
    })(i);
  }

  var lastActive = -1;
  function render() {
    var sp = spacing();
    for (var i = 0; i < N; i++) {
      var d = i - pos, ad = Math.abs(d);
      var rot = -Math.sign(d) * Math.min(ad, 1) * 38;
      var z = -Math.min(ad, 2) * 150;
      var op = ad <= 1 ? 1 - ad * 0.12 : Math.max(0, 0.88 - (ad - 1) * 0.45);
      var c = cards[i];
      c.style.transform = 'translate3d(' + (d * sp).toFixed(1) + 'px,0,' + z.toFixed(1) + 'px) rotateY(' + rot.toFixed(2) + 'deg)';
      c.style.opacity = op.toFixed(3);
      c.style.zIndex = String(Math.round(100 - ad * 10));
      c.style.visibility = ad > 2.6 ? 'hidden' : 'visible';
      c.style.setProperty('--dim', (Math.min(ad, 1) * 0.5).toFixed(3));
      var active = ad < 0.5;
      if (active !== c.classList.contains('is-active')) {
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-hidden', active ? 'false' : 'true');
        /* chỉ thẻ đang chọn mới nhận phím Tab */
        Array.prototype.forEach.call(c.querySelectorAll('a,button'), function (el) { el.tabIndex = active ? 0 : -1; });
      }
    }
    var cur = clampIdx(Math.round(pos));
    if (cur !== lastActive) {
      lastActive = cur;
      countEl.textContent = (cur + 1) + ' / ' + N;
      dots.forEach(function (d, k) { d.setAttribute('aria-selected', k === cur ? 'true' : 'false'); });
      prevBtn.disabled = cur === 0; nextBtn.disabled = cur === N - 1;
      prevBtn.style.opacity = cur === 0 ? 0.35 : 1; nextBtn.style.opacity = cur === N - 1 ? 0.35 : 1;
    }
  }

  function animate() {
    cancelAnimationFrame(raf);
    if (reduce) { pos = target; render(); return; }
    (function step() {
      pos += (target - pos) * 0.14;
      if (Math.abs(target - pos) < 0.002) { pos = target; render(); raf = 0; return; }
      render(); raf = requestAnimationFrame(step);
    })();
  }

  function go(i) { target = clampIdx(Math.round(i)); animate(); }

  prevBtn.addEventListener('click', function () { go(target - 1); });
  nextBtn.addEventListener('click', function () { go(target + 1); });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(target + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(target - 1); }
  });

  /* kéo / vuốt */
  root.addEventListener('dragstart', function (e) { e.preventDefault(); });
  root.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; moved = false; startX = lastX = e.clientX; startPos = pos; vel = 0; lastT = performance.now();
    cancelAnimationFrame(raf);
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (!moved) { if (Math.abs(dx) < 6) return; moved = true; root.classList.add('dragging'); }
    var sp = spacing(), now = performance.now(), dt = Math.max(1, now - lastT);
    vel = vel * 0.8 + ((lastX - e.clientX) / sp / dt) * 0.2;
    lastX = e.clientX; lastT = now;
    var p = startPos - dx / sp;
    if (p < 0) p *= 0.35;
    if (p > N - 1) p = (N - 1) + (p - (N - 1)) * 0.35;
    pos = p; render();
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false; root.classList.remove('dragging');
    if (moved) {
      suppressClick = true; setTimeout(function () { suppressClick = false; }, 60);
      var inertia = Math.max(-2, Math.min(2, vel * 250));
      go(pos + inertia);
    }
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  /* bấm vào thẻ bên cạnh thì đưa nó vào giữa; chặn bấm nhầm sau khi kéo */
  root.addEventListener('click', function (e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    var card = e.target.closest('.pcard');
    if (card && !card.classList.contains('is-active')) { e.preventDefault(); go(+card.getAttribute('data-i')); }
  }, true);

  /* vuốt ngang bằng touchpad (hai ngón) hoặc Shift + con lăn: kéo băng chuyền theo ngón tay, thả ra thì khớp vào thẻ gần nhất.
     Cuộn dọc không bị chặn nên vẫn lướt trang bình thường khi con trỏ đang ở trên băng chuyền. */
  var wheelTimer = 0;
  root.addEventListener('wheel', function (e) {
    var ax = Math.abs(e.deltaX), ay = Math.abs(e.deltaY);
    if (ax < 2 || ax <= ay) return;
    e.preventDefault();
    cancelAnimationFrame(raf);
    var p = pos + e.deltaX / (spacing() * 1.1);
    if (p < 0) p *= 0.5;
    if (p > N - 1) p = (N - 1) + (p - (N - 1)) * 0.5;
    pos = p; render();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { go(pos); }, 120);
  }, { passive: false });

  window.addEventListener('resize', render);

  /* ---------- cửa sổ chi tiết ---------- */
  var dlg = document.getElementById('pdlg');
  var content = document.getElementById('pd-content');
  var opener = null;
  function openDetail(id, from) {
    var tpl = document.getElementById('tpl-' + id);
    if (!tpl || !dlg) return;
    content.innerHTML = '';
    content.appendChild(tpl.content.cloneNode(true));
    if (window.I18N) window.I18N.applyTo(content);
    opener = from || null;
    document.documentElement.classList.add('dlg-open');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.scrollTop = 0;
  }
  function closeDetail() { if (dlg.open) dlg.close(); }
  if (dlg) {
    dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('dlg-open');
      if (opener && opener.focus) opener.focus();
    });
    dlg.querySelector('.pd-close').addEventListener('click', closeDetail);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDetail(); });
  }
  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-open]');
    if (btn) openDetail(btn.getAttribute('data-open'), btn);
  });

  render();

  /* video YouTube: chỉ nạp khung phát khi người xem bấm */
  Array.prototype.forEach.call(document.querySelectorAll('.sing-video'), function (box) {
    var btn = box.querySelector('.sing-play');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + box.getAttribute('data-yt') + '?autoplay=1&rel=0';
      f.title = 'Video mình hát';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      box.appendChild(f);
      btn.remove();
    });
  });
})();
