/* HireMate — shared interactions */
(function () {
  'use strict';

  // ---- Sticky header shadow on scroll ----
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Mobile menu toggle ----
  var hamburger = document.querySelector('.hamburger');
  var mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target === mobileMenu) mobileMenu.classList.remove('open');
    });
  }

  // ---- Avatar account dropdown ----
  var account = document.querySelector('.account');
  if (account) {
    var accBtn = account.querySelector('.account-btn');
    accBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      account.classList.toggle('open');
    });
    document.addEventListener('click', function () {
      account.classList.remove('open');
    });
  }

  // ---- Segmented controls ----
  document.querySelectorAll('.segmented').forEach(function (seg) {
    seg.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var hidden = seg.parentElement.querySelector('input[type="hidden"]');
      if (hidden) hidden.value = btn.dataset.value || btn.textContent.trim();
    });
  });

  // ---- Star rating widget ----
  document.querySelectorAll('.star-row').forEach(function (row) {
    var stars = Array.prototype.slice.call(row.querySelectorAll('button'));
    function paint(n) {
      stars.forEach(function (s, i) { s.classList.toggle('on', i < n); });
    }
    stars.forEach(function (star, idx) {
      star.addEventListener('mouseenter', function () { paint(idx + 1); });
      star.addEventListener('click', function () { row.dataset.value = idx + 1; paint(idx + 1); });
    });
    row.addEventListener('mouseleave', function () { paint(parseInt(row.dataset.value || '0', 10)); });
  });

  // ---- Print button ----
  document.querySelectorAll('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });

  // ---- Reveal on load (content already visible; this just animates in) ----
  // Handled purely by CSS .reveal classes.
})();
