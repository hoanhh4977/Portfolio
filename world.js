/* Chế độ cuộn theo chặng: nền cố định đổi màu theo chặng, các khối "bay" vào khi cuộn,
   đường bay + bộ đếm chặng. Không dùng thư viện, không cần video.
   Viết để nhẹ: đo kích thước một lần (không đọc bố cục khi cuộn), chỉ đổi opacity/transform
   (chạy trên GPU) và chỉ ghi vào DOM khi giá trị thật sự đổi. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var on = !reduce;
  if (location.search.indexOf('classic') > -1) on = false;

  /* l = màu nền chế độ sáng, d = màu nền chế độ tối (mỗi chặng một cặp: trên, dưới) */
  var STAGES = [
    { sel: '.hero', label: 'Khởi hành', l: ['#f4f4f4', '#e3ecf9'], d: ['#0a0a0a', '#0a0a0a'] },
    { sel: '#about', label: 'Giới thiệu', l: ['#f2f6fc', '#dde8f7'], d: ['#0a0a0a', '#0c0c0d'] },
    { sel: '#me', label: 'Về mình', l: ['#eef3fb', '#d6e4f6'], d: ['#0a0a0a', '#0d0d0f'] },
    { sel: '#journey', label: 'Hành trình', l: ['#ebf1fa', '#d2e1f4'], d: ['#0a0a0a', '#0e0e11'] },
    { sel: '#projects', label: 'Dự án', l: ['#e9f0fa', '#cfe0f4'], d: ['#0a0a0a', '#0e0e10'] },
    { sel: '#skills', label: 'Kỹ năng', l: ['#e4edf8', '#c6daf1'], d: ['#0a0a0a', '#0f0f12'] },
    { sel: '#contact', label: 'Liên hệ', l: ['#d6e4f6', '#a9c4e8'], d: ['#0a0a0a', '#101014'] }
  ];
  var els = STAGES.map(function (s) { return document.querySelector(s.sel); });
  if (els.some(function (e) { return !e; })) return; // thiếu phần nào thì không bật

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- dựng giao diện phụ ---------- */
  var bg = document.createElement('div');
  bg.id = 'world-bg';
  var html = '';
  STAGES.forEach(function (s) {
    html += '<span class="sbg" style="--lc1:' + s.l[0] + ';--lc2:' + s.l[1] + ';--dc1:' + s.d[0] + ';--dc2:' + s.d[1] + '"></span>';
  });
  bg.innerHTML = html + '<span class="glow g1"></span><span class="glow g2"></span><span class="layer l1"></span><span class="layer l2"></span><span class="layer l3"></span>';
  var sbgs = bg.querySelectorAll('.sbg');
  var lay = bg.querySelectorAll('.layer');
  var g1 = bg.querySelector('.g1'), g2 = bg.querySelector('.g2');

  var bar = document.createElement('div');
  bar.className = 'fly-bar';
  bar.innerHTML = '<i></i>';
  var barFill = bar.firstChild;

  var route = document.createElement('nav');
  route.className = 'route';
  route.setAttribute('aria-label', 'Các chặng');
  var ol = document.createElement('ol');
  STAGES.forEach(function (s, i) {
    var li = document.createElement('li');
    li.innerHTML = '<span>' + s.label + '</span><button type="button" aria-label="Đến chặng ' + (i + 1) + ': ' + s.label + '"></button>';
    li.querySelector('button').addEventListener('click', function () {
      els[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    ol.appendChild(li);
  });
  route.appendChild(ol);
  var items = route.querySelectorAll('li');

  var counter = document.createElement('div');
  counter.className = 'counter';
  counter.setAttribute('aria-hidden', 'true');
  var hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'Cuộn để bay tiếp ↓';
  [bg, bar, route, counter, hint].forEach(function (e) { document.body.appendChild(e); });

  /* các lớp ảnh nền theo chặng (đã gắn sẵn trong HTML) */
  var BGLAYERS = [['.bridge', '#about'], ['.me-bg', '#me'], ['.journey-bg', '#journey'], ['.skills-bg', '#skills']]
    .map(function (p) {
      var el = document.querySelector(p[0]), sec = document.querySelector(p[1]);
      return el && sec ? { el: el, si: els.indexOf(sec), o: null, v: el.querySelector('video') } : null;
    }).filter(Boolean);

  /* ---------- đo kích thước một lần (không đo lại khi cuộn) ---------- */
  var M = [];
  function measure() {
    var sy = window.scrollY;
    M = els.map(function (sec) {
      var r = sec.getBoundingClientRect(), top = r.top + sy, kids = [];
      Array.prototype.forEach.call(sec.children, function (c) {
        if (c.hasAttribute('data-static')) return;
        kids.push({ el: c, top: top + c.offsetTop, h: c.offsetHeight, tf: '', op: '' });
      });
      return { top: top, h: r.height, kids: kids };
    });
  }

  function clearInline() {
    M.forEach(function (m) { m.kids.forEach(function (k) { k.el.style.transform = ''; k.el.style.opacity = ''; k.tf = k.op = ''; }); });
  }

  function set(v) {
    on = v;
    document.body.classList.toggle('world', on);
    document.documentElement.classList.toggle('world-on', on);
    els.forEach(function (e) { e.classList.toggle('stage', on); });
    measure();
    if (!on) clearInline(); else request();
  }

  /* ---------- mỗi khung hình ---------- */
  var ticking = false, lastIdx = -1, lastHint = null;
  var sbgO = [];
  var vh = window.innerHeight;

  function frame() {
    ticking = false;
    if (!on || !M.length) return;
    var sy = window.scrollY, mid = sy + vh * 0.5;

    /* chặng hiện tại và vị trí liên tục (0..6) */
    var s = 0;
    for (var i = 0; i < M.length; i++) {
      if (M[i].top <= mid) s = i + clamp((mid - M[i].top) / Math.max(M[i].h, 1));
    }
    var idx = Math.min(Math.floor(s), STAGES.length - 1);
    var f = s - idx;
    var nxt = Math.min(idx + 1, STAGES.length - 1);
    var t = f * f * (3 - 2 * f);

    /* nền: chỉ đổi opacity của hai lớp màu gần nhất (chạy trên GPU, không vẽ lại) */
    for (var b = 0; b < sbgs.length; b++) {
      var o = b === idx ? (idx === nxt ? 1 : 1 - t) : (b === nxt ? t : 0);
      o = Math.round(o * 500) / 500;
      if (sbgO[b] !== o) { sbgO[b] = o; sbgs[b].style.opacity = o; }
    }

    /* cảm giác "bay": các lớp sao phóng to dần theo độ sâu */
    lay[0].style.transform = 'translate3d(0,' + (-s * 40).toFixed(1) + 'px,0) scale(' + (1 + s * 0.22).toFixed(3) + ')';
    lay[1].style.transform = 'translate3d(0,' + (-s * 90).toFixed(1) + 'px,0) scale(' + (1 + s * 0.45).toFixed(3) + ')';
    lay[2].style.transform = 'translate3d(0,' + (-s * 160).toFixed(1) + 'px,0) scale(' + (1 + s * 0.8).toFixed(3) + ')';
    g1.style.transform = 'translate3d(' + (s * 8).toFixed(2) + 'vmax,' + (s * 6).toFixed(2) + 'vmax,0)';
    g2.style.transform = 'translate3d(' + (-s * 7).toFixed(2) + 'vmax,' + (-s * 8).toFixed(2) + 'vmax,0)';

    /* tiến độ (transform, không đổi kích thước) */
    var max = Math.max(document.documentElement.scrollHeight - vh, 1);
    barFill.style.transform = 'scaleX(' + clamp(sy / max).toFixed(4) + ')';

    /* đường bay, bộ đếm, gợi ý: chỉ ghi khi đổi chặng */
    if (idx !== lastIdx) {
      lastIdx = idx;
      for (var k = 0; k < items.length; k++) items[k].classList.toggle('active', k === idx);
      route.classList.toggle('dark', idx === 0 || idx === STAGES.length - 1);
      counter.innerHTML = '<b>' + pad(idx + 1) + '</b> / ' + pad(STAGES.length) + ' · ' + STAGES[idx].label;
    }
    var gone = sy > 60;
    if (gone !== lastHint) { lastHint = gone; hint.classList.toggle('gone', gone); }

    /* video nền chỉ chạy khi chặng của nó ở gần màn hình */
    for (var L = 0; L < BGLAYERS.length; L++) {
      var lg = BGLAYERS[L];
      if (!lg.v) continue;
      var m = M[lg.si];
      var near = (m.top - sy) < vh * 1.5 && (m.top + m.h - sy) > -vh * 0.5;
      if (near !== lg.o) {
        lg.o = near;
        if (near) { var pr = lg.v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else lg.v.pause();
      }
    }

    /* mỗi khối con của chặng lao vào khi tới gần và lướt qua khi rời đi */
    for (var a = 0; a < M.length; a++) {
      var kids = M[a].kids;
      for (var j = 0; j < kids.length; j++) {
        var kd = kids[j];
        var cTop = kd.top - sy, cBot = cTop + kd.h;
        var enter = clamp((vh * 0.94 - cTop) / (vh * 0.32));
        var leave = clamp((vh * 0.2 - cBot) / (vh * 0.25));
        var e = enter * enter * (3 - 2 * enter);
        var scale = (0.9 + 0.1 * e) * (1 + 0.08 * leave);
        var y = (1 - e) * 70 - leave * 30;
        var tf = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
        var opv = (e * (1 - leave * 0.9)).toFixed(3);
        if (tf !== kd.tf) { kd.tf = tf; kd.el.style.transform = tf; }
        if (opv !== kd.op) { kd.op = opv; kd.el.style.opacity = opv; }
      }
    }
  }

  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  var mt = 0;
  function remeasure() {
    if (mt) return;
    mt = requestAnimationFrame(function () { mt = 0; vh = window.innerHeight; if (on) { measure(); request(); } });
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  if ('ResizeObserver' in window) {
    var main = document.querySelector('main');
    if (main) new ResizeObserver(remeasure).observe(main);
  }



  set(on);
})();
