/* Chế độ cuộn theo chặng: nền cố định đổi màu theo chặng, các khối "bay" vào khi cuộn,
   đường bay + bộ đếm chặng. Không dùng thư viện, không cần video. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var on = !reduce;
  if (location.search.indexOf('classic') > -1) on = false;

  var STAGES = [
    { sel: '.hero', label: 'Khởi hành', c: ['#f4f4f4', '#e3ecf9'], g: ['#78aae6', '#aecdf3'] },
    { sel: '#about', label: 'Giới thiệu', c: ['#f2f6fc', '#dde8f7'], g: ['#9bbfee', '#c7dbf6'] },
    { sel: '#me', label: 'Về mình', c: ['#eef3fb', '#d6e4f6'], g: ['#7fa8dd', '#b9d2f1'] },
    { sel: '#journey', label: 'Hành trình', c: ['#ebf1fa', '#d2e1f4'], g: ['#76a0d9', '#b2cdee'] },
    { sel: '#projects', label: 'Dự án', c: ['#e9f0fa', '#cfe0f4'], g: ['#6c9bd6', '#a6c6ec'] },
    { sel: '#skills', label: 'Kỹ năng', c: ['#e4edf8', '#c6daf1'], g: ['#5b8ccb', '#9fc0e8'] },
    { sel: '#contact', label: 'Liên hệ', c: ['#d6e4f6', '#a9c4e8'], g: ['#2d5aa6', '#6d94d1'] }
  ];
  /* bảng màu nền cho chế độ tối, cùng thứ tự với STAGES */
  var DARK = [
    { c: ['#0a0a0a', '#0a0a0a'], g: ['#16233a', '#101826'] },
    { c: ['#0a0a0a', '#0c0c0d'], g: ['#16233a', '#121b2b'] },
    { c: ['#0a0a0a', '#0d0d0f'], g: ['#1a2a44', '#131d30'] },
    { c: ['#0a0a0a', '#0e0e11'], g: ['#1b2c48', '#142038'] },
    { c: ['#0a0a0a', '#0e0e10'], g: ['#1a2a44', '#141f35'] },
    { c: ['#0a0a0a', '#0f0f12'], g: ['#1d2f4d', '#16233b'] },
    { c: ['#0a0a0a', '#101014'], g: ['#223657', '#182742'] }
  ];
  var els = STAGES.map(function (s) { return document.querySelector(s.sel); });
  if (els.some(function (e) { return !e; })) return; // thiếu phần nào thì không bật

  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')';
  }
  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  /* dựng giao diện phụ */
  var bg = document.createElement('div');
  bg.id = 'world-bg';
  bg.innerHTML = '<span class="glow g1"></span><span class="glow g2"></span><span class="layer l1"></span><span class="layer l2"></span><span class="layer l3"></span>';
  var bar = document.createElement('div');
  bar.className = 'fly-bar';
  bar.innerHTML = '<i></i>';
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
  var counter = document.createElement('div');
  counter.className = 'counter';
  counter.setAttribute('aria-hidden', 'true');
  var hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'Cuộn để bay tiếp ↓';
  document.body.appendChild(bg);
  document.body.appendChild(bar);
  document.body.appendChild(route);
  document.body.appendChild(counter);
  document.body.appendChild(hint);

  var items = route.querySelectorAll('li');
  var ticking = false;

  function clearInline() {
    els.forEach(function (sec) {
      Array.prototype.forEach.call(sec.children, function (c) { c.style.transform = ''; c.style.opacity = ''; });
    });
  }

  function set(v) {
    on = v;
    document.body.classList.toggle('world', on);
    document.documentElement.classList.toggle('world-on', on);
    els.forEach(function (e) { e.classList.toggle('stage', on); });
    if (!on) clearInline(); else request();
  }

  function frame() {
    ticking = false;
    if (!on) return;
    var vh = window.innerHeight;
    var mid = vh * 0.5;

    /* chặng hiện tại và vị trí liên tục (0..5) */
    var s = 0;
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.top <= mid) s = i + clamp((mid - r.top) / Math.max(r.height, 1));
    }
    var idx = Math.min(Math.floor(s), STAGES.length - 1);
    var f = s - idx;
    var nxt = Math.min(idx + 1, STAGES.length - 1);
    var a = STAGES[idx];
    var dk = document.documentElement.getAttribute('data-theme') === 'dark';
    var ca = dk ? DARK[idx] : a, cb = dk ? DARK[nxt] : STAGES[nxt];
    var t = f * f * (3 - 2 * f);

    bg.style.setProperty('--c1', mix(ca.c[0], cb.c[0], t));
    bg.style.setProperty('--c2', mix(ca.c[1], cb.c[1], t));
    bg.style.setProperty('--g1', mix(ca.g[0], cb.g[0], t));
    bg.style.setProperty('--g2', mix(ca.g[1], cb.g[1], t));

    /* cảm giác "bay": các lớp sao phóng to dần theo độ sâu, mỗi lớp một tốc độ */
    var zoom = s;
    var layers = bg.querySelectorAll('.layer');
    layers[0].style.transform = 'scale(' + (1 + zoom * 0.22) + ') translateY(' + (-zoom * 40) + 'px)';
    layers[1].style.transform = 'scale(' + (1 + zoom * 0.45) + ') translateY(' + (-zoom * 90) + 'px)';
    layers[2].style.transform = 'scale(' + (1 + zoom * 0.8) + ') translateY(' + (-zoom * 160) + 'px)';
    bg.querySelector('.g1').style.transform = 'translate(' + (zoom * 8) + 'vmax,' + (zoom * 6) + 'vmax)';
    bg.querySelector('.g2').style.transform = 'translate(' + (-zoom * 7) + 'vmax,' + (-zoom * 8) + 'vmax)';

    /* tiến độ, đường bay, bộ đếm */
    var doc = document.documentElement;
    var max = Math.max(doc.scrollHeight - vh, 1);
    bar.style.setProperty('--p', clamp(window.scrollY / max));
    for (var k = 0; k < items.length; k++) items[k].classList.toggle('active', k === idx);
    route.classList.toggle('dark', idx === 0 || idx === STAGES.length - 1);
    hint.classList.toggle('on-dark', idx === 0);
    counter.innerHTML = '<b>' + String(idx + 1).padStart(2, '0') + '</b> / ' + String(STAGES.length).padStart(2, '0') + ' · ' + a.label;
    hint.classList.toggle('gone', window.scrollY > 60);

    /* mỗi khối con của chặng lao vào khi tới gần và lướt qua khi rời đi */
    els.forEach(function (sec) {
      var top = sec.getBoundingClientRect().top;
      Array.prototype.forEach.call(sec.children, function (c) {
        if (c.hasAttribute('data-static')) return;
        var cTop = top + c.offsetTop;
        var cBot = cTop + c.offsetHeight;
        var enter = clamp((vh * 0.94 - cTop) / (vh * 0.32));
        var leave = clamp((vh * 0.2 - cBot) / (vh * 0.25));
        var e = enter * enter * (3 - 2 * enter);
        var scale = (0.9 + 0.1 * e) * (1 + 0.08 * leave);
        var y = (1 - e) * 70 - leave * 30;
        c.style.opacity = String(e * (1 - leave * 0.9));
        c.style.transform = 'translateY(' + y.toFixed(1) + 'px) scale(' + scale.toFixed(4) + ')';
      });
    });
  }

  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('load', request);

  set(on);
})();
