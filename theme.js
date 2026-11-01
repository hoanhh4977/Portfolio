/* Nút đổi chế độ sáng / tối. Lưu lựa chọn trong trình duyệt; lần đầu thì theo cài đặt của hệ điều hành. */
(function () {
  var KEY = 'portfolio-theme';
  var root = document.documentElement;

  function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-btn';
  btn.innerHTML =
    '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' +
    '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function sync() {
    var dark = current() === 'dark';
    btn.setAttribute('aria-pressed', dark);
    btn.setAttribute('aria-label', dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối');
    btn.title = btn.getAttribute('aria-label');
  }

  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    if (next === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, next); } catch (e) {}
    sync();
    window.dispatchEvent(new Event('resize')); // cho nền của chế độ chặng tính lại màu
  });

  document.body.appendChild(btn);
  sync();
})();
