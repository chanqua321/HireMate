/* =====================================================================
   HireMate — shared interactions & features
   Vanilla JS, no build step. Loaded on every page (end of <body>).
   ===================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tiny helpers ---------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function store(key, val) { try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch (e) {} }
  function read(key, fallback) {
    try { var v = localStorage.getItem(key); if (v == null) return fallback; try { return JSON.parse(v); } catch (e) { return v; } }
    catch (e) { return fallback; }
  }
  function currentPage() {
    var p = location.pathname.split('/').pop();
    return p && p.length ? p : 'index.html';
  }

  /* SVG icon strings */
  var ICON = {
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  };

  /* =====================================================================
     THEME — toggle + persistence (applied pre-paint by inline <head> script)
     ===================================================================== */
  function setTheme(mode) {
    // Dark mode disabled — site is always light.
    root.removeAttribute('data-theme');
    store('hm_theme', 'light');
    doc.dispatchEvent(new CustomEvent('hm:themechange', { detail: { mode: 'light' } }));
  }
  function toggleTheme() {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }
  function makeToggleBtn(extraClass) {
    var b = el('button', 'theme-toggle' + (extraClass ? ' ' + extraClass : ''), ICON.moon + ICON.sun);
    b.type = 'button';
    b.setAttribute('aria-label', 'Chuyển giao diện sáng/tối');
    b.setAttribute('title', 'Chế độ sáng / tối');
    b.addEventListener('click', toggleTheme);
    return b;
  }

  /* =====================================================================
     HEADER / NAV / FOOTER — inject theme toggle + "Ngân hàng câu hỏi"
     Keeps every page consistent from a single source of truth.
     ===================================================================== */
  function enhanceChrome() {
    var page = currentPage();

    // 1) Dark mode disabled — force light and inject no theme toggle
    root.removeAttribute('data-theme');
    store('hm_theme', 'light');

    // 2) "Ngân hàng câu hỏi" into desktop nav-links
    $all('.nav-links').forEach(function (nl) {
      if (nl.querySelector('a[href="questions.html"]')) return;
      var a = el('a', null, 'Ngân hàng câu hỏi');
      a.href = 'questions.html';
      if (page === 'questions.html') a.className = 'active';
      var iv = nl.querySelector('a[href="interview-setup.html"]');
      if (iv && iv.nextSibling) nl.insertBefore(a, iv.nextSibling);
      else nl.appendChild(a);
    });

    // 3) Mobile menu: questions link + theme row
    $all('.mobile-menu .panel').forEach(function (panel) {
      if (!panel.querySelector('a[href="questions.html"]')) {
        var a = el('a', null, 'Ngân hàng câu hỏi');
        a.href = 'questions.html';
        if (page === 'questions.html') a.className = 'active';
        var iv = panel.querySelector('a[href="interview-setup.html"]');
        if (iv && iv.nextSibling) panel.insertBefore(a, iv.nextSibling);
        else {
          var act = panel.querySelector('.mm-actions');
          panel.insertBefore(a, act || null);
        }
      }
    });

    // 4) Footer "Sản phẩm" column gets the question bank link
    $all('.footer-col').forEach(function (col) {
      var h = col.querySelector('h4');
      if (h && /Sản phẩm/i.test(h.textContent) && !col.querySelector('a[href="questions.html"]')) {
        var a = el('a', null, 'Ngân hàng câu hỏi');
        a.href = 'questions.html';
        col.appendChild(a);
      }
    });
  }

  /* =====================================================================
     PROFILE — saved name drives avatar initials & greetings everywhere
     ===================================================================== */
  function getProfile() { return read('hm_profile', {}) || {}; }
  function initials(name) {
    if (!name) return 'HM';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  function applyProfileToChrome() {
    var p = getProfile();
    if (p && p.name) {
      $all('.avatar').forEach(function (a) { a.textContent = initials(p.name); });
    }
  }

  /* =====================================================================
     EXISTING BEHAVIORS (preserved)
     ===================================================================== */
  function stickyHeader() {
    var header = $('.site-header');
    if (!header) return;
    function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  function mobileMenu() {
    var hamburger = $('.hamburger');
    var menu = $('.mobile-menu');
    if (!hamburger || !menu) return;
    hamburger.addEventListener('click', function () { menu.classList.toggle('open'); });
    menu.addEventListener('click', function (e) { if (e.target === menu) menu.classList.remove('open'); });
  }
  function accountDropdown() {
    var account = $('.account');
    if (!account) return;
    var btn = account.querySelector('.account-btn');
    btn.addEventListener('click', function (e) { e.stopPropagation(); account.classList.toggle('open'); });
    doc.addEventListener('click', function () { account.classList.remove('open'); });
  }
  function segmentedControls() {
    $all('.segmented').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var hidden = seg.parentElement.querySelector('input[type="hidden"]');
        if (hidden) hidden.value = btn.dataset.value || btn.textContent.trim();
      });
    });
  }
  function starWidgets() {
    $all('.star-row').forEach(function (row) {
      var stars = $all('button', row);
      function paint(n) { stars.forEach(function (s, i) { s.classList.toggle('on', i < n); }); }
      stars.forEach(function (star, idx) {
        star.addEventListener('mouseenter', function () { paint(idx + 1); });
        star.addEventListener('click', function () { row.dataset.value = idx + 1; paint(idx + 1); });
      });
      row.addEventListener('mouseleave', function () { paint(parseInt(row.dataset.value || '0', 10)); });
    });
  }
  function printButtons() {
    $all('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  }

  /* =====================================================================
     SCROLL REVEAL (IntersectionObserver) + number counters + parallax
     ===================================================================== */
  function revealOnScroll() {
    var items = $all('.reveal');
    if (!items.length) return;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach(function (i) { i.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (i) { io.observe(i); });
  }

  function animateCount(node) {
    var target = parseFloat(node.getAttribute('data-count'));
    if (isNaN(target)) return;
    var dur = parseInt(node.getAttribute('data-duration') || '1400', 10);
    var dec = parseInt(node.getAttribute('data-decimals') || '0', 10);
    var prefix = node.getAttribute('data-prefix') || '';
    var suffix = node.getAttribute('data-suffix') || '';
    if (prefersReduced) { node.textContent = prefix + target.toLocaleString('vi-VN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix; return; }
    var start = null;
    function frame(ts) {
      if (start == null) start = ts;
      var prog = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - prog, 3);
      var val = target * eased;
      node.textContent = prefix + val.toLocaleString('vi-VN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (prog < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function counters() {
    var nodes = $all('[data-count]');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) { nodes.forEach(animateCount); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  function parallax() {
    if (prefersReduced) return;
    var targets = $all('.parallax');
    if (!targets.length) return;
    var scope = $('.hero') || doc.body;
    scope.addEventListener('mousemove', function (e) {
      var r = scope.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      targets.forEach(function (t) {
        var depth = parseFloat(t.getAttribute('data-depth') || '12');
        t.style.transform = 'translate3d(' + (dx * depth).toFixed(1) + 'px,' + (dy * depth).toFixed(1) + 'px,0)';
      });
    });
    scope.addEventListener('mouseleave', function () {
      targets.forEach(function (t) { t.style.transform = 'translate3d(0,0,0)'; });
    });
  }

  /* =====================================================================
     TESTIMONIALS CAROUSEL
     ===================================================================== */
  function carousel() {
    var car = $('.carousel');
    if (!car) return;
    var track = $('.carousel-track', car);
    var slides = $all('.tcard', track);
    if (slides.length < 1) return;
    var dotsWrap = $('.carousel-dots', car);
    var idx = 0, timer = null;

    slides.forEach(function (s, i) {
      var d = el('button'); d.type = 'button'; d.setAttribute('aria-label', 'Đánh giá ' + (i + 1));
      d.addEventListener('click', function () { go(i, true); });
      dotsWrap.appendChild(d);
    });
    var dots = $all('button', dotsWrap);

    function go(n, manual) {
      idx = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
      if (manual) restart();
    }
    function next() { go(idx + 1); }
    function start() { if (!prefersReduced) timer = setInterval(next, 6000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    var prev = $('.carousel-btn.prev', car), nx = $('.carousel-btn.next', car);
    if (prev) prev.addEventListener('click', function () { go(idx - 1, true); });
    if (nx) nx.addEventListener('click', function () { go(idx + 1, true); });
    car.addEventListener('mouseenter', stop);
    car.addEventListener('mouseleave', start);

    go(0); start();
  }

  /* =====================================================================
     FAQ ACCORDION
     ===================================================================== */
  function faqAccordion() {
    var items = $all('.faq-item');
    if (!items.length) return;
    items.forEach(function (item) {
      var q = $('.faq-q', item);
      var a = $('.faq-a', item);
      if (!q || !a) return;
      q.setAttribute('aria-expanded', 'false');
      q.addEventListener('click', function () {
        var open = item.classList.contains('open');
        items.forEach(function (it) {
          it.classList.remove('open');
          var aa = $('.faq-a', it); if (aa) aa.style.maxHeight = null;
          var qq = $('.faq-q', it); if (qq) qq.setAttribute('aria-expanded', 'false');
        });
        if (!open) {
          item.classList.add('open');
          a.style.maxHeight = a.scrollHeight + 'px';
          q.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* =====================================================================
     INDUSTRY → ROLES (single source of truth)
     Drives both the cascading dropdowns and the interview question routing.
     ===================================================================== */
  var INDUSTRY_ROLES = {
    'Công nghệ thông tin': [
      'Lập trình viên Frontend',
      'Lập trình viên Backend',
      'Lập trình viên Fullstack',
      'Kỹ sư DevOps',
      'Kiểm thử phần mềm (QA/Tester)',
      'Chuyên viên Phân tích Dữ liệu',
      'Kỹ sư Dữ liệu',
      'Thiết kế UI/UX',
      'Quản lý sản phẩm'
    ],
    'Kinh doanh': [
      'Nhân viên Kinh doanh',
      'Chuyên viên Marketing',
      'Tiếp thị Kỹ thuật số',
      'Chuyên viên Nhân sự',
      'Kế toán',
      'Chuyên viên Phân tích Kinh doanh',
      'Chăm sóc khách hàng',
      'Quản lý dự án'
    ]
  };

  /* =====================================================================
     QUESTION BANK DATA (shared by questions.html + interview sim)
     ===================================================================== */
  var QUESTION_BANK = [
    { cat: 'Frontend', q: 'Sự khác nhau giữa let, const và var trong JavaScript là gì?', hint: 'Phạm vi (scope), hoisting và khả năng gán lại giá trị.' },
    { cat: 'Frontend', q: 'Virtual DOM là gì và vì sao React sử dụng nó?', hint: 'So sánh cây DOM ảo, cơ chế reconciliation và hiệu năng.' },
    { cat: 'Frontend', q: 'Hãy giải thích cách hoạt động của CSS Flexbox và khi nào nên dùng Grid.', hint: 'Trục chính/trục phụ, bố cục 1 chiều vs 2 chiều.' },
    { cat: 'Frontend', q: 'Closure trong JavaScript là gì? Cho một ví dụ thực tế.', hint: 'Hàm ghi nhớ phạm vi nơi nó được tạo ra.' },
    { cat: 'Frontend', q: 'Làm thế nào để tối ưu hiệu năng tải trang của một ứng dụng web?', hint: 'Lazy-load, code splitting, nén ảnh, caching, CDN.' },
    { cat: 'Frontend', q: 'Phân biệt giữa Server-Side Rendering và Client-Side Rendering.', hint: 'SEO, thời gian hiển thị đầu tiên, tải tương tác.' },

    { cat: 'Backend', q: 'REST API là gì? Các nguyên tắc thiết kế REST tốt gồm những gì?', hint: 'Stateless, tài nguyên, HTTP verbs, mã trạng thái.' },
    { cat: 'Backend', q: 'Sự khác nhau giữa SQL và NoSQL? Khi nào nên dùng loại nào?', hint: 'Lược đồ, khả năng mở rộng, tính nhất quán, quan hệ.' },
    { cat: 'Backend', q: 'Bạn xử lý xác thực và phân quyền trong API như thế nào?', hint: 'JWT, session, OAuth2, vai trò và quyền hạn.' },
    { cat: 'Backend', q: 'Index trong cơ sở dữ liệu hoạt động ra sao và đánh đổi của nó là gì?', hint: 'Tăng tốc đọc, chậm ghi, tốn bộ nhớ.' },
    { cat: 'Backend', q: 'Làm thế nào để mở rộng (scale) một hệ thống có lượng truy cập lớn?', hint: 'Cân bằng tải, caching, hàng đợi, phân mảnh dữ liệu.' },
    { cat: 'Backend', q: 'Giải thích sự khác biệt giữa xử lý đồng bộ và bất đồng bộ.', hint: 'Blocking vs non-blocking, callback, promise, hiệu năng.' },

    { cat: 'Data', q: 'Quy trình làm sạch dữ liệu (data cleaning) gồm những bước nào?', hint: 'Xử lý thiếu, trùng lặp, ngoại lệ, chuẩn hóa.' },
    { cat: 'Data', q: 'Phân biệt giữa tương quan (correlation) và nhân quả (causation).', hint: 'Hai biến cùng biến thiên không đồng nghĩa cái này gây ra cái kia.' },
    { cat: 'Data', q: 'Bạn sẽ trình bày một insight phức tạp cho người không chuyên ra sao?', hint: 'Trực quan hóa, kể chuyện bằng dữ liệu, tập trung tác động.' },
    { cat: 'Data', q: 'Overfitting là gì và làm thế nào để hạn chế nó?', hint: 'Regularization, cross-validation, thêm dữ liệu.' },

    { cat: 'Hành vi (HR)', q: 'Hãy kể về một lần bạn vượt qua thử thách lớn trong công việc.', hint: 'Dùng cấu trúc STAR: Tình huống, Nhiệm vụ, Hành động, Kết quả.' },
    { cat: 'Hành vi (HR)', q: 'Điểm mạnh và điểm yếu lớn nhất của bạn là gì?', hint: 'Trung thực, gắn với vị trí, nêu cách bạn cải thiện.' },
    { cat: 'Hành vi (HR)', q: 'Vì sao bạn muốn ứng tuyển vào vị trí này?', hint: 'Liên hệ giá trị bản thân với mục tiêu công ty.' },
    { cat: 'Hành vi (HR)', q: 'Kể về một lần bạn bất đồng với đồng nghiệp và cách bạn xử lý.', hint: 'Lắng nghe, dữ liệu, tìm tiếng nói chung.' },
    { cat: 'Hành vi (HR)', q: 'Bạn hình dung mình ở đâu sau 5 năm nữa?', hint: 'Định hướng phát triển rõ ràng, thực tế.' },
    { cat: 'Hành vi (HR)', q: 'Hãy kể về một thất bại và bài học bạn rút ra.', hint: 'Nhận trách nhiệm, tập trung vào sự trưởng thành.' },

    { cat: 'Quản lý sản phẩm', q: 'Bạn ưu tiên các tính năng trong một sản phẩm như thế nào?', hint: 'Tác động, công sức, RICE, giá trị người dùng.' },
    { cat: 'Quản lý sản phẩm', q: 'Làm sao để đo lường thành công của một tính năng mới?', hint: 'Chỉ số bắc cầu (north star), retention, chuyển đổi.' },
    { cat: 'Quản lý sản phẩm', q: 'Mô tả cách bạn làm việc với đội kỹ thuật và thiết kế.', hint: 'Giao tiếp, đồng cảm, mục tiêu chung, lộ trình.' },

    { cat: 'Thiết kế (UI/UX)', q: 'Hãy mô tả quy trình thiết kế lấy người dùng làm trung tâm của bạn.', hint: 'Nghiên cứu, phác thảo, prototype, kiểm thử, lặp lại.' },
    { cat: 'Thiết kế (UI/UX)', q: 'Làm thế nào để cân bằng giữa thẩm mỹ và khả năng sử dụng?', hint: 'Ưu tiên rõ ràng, phân cấp thị giác, kiểm thử usability.' },
    { cat: 'Thiết kế (UI/UX)', q: 'Bạn xử lý phản hồi trái chiều về thiết kế của mình ra sao?', hint: 'Dựa trên dữ liệu, mục tiêu người dùng, không cái tôi.' },

    { cat: 'Marketing', q: 'Bạn xây dựng một chiến dịch marketing từ con số 0 như thế nào?', hint: 'Mục tiêu, chân dung khách hàng, kênh, ngân sách, đo lường.' },
    { cat: 'Marketing', q: 'Các chỉ số quan trọng nào dùng để đánh giá hiệu quả marketing?', hint: 'CAC, ROAS, tỷ lệ chuyển đổi, CTR, LTV.' },
    { cat: 'Marketing', q: 'Bạn phân khúc và xây dựng chân dung khách hàng mục tiêu như thế nào?', hint: 'Nhân khẩu học, hành vi, nhu cầu, kênh tiếp cận.' },
    { cat: 'Marketing', q: 'SEO và SEM khác nhau ra sao? Khi nào nên ưu tiên cái nào?', hint: 'Tự nhiên vs trả phí, thời gian, ngân sách, mục tiêu.' },
    { cat: 'Marketing', q: 'Bạn tối ưu một chiến dịch quảng cáo dựa trên dữ liệu như thế nào?', hint: 'A/B test, theo dõi chỉ số, phân bổ ngân sách.' },

    { cat: 'Fullstack', q: 'Bạn phân chia trách nhiệm giữa frontend và backend trong một dự án fullstack như thế nào?', hint: 'Hợp đồng API, luồng dữ liệu đầu-cuối, tách biệt mối quan tâm.' },
    { cat: 'Fullstack', q: 'Làm thế nào để đảm bảo tính nhất quán dữ liệu giữa client và server?', hint: 'Validation hai phía, nguồn sự thật, đồng bộ trạng thái.' },
    { cat: 'Fullstack', q: 'Bạn xây dựng một tính năng từ giao diện đến cơ sở dữ liệu ra sao?', hint: 'UI, API, schema, kiểm thử toàn luồng.' },
    { cat: 'Fullstack', q: 'Khi gặp lỗi trải dài cả frontend lẫn backend, bạn debug như thế nào?', hint: 'Cô lập từng tầng, log, lần theo request, công cụ mạng.' },
    { cat: 'Fullstack', q: 'Bạn quản lý xác thực và phiên người dùng xuyên suốt ứng dụng fullstack ra sao?', hint: 'Token, cookie, middleware, bảo mật.' },

    { cat: 'DevOps', q: 'CI/CD là gì và một pipeline tốt gồm những giai đoạn nào?', hint: 'Build, test, deploy tự động, khả năng rollback.' },
    { cat: 'DevOps', q: 'Docker và container hóa giúp giải quyết những vấn đề gì?', hint: 'Nhất quán môi trường, cô lập, khả năng mở rộng.' },
    { cat: 'DevOps', q: 'Bạn giám sát (monitoring) và cảnh báo cho hệ thống production như thế nào?', hint: 'Metrics, log, alert, SLA/SLO.' },
    { cat: 'DevOps', q: 'Infrastructure as Code là gì và lợi ích của nó?', hint: 'Terraform/Ansible, tái lập, kiểm soát phiên bản.' },
    { cat: 'DevOps', q: 'Bạn xử lý sự cố downtime trong production ra sao?', hint: 'Phát hiện, khắc phục, hậu kiểm (postmortem).' },

    { cat: 'Kiểm thử (QA)', q: 'Phân biệt giữa kiểm thử thủ công và kiểm thử tự động. Khi nào dùng loại nào?', hint: 'Chi phí, tốc độ, độ phủ, kiểm thử hồi quy.' },
    { cat: 'Kiểm thử (QA)', q: 'Một test case tốt gồm những thành phần nào?', hint: 'Điều kiện, các bước, dữ liệu, kết quả mong đợi.' },
    { cat: 'Kiểm thử (QA)', q: 'Bạn ưu tiên kiểm thử khi thời gian release gấp rút như thế nào?', hint: 'Dựa trên rủi ro, chức năng quan trọng, smoke test.' },
    { cat: 'Kiểm thử (QA)', q: 'Sự khác nhau giữa severity và priority của một lỗi là gì?', hint: 'Mức nghiêm trọng vs mức ưu tiên xử lý.' },
    { cat: 'Kiểm thử (QA)', q: 'Bạn xây dựng quy trình kiểm thử hồi quy ra sao?', hint: 'Bộ test ổn định, tự động hóa, chạy định kỳ.' },

    { cat: 'Kỹ sư Dữ liệu', q: 'ETL và ELT khác nhau như thế nào? Khi nào chọn cái nào?', hint: 'Thứ tự xử lý, kho dữ liệu, khối lượng dữ liệu.' },
    { cat: 'Kỹ sư Dữ liệu', q: 'Bạn thiết kế một data pipeline đáng tin cậy như thế nào?', hint: 'Idempotent, retry, giám sát, chất lượng dữ liệu.' },
    { cat: 'Kỹ sư Dữ liệu', q: 'Data warehouse và data lake khác nhau ra sao?', hint: 'Cấu trúc, mục đích, chi phí, schema-on-read/write.' },
    { cat: 'Kỹ sư Dữ liệu', q: 'Bạn xử lý dữ liệu lớn và tối ưu hiệu năng truy vấn như thế nào?', hint: 'Phân vùng, đánh chỉ mục, xử lý song song.' },
    { cat: 'Kỹ sư Dữ liệu', q: 'Làm thế nào để đảm bảo chất lượng và toàn vẹn dữ liệu trong pipeline?', hint: 'Kiểm tra ràng buộc, giám sát, cảnh báo bất thường.' },

    { cat: 'Kinh doanh', q: 'Bạn tiếp cận và xây dựng quan hệ với một khách hàng tiềm năng mới như thế nào?', hint: 'Nghiên cứu, lắng nghe nhu cầu, tạo niềm tin.' },
    { cat: 'Kinh doanh', q: 'Hãy mô tả quy trình bán hàng của bạn từ tìm kiếm đến chốt đơn.', hint: 'Tìm kiếm, tư vấn, xử lý từ chối, chốt deal.' },
    { cat: 'Kinh doanh', q: 'Bạn xử lý khi khách hàng từ chối hoặc phản đối về giá ra sao?', hint: 'Tập trung vào giá trị, đồng cảm, đưa giải pháp.' },
    { cat: 'Kinh doanh', q: 'Làm thế nào để đạt và vượt chỉ tiêu doanh số (KPI)?', hint: 'Lập kế hoạch, ưu tiên, theo dõi pipeline bán hàng.' },
    { cat: 'Kinh doanh', q: 'Kể về một thương vụ khó khăn mà bạn đã chốt thành công.', hint: 'Dùng STAR: kiên trì, hiểu nhu cầu khách hàng.' },

    { cat: 'Nhân sự', q: 'Bạn xây dựng một quy trình tuyển dụng hiệu quả như thế nào?', hint: 'Mô tả công việc, sàng lọc, phỏng vấn, trải nghiệm ứng viên.' },
    { cat: 'Nhân sự', q: 'Làm thế nào để đánh giá sự phù hợp văn hóa của ứng viên?', hint: 'Giá trị cốt lõi, câu hỏi tình huống, tham chiếu.' },
    { cat: 'Nhân sự', q: 'Bạn xử lý mâu thuẫn giữa các nhân viên ra sao?', hint: 'Lắng nghe, trung lập, hòa giải, chính sách công ty.' },
    { cat: 'Nhân sự', q: 'Những chỉ số nhân sự quan trọng nào bạn thường theo dõi?', hint: 'Tỷ lệ nghỉ việc, thời gian tuyển, mức độ gắn kết.' },
    { cat: 'Nhân sự', q: 'Bạn giữ chân nhân tài và nâng cao gắn kết nhân viên như thế nào?', hint: 'Lộ trình phát triển, ghi nhận, chế độ phúc lợi.' },

    { cat: 'Kế toán', q: 'Phân biệt giữa kế toán dồn tích và kế toán tiền mặt.', hint: 'Thời điểm ghi nhận doanh thu và chi phí.' },
    { cat: 'Kế toán', q: 'Ba báo cáo tài chính cơ bản là gì và chúng liên kết với nhau ra sao?', hint: 'Bảng cân đối, kết quả kinh doanh, lưu chuyển tiền tệ.' },
    { cat: 'Kế toán', q: 'Bạn đảm bảo tính chính xác và tuân thủ trong sổ sách như thế nào?', hint: 'Đối chiếu, kiểm soát nội bộ, chuẩn mực kế toán.' },
    { cat: 'Kế toán', q: 'Quy trình quyết toán cuối kỳ (đóng sổ) gồm những bước nào?', hint: 'Đối chiếu, bút toán điều chỉnh, lập báo cáo.' },
    { cat: 'Kế toán', q: 'Bạn xử lý khi phát hiện sai lệch trong số liệu kế toán ra sao?', hint: 'Truy nguyên nguồn gốc, điều chỉnh, ngăn ngừa tái diễn.' },

    { cat: 'Phân tích Kinh doanh', q: 'Bạn thu thập và làm rõ yêu cầu từ các bên liên quan như thế nào?', hint: 'Phỏng vấn, workshop, tài liệu hóa, xác nhận lại.' },
    { cat: 'Phân tích Kinh doanh', q: 'Sự khác nhau giữa yêu cầu nghiệp vụ và yêu cầu chức năng là gì?', hint: 'Mục tiêu kinh doanh vs hành vi của hệ thống.' },
    { cat: 'Phân tích Kinh doanh', q: 'Bạn xử lý khi các bên liên quan có yêu cầu mâu thuẫn nhau ra sao?', hint: 'Ưu tiên, thương lượng, dựa trên giá trị kinh doanh.' },
    { cat: 'Phân tích Kinh doanh', q: 'Bạn dùng công cụ hoặc mô hình nào để mô tả quy trình nghiệp vụ?', hint: 'BPMN, user story, use case, wireframe.' },
    { cat: 'Phân tích Kinh doanh', q: 'Làm thế nào để đo lường thành công của một giải pháp sau khi triển khai?', hint: 'KPI, ROI, phản hồi của người dùng.' },

    { cat: 'Chăm sóc khách hàng', q: 'Bạn xử lý một khách hàng đang tức giận như thế nào?', hint: 'Lắng nghe, đồng cảm, giữ bình tĩnh, đưa giải pháp.' },
    { cat: 'Chăm sóc khách hàng', q: 'Làm thế nào để cân bằng giữa tốc độ và chất lượng hỗ trợ?', hint: 'Quy trình, ưu tiên, công cụ, cá nhân hóa.' },
    { cat: 'Chăm sóc khách hàng', q: 'Kể về một lần bạn biến khách hàng không hài lòng thành hài lòng.', hint: 'Dùng STAR: chủ động, vượt mong đợi.' },
    { cat: 'Chăm sóc khách hàng', q: 'Những chỉ số nào quan trọng trong chăm sóc khách hàng?', hint: 'CSAT, NPS, thời gian phản hồi, tỷ lệ giải quyết.' },
    { cat: 'Chăm sóc khách hàng', q: 'Bạn làm gì khi chưa biết câu trả lời cho vấn đề của khách hàng?', hint: 'Trung thực, tìm hỗ trợ, theo dõi đến cùng.' },

    { cat: 'Quản lý dự án', q: 'Bạn lập kế hoạch và theo dõi tiến độ một dự án như thế nào?', hint: 'Phạm vi, mốc thời gian, nguồn lực, công cụ quản lý.' },
    { cat: 'Quản lý dự án', q: 'Sự khác nhau giữa Agile và Waterfall là gì? Khi nào nên dùng?', hint: 'Lặp linh hoạt vs tuần tự, tùy loại dự án.' },
    { cat: 'Quản lý dự án', q: 'Bạn xử lý khi dự án bị trễ tiến độ hoặc vượt ngân sách ra sao?', hint: 'Đánh giá rủi ro, điều chỉnh phạm vi, giao tiếp.' },
    { cat: 'Quản lý dự án', q: 'Làm thế nào để quản lý kỳ vọng của các bên liên quan?', hint: 'Giao tiếp minh bạch, báo cáo định kỳ, ưu tiên.' },
    { cat: 'Quản lý dự án', q: 'Bạn quản lý rủi ro trong một dự án như thế nào?', hint: 'Nhận diện, đánh giá, lập kế hoạch ứng phó.' }
  ];

  /* =====================================================================
     QUESTIONS PAGE — search + category filter
     ===================================================================== */
  function questionsPage() {
    var listEl = $('#qbList');
    if (!listEl) return;
    var searchEl = $('#qbSearch');
    var countEl = $('#qbCount');
    var filtersEl = $('#qbFilters');
    var cats = ['Tất cả'].concat(QUESTION_BANK.map(function (q) { return q.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    var activeCat = 'Tất cả';
    var term = '';

    cats.forEach(function (c) {
      var b = el('button', 'qb-chip' + (c === 'Tất cả' ? ' active' : ''), c);
      b.type = 'button'; b.setAttribute('data-cat', c);
      b.addEventListener('click', function () {
        activeCat = c;
        $all('.qb-chip', filtersEl).forEach(function (x) { x.classList.toggle('active', x === b); });
        render();
      });
      filtersEl.appendChild(b);
    });

    function highlight(text, q) {
      if (!q) return text;
      try { return text.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }
      catch (e) { return text; }
    }
    function render() {
      var rows = QUESTION_BANK.filter(function (item) {
        var okCat = activeCat === 'Tất cả' || item.cat === activeCat;
        var okTerm = !term || (item.q + ' ' + item.cat + ' ' + item.hint).toLowerCase().indexOf(term) > -1;
        return okCat && okTerm;
      });
      countEl.textContent = 'Hiển thị ' + rows.length + ' / ' + QUESTION_BANK.length + ' câu hỏi';
      if (!rows.length) { listEl.innerHTML = '<div class="qb-empty">Không tìm thấy câu hỏi phù hợp. Thử từ khóa khác nhé.</div>'; return; }
      listEl.innerHTML = rows.map(function (item) {
        return '<article class="qb-q reveal in">' +
          '<div class="qb-top"><span class="badge">' + item.cat + '</span></div>' +
          '<h3>' + highlight(item.q, term) + '</h3>' +
          '<p>💡 ' + highlight(item.hint, term) + '</p>' +
          '</article>';
      }).join('');
    }
    if (searchEl) searchEl.addEventListener('input', function () { term = this.value.trim().toLowerCase(); render(); });
    render();
  }

  /* =====================================================================
     INTERVIEW SIMULATION (interview-room.html)
     ===================================================================== */
  function pickQuestions(cfg) {
    var role = (cfg && cfg.role) || '';
    var map = {
      'Lập trình viên Frontend': 'Frontend',
      'Lập trình viên Backend': 'Backend',
      'Lập trình viên Fullstack': 'Fullstack',
      'Kỹ sư DevOps': 'DevOps',
      'Kiểm thử phần mềm (QA/Tester)': 'Kiểm thử (QA)',
      'Chuyên viên Phân tích Dữ liệu': 'Data',
      'Kỹ sư Dữ liệu': 'Kỹ sư Dữ liệu',
      'Thiết kế UI/UX': 'Thiết kế (UI/UX)',
      'Quản lý sản phẩm': 'Quản lý sản phẩm',
      'Nhân viên Kinh doanh': 'Kinh doanh',
      'Chuyên viên Marketing': 'Marketing',
      'Tiếp thị Kỹ thuật số': 'Marketing',
      'Chuyên viên Nhân sự': 'Nhân sự',
      'Kế toán': 'Kế toán',
      'Chuyên viên Phân tích Kinh doanh': 'Phân tích Kinh doanh',
      'Chăm sóc khách hàng': 'Chăm sóc khách hàng',
      'Quản lý dự án': 'Quản lý dự án'
    };
    var cat = map[role];
    var hr = QUESTION_BANK.filter(function (q) { return q.cat === 'Hành vi (HR)'; });
    var tech = cat ? QUESTION_BANK.filter(function (q) { return q.cat === cat; }) : [];
    var chosen = [];
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    chosen = chosen.concat(shuffle(tech).slice(0, 3));
    chosen = chosen.concat(shuffle(hr).slice(0, 2));
    if (chosen.length < 5) {
      var rest = shuffle(QUESTION_BANK).filter(function (q) { return chosen.indexOf(q) === -1; });
      chosen = chosen.concat(rest.slice(0, 5 - chosen.length));
    }
    return chosen.slice(0, 5);
  }

  function interviewSim() {
    var simRoot = $('#sim');
    if (!simRoot) return;

    var cfg = read('hm_interview_config', { role: 'Lập trình viên Frontend', field: 'Công nghệ thông tin', difficulty: 'Trung bình', mode: 'Text' });
    var profile = getProfile();
    var qs = pickQuestions(cfg);
    var total = qs.length;
    var perTime = cfg.difficulty === 'Khó' ? 90 : (cfg.difficulty === 'Dễ' ? 180 : 120);

    var i = 0;
    var answers = [];
    var tick = null, remaining = perTime;

    var elTitle = $('#simTitle'), elMeta = $('#simMeta');
    var elProgText = $('#simProgressText'), elProgBar = $('#simProgressBar');
    var elTimer = $('#simTimer'), elTimerVal = $('#simTimerVal');
    var elCat = $('#simCategory'), elQ = $('#simQuestion'), elHint = $('#simHint');
    var elAns = $('#simAnswer'), elRec = $('#simRecordBtn'), elRecLbl = $('#simRecordLabel');
    var elSkip = $('#simSkip'), elNext = $('#simNext'), elNextLbl = $('#simNextLabel');

    if (elTitle) elTitle.textContent = 'Phỏng vấn: ' + (cfg.role || 'Tổng hợp');
    if (elMeta) elMeta.textContent = 'Độ khó: ' + (cfg.difficulty || 'Trung bình') + ' · Hình thức: ' + (cfg.mode === 'Voice' ? 'Giọng nói' : 'Văn bản');

    function fmt(s) { var m = Math.floor(s / 60), ss = s % 60; return m + ':' + (ss < 10 ? '0' : '') + ss; }
    function setTimerClass() {
      if (!elTimer) return;
      elTimer.classList.remove('warning', 'danger');
      if (remaining <= 10) elTimer.classList.add('danger');
      else if (remaining <= 30) elTimer.classList.add('warning');
    }
    function startTimer() {
      remaining = perTime; if (elTimerVal) elTimerVal.textContent = fmt(remaining); setTimerClass();
      stopTimer();
      tick = setInterval(function () {
        remaining--; if (elTimerVal) elTimerVal.textContent = fmt(Math.max(remaining, 0)); setTimerClass();
        if (remaining <= 0) { stopTimer(); goNext(true); }
      }, 1000);
    }
    function stopTimer() { if (tick) { clearInterval(tick); tick = null; } }

    var recording = false;
    if (elRec) {
      elRec.addEventListener('click', function () {
        recording = !recording;
        elRec.classList.toggle('btn-primary', recording);
        elRec.classList.toggle('btn-ghost', !recording);
        if (elRecLbl) elRecLbl.textContent = recording ? 'Đang ghi âm…' : (cfg.mode === 'Voice' ? 'Bắt đầu ghi âm' : 'Mô phỏng ghi âm');
        elRec.querySelector('.recording-dot') && (elRec.querySelector('.recording-dot').style.display = recording ? 'inline-block' : 'none');
        if (recording && elAns && !elAns.value) {
          elAns.value = '[Bản ghi giọng nói mô phỏng] Ứng viên đang trả lời câu hỏi...';
        }
      });
    }

    function renderQuestion() {
      var q = qs[i];
      if (elProgText) elProgText.textContent = 'Câu ' + (i + 1) + '/' + total;
      if (elProgBar) elProgBar.style.width = Math.round(((i) / total) * 100) + '%';
      if (elCat) elCat.textContent = q.cat;
      if (elQ) { elQ.textContent = q.q; elQ.classList.remove('sim-fade'); void elQ.offsetWidth; elQ.classList.add('sim-fade'); }
      if (elHint) elHint.textContent = '💡 Gợi ý: ' + q.hint;
      if (elAns) { elAns.value = ''; elAns.focus(); }
      recording = false;
      if (elRec) { elRec.classList.remove('btn-primary'); elRec.classList.add('btn-ghost'); var d = elRec.querySelector('.recording-dot'); if (d) d.style.display = 'none'; }
      if (elRecLbl) elRecLbl.textContent = cfg.mode === 'Voice' ? 'Bắt đầu ghi âm' : 'Mô phỏng ghi âm';
      if (elNextLbl) elNextLbl.textContent = (i === total - 1) ? 'Hoàn tất & xem kết quả' : 'Câu tiếp theo';
      startTimer();
    }

    function recordAnswer(skipped) {
      var text = elAns ? elAns.value.trim() : '';
      answers.push({ q: qs[i].q, cat: qs[i].cat, text: text, skipped: !!skipped && !text, timeUsed: perTime - Math.max(remaining, 0), len: text.length });
    }
    function goNext(autoFromTimer) {
      stopTimer();
      recordAnswer(autoFromTimer === true && (!elAns || !elAns.value.trim()));
      if (i < total - 1) { i++; renderQuestion(); }
      else finish();
    }
    function goSkip() { stopTimer(); recordAnswer(true); if (i < total - 1) { i++; renderQuestion(); } else finish(); }

    if (elNext) elNext.addEventListener('click', function () { goNext(false); });
    if (elSkip) elSkip.addEventListener('click', goSkip);

    function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
    function finish() {
      // Simulated STAR scoring based on answer length, completeness & time spent.
      var answered = answers.filter(function (a) { return a.text && a.text.length > 0; });
      var avgLen = answered.length ? answered.reduce(function (s, a) { return s + a.len; }, 0) / answered.length : 0;
      var completion = answers.filter(function (a) { return !a.skipped; }).length / total; // 0..1
      var base = clamp(38 + avgLen / 6 + completion * 28, 20, 96);
      function jitter(b, spread) { return Math.round(clamp(b + (Math.random() * spread - spread / 2), 12, 98)); }
      var subs = {
        S: jitter(base + 6, 14),
        T: jitter(base + 3, 14),
        A: jitter(base - 6, 18),
        R: jitter(base - 9, 18)
      };
      var clarity = jitter(base, 12);
      var overall = Math.round((subs.S + subs.T + subs.A + subs.R + clarity) / 5);

      var result = {
        overall: overall,
        subs: subs,
        clarity: clarity,
        role: cfg.role || 'Tổng hợp',
        difficulty: cfg.difficulty || 'Trung bình',
        date: new Date().toISOString(),
        answers: answers
      };
      store('hm_last_result', result);

      // Append to history (for dashboard charts)
      var hist = read('hm_history', []);
      if (!Array.isArray(hist)) hist = [];
      hist.push({ date: result.date, role: result.role, score: overall });
      if (hist.length > 24) hist = hist.slice(hist.length - 24);
      store('hm_history', hist);

      if (elProgBar) elProgBar.style.width = '100%';
      window.location.href = 'feedback.html';
    }

    renderQuestion();
  }

  /* =====================================================================
     CASCADING SELECTS — "Ngành nghề" drives "Vị trí ứng tuyển"
     Single source of truth: INDUSTRY_ROLES. Used by interview setup
     and onboarding goal so the two screens stay consistent.
     ===================================================================== */
  function buildCascade(form, opts) {
    opts = opts || {};
    var fieldSel = form.querySelector('#field');
    var posSel = form.querySelector('#pos');
    if (!fieldSel || !posSel) return null;

    var industries = Object.keys(INDUSTRY_ROLES);

    function fillSelect(sel, items, placeholder, preselect) {
      var prev = preselect != null ? preselect : sel.value;
      sel.innerHTML = '';
      if (placeholder) {
        var ph = el('option', null, placeholder);
        ph.value = ''; ph.disabled = true; sel.appendChild(ph);
      }
      items.forEach(function (txt) {
        var o = el('option', null, txt); o.value = txt; sel.appendChild(o);
      });
      if (prev && items.indexOf(prev) > -1) sel.value = prev;
      else if (placeholder) sel.value = '';
      else if (items.length) sel.value = items[0];
    }

    function refreshPositions(preselectRole) {
      var roles = INDUSTRY_ROLES[fieldSel.value] || [];
      fillSelect(posSel, roles, opts.posPlaceholder, preselectRole);
    }

    fillSelect(fieldSel, industries, opts.fieldPlaceholder, opts.field);
    fieldSel.addEventListener('change', function () { refreshPositions(null); });
    refreshPositions(opts.role);

    return { fieldSel: fieldSel, posSel: posSel, refreshPositions: refreshPositions };
  }

  /* =====================================================================
     INTERVIEW SETUP — save config before entering the room
     ===================================================================== */
  function interviewSetup() {
    var form = $('#setupForm');
    if (!form) return;
    buildCascade(form, {});
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cfg = {
        field: (form.querySelector('#field') || {}).value || 'Công nghệ thông tin',
        role: (form.querySelector('#pos') || {}).value || 'Lập trình viên Frontend',
        difficulty: (form.querySelector('input[name="difficulty"]') || {}).value || 'Trung bình',
        mode: (form.querySelector('input[name="mode"]') || {}).value || 'Text'
      };
      store('hm_interview_config', cfg);
      window.location.href = 'interview-room.html';
    });
  }

  /* =====================================================================
     FEEDBACK — render from saved result (fallback to static defaults)
     ===================================================================== */
  function feedbackPage() {
    if (!$('#fbRoot')) return;
    var r = read('hm_last_result', null);
    if (!r) return; // keep static sample if no run yet

    var ring = $('#fbRing'), scoreEl = $('#fbScore');
    if (ring) ring.style.setProperty('--p', r.overall);
    if (scoreEl) { scoreEl.setAttribute('data-count', r.overall); }

    var msg = $('#fbMessage');
    if (msg) {
      msg.textContent = r.overall >= 80 ? 'Kết quả xuất sắc! Bạn đã thể hiện rất tốt theo cấu trúc STAR.'
        : r.overall >= 65 ? 'Kết quả tốt! Bạn đang tiến bộ, hãy chú ý phần Hành động và Kết quả.'
        : 'Khởi đầu ổn! Hãy luyện tập thêm để trình bày chi tiết và có số liệu hơn.';
    }
    var roleEl = $('#fbRole'); if (roleEl) roleEl.textContent = r.role;

    // STAR items
    var labels = { S: 'Bối cảnh (S)', T: 'Nhiệm vụ (T)', A: 'Hành động (A)', R: 'Kết quả (R)' };
    var notes = {
      S: ['Bối cảnh được mô tả rõ ràng, dễ hình dung.', 'Hãy nêu bối cảnh cụ thể hơn (thời gian, vai trò).'],
      T: ['Nhiệm vụ được trình bày mạch lạc.', 'Cần làm rõ trách nhiệm cá nhân của bạn.'],
      A: ['Hành động cụ thể, có tính thuyết phục.', 'Nên trình bày chi tiết các bước hành động hơn.'],
      R: ['Kết quả có số liệu, rất tốt.', 'Nên bổ sung kết quả đo lường được (số liệu).']
    };
    ['S', 'T', 'A', 'R'].forEach(function (k) {
      var item = $('.star-item[data-k="' + k + '"]');
      if (!item) return;
      var good = r.subs[k] >= 70;
      item.classList.toggle('good', good);
      item.classList.toggle('warn', !good);
      var badge = good ? '<span class="badge badge--success">Tốt</span>' : '<span class="badge badge--warning">Cần cải thiện</span>';
      var h4 = $('h4', item); if (h4) h4.innerHTML = labels[k] + ' ' + badge + ' <span class="muted" style="font-weight:600">' + r.subs[k] + '/100</span>';
      var p = $('p', item); if (p) p.textContent = notes[k][good ? 0 : 1];
    });

    // Sub-score bars
    var sub = $('#fbSubscores');
    if (sub) {
      var rows = [
        ['Bối cảnh (S)', r.subs.S], ['Nhiệm vụ (T)', r.subs.T],
        ['Hành động (A)', r.subs.A], ['Kết quả (R)', r.subs.R],
        ['Sự rõ ràng', r.clarity]
      ];
      sub.innerHTML = rows.map(function (row) {
        return '<div class="row"><span class="k">' + row[0] + '</span>' +
          '<div class="bar"><span data-w="' + row[1] + '"></span></div>' +
          '<span class="v">' + row[1] + '</span></div>';
      }).join('');
      // animate bars when visible
      setTimeout(function () { $all('#fbSubscores .bar > span').forEach(function (s) { s.style.width = s.getAttribute('data-w') + '%'; }); }, 150);
    }

    // re-run counter for the score number
    var sc = $('#fbScore'); if (sc) animateCount(sc);
  }

  /* =====================================================================
     DASHBOARD — greeting, profile/settings, charts
     ===================================================================== */
  var chartRefs = { line: null, doughnut: null };
  function chartColors() {
    var cs = getComputedStyle(root);
    var dark = root.getAttribute('data-theme') === 'dark';
    return {
      primary: (cs.getPropertyValue('--primary') || '#03BFFF').trim(),
      ink: dark ? '#DCE4F1' : '#1B1D21',
      muted: dark ? '#93A2B8' : '#6B7280',
      grid: dark ? 'rgba(255,255,255,.08)' : 'rgba(16,24,40,.08)',
      fillTop: dark ? 'rgba(3,191,255,.35)' : 'rgba(3,191,255,.28)',
      fillBottom: 'rgba(3,191,255,0)',
      palette: ['#03BFFF', '#5B6BFF', '#22C55E', '#F59E0B', '#FF6B9A']
    };
  }
  function dashboardPage() {
    if (!$('#dashboard')) return;
    var profile = getProfile();

    var greet = $('#dashGreet');
    if (greet) greet.textContent = 'Xin chào, ' + (profile.name || 'bạn');
    var goalEl = $('#dashGoal');
    if (goalEl && (profile.role || profile.field)) {
      goalEl.textContent = 'Mục tiêu: ' + (profile.role || '—') + (profile.field ? ' · ' + profile.field : '');
    }

    // History rows + last score
    var hist = read('hm_history', []);
    if (!Array.isArray(hist)) hist = [];
    var last = read('hm_last_result', null);
    if (last) {
      var ls = $('#statLastScore'); if (ls) ls.firstChild && (ls.firstChild.textContent = last.overall);
    }
    var tbody = $('#dashHistory');
    if (tbody && hist.length) {
      var extra = hist.slice().reverse().slice(0, 5).map(function (h) {
        var d = new Date(h.date);
        var ds = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
        var cls = h.score >= 65 ? 'badge--success' : 'badge--warning';
        return '<tr><td>' + ds + '</td><td>' + h.role + '</td><td><span class="badge ' + cls + '">' + h.score + '/100</span></td><td><a href="feedback.html">Xem phản hồi</a></td></tr>';
      }).join('');
      if (extra) tbody.innerHTML = extra + tbody.innerHTML;
    }

    // Profile/settings form
    var pf = $('#profileForm');
    if (pf) {
      var fName = pf.querySelector('#pfName'), fRole = pf.querySelector('#pfRole'), fField = pf.querySelector('#pfField'), fBio = pf.querySelector('#pfBio');
      if (fName) fName.value = profile.name || '';
      if (fRole) fRole.value = profile.role || '';
      if (fField) fField.value = profile.field || '';
      if (fBio) fBio.value = profile.bio || '';
      pf.addEventListener('submit', function (e) {
        e.preventDefault();
        var p = getProfile();
        p.name = fName ? fName.value.trim() : p.name;
        p.role = fRole ? fRole.value.trim() : p.role;
        p.field = fField ? fField.value.trim() : p.field;
        p.bio = fBio ? fBio.value.trim() : p.bio;
        store('hm_profile', p);
        applyProfileToChrome();
        if (greet) greet.textContent = 'Xin chào, ' + (p.name || 'bạn');
        if (goalEl) goalEl.textContent = 'Mục tiêu: ' + (p.role || '—') + (p.field ? ' · ' + p.field : '');
        var ok = $('#pfSaved'); if (ok) { ok.style.display = 'inline-flex'; setTimeout(function () { ok.style.display = 'none'; }, 2200); }
      });
    }

    buildCharts(hist);
    doc.addEventListener('hm:themechange', function () { buildCharts(read('hm_history', [])); });
  }

  function buildCharts(hist) {
    if (typeof window.Chart === 'undefined') return;
    if (!Array.isArray(hist)) hist = [];
    var c = chartColors();
    Chart.defaults.font.family = "'Be Vietnam Pro', system-ui, sans-serif";
    Chart.defaults.color = c.muted;

    // Progress line
    var lineCanvas = $('#chartProgress');
    if (lineCanvas) {
      var sample = [62, 68, 64, 72, 78, 85];
      var sampleLabels = ['Buổi 1', 'Buổi 2', 'Buổi 3', 'Buổi 4', 'Buổi 5', 'Buổi 6'];
      var data, labels;
      if (hist.length >= 2) {
        var recent = hist.slice(-8);
        data = recent.map(function (h) { return h.score; });
        labels = recent.map(function (h, i) { return 'Buổi ' + (hist.length - recent.length + i + 1); });
      } else { data = sample; labels = sampleLabels; }

      if (chartRefs.line) chartRefs.line.destroy();
      var ctx = lineCanvas.getContext('2d');
      var grad = ctx.createLinearGradient(0, 0, 0, 260);
      grad.addColorStop(0, c.fillTop); grad.addColorStop(1, c.fillBottom);
      chartRefs.line = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Điểm STAR', data: data, borderColor: c.primary, backgroundColor: grad, fill: true, tension: .4, borderWidth: 3, pointBackgroundColor: c.primary, pointRadius: 4, pointHoverRadius: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#001B3F' } },
          scales: {
            y: { suggestedMin: 40, suggestedMax: 100, grid: { color: c.grid }, ticks: { color: c.muted } },
            x: { grid: { display: false }, ticks: { color: c.muted } }
          }
        }
      });
    }

    // Skills doughnut
    var dCanvas = $('#chartSkills');
    if (dCanvas) {
      var r = read('hm_last_result', null);
      var vals = r ? [r.subs.S, r.subs.T, r.subs.A, r.subs.R, r.clarity] : [82, 78, 64, 60, 75];
      if (chartRefs.doughnut) chartRefs.doughnut.destroy();
      chartRefs.doughnut = new Chart(dCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Bối cảnh', 'Nhiệm vụ', 'Hành động', 'Kết quả', 'Sự rõ ràng'],
          datasets: [{ data: vals, backgroundColor: c.palette, borderColor: 'transparent', borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: { legend: { position: 'bottom', labels: { color: c.ink, usePointStyle: true, padding: 14, font: { size: 12 } } } }
        }
      });
    }
  }

  /* =====================================================================
     ONBOARDING — persist profile across steps
     ===================================================================== */
  function onboardingProfile() {
    var form = $('#obProfileForm');
    if (!form) return;
    var p = getProfile();
    var name = form.querySelector('#name'), bio = form.querySelector('#bio');
    if (name && p.name) name.value = p.name;
    if (bio && p.bio) bio.value = p.bio;

    // Tag input (hobbies): Enter to add, × to remove
    var tagsWrap = form.querySelector('.tags');
    var hobbyInput = form.querySelector('#hobby');
    function bindRemove(tag) {
      var btn = tag.querySelector('button');
      if (btn) btn.addEventListener('click', function () { tag.remove(); });
    }
    if (tagsWrap) $all('.tag', tagsWrap).forEach(bindRemove);
    if (tagsWrap && p.hobbies && p.hobbies.length) {
      tagsWrap.innerHTML = '';
      p.hobbies.forEach(function (h) {
        var tag = el('span', 'tag', h + ' <button type="button" aria-label="Xóa">×</button>');
        tagsWrap.appendChild(tag); bindRemove(tag);
      });
    }
    if (hobbyInput && tagsWrap) {
      hobbyInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var v = hobbyInput.value.trim();
          if (!v) return;
          var tag = el('span', 'tag', v + ' <button type="button" aria-label="Xóa">×</button>');
          tagsWrap.appendChild(tag); bindRemove(tag);
          hobbyInput.value = '';
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var prof = getProfile();
      if (name) prof.name = name.value.trim();
      if (bio) prof.bio = bio.value.trim();
      var hobbyEls = $all('.tags .tag');
      prof.hobbies = hobbyEls.map(function (t) { return t.firstChild.textContent.trim(); });
      store('hm_profile', prof);
      window.location.href = 'onboarding-goal.html';
    });
  }
  function onboardingGoal() {
    var form = $('#obGoalForm');
    if (!form) return;
    var p = getProfile();
    buildCascade(form, {
      fieldPlaceholder: 'Chọn ngành nghề',
      posPlaceholder: 'Chọn vị trí',
      field: p.field,
      role: p.role
    });
    var field = form.querySelector('#field'), pos = form.querySelector('#pos'), exp = form.querySelector('#exp');
    if (exp && p.exp) exp.value = p.exp;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var prof = getProfile();
      if (field) prof.field = field.value;
      if (pos) prof.role = pos.value;
      if (exp) prof.exp = exp.value;
      store('hm_profile', prof);
      window.location.href = 'onboarding-summary.html';
    });
  }
  function onboardingSummary() {
    if (!$('#obSummary')) return;
    var p = getProfile();
    function set(id, val) { var n = $('#' + id); if (n && val) n.textContent = val; }
    set('sumField', p.field);
    set('sumRole', p.role);
    set('sumExp', p.exp);
    set('sumName', p.name);
    set('sumBio', p.bio);
    if (p.hobbies && p.hobbies.length) set('sumHobbies', p.hobbies.join(', '));
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init() {
    enhanceChrome();
    applyProfileToChrome();
    stickyHeader();
    mobileMenu();
    accountDropdown();
    segmentedControls();
    starWidgets();
    printButtons();
    revealOnScroll();
    counters();
    parallax();
    carousel();
    faqAccordion();
    questionsPage();
    interviewSetup();
    interviewSim();
    feedbackPage();
    dashboardPage();
    onboardingProfile();
    onboardingGoal();
    onboardingSummary();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
