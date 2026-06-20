/* ============================================================
   THE BRITISH INVASION YEARS — main.js
   Vanilla JS: header scroll, mobile nav, parallax, tour render,
   video, newsletter, scroll-reveal, lightbox.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Scroll-reveal observer (exposed via window.LWS) ---------- */
  window.LWS = window.LWS || {};

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  window.LWS.observe = function (el) {
    el.classList.add('reveal');
    revealObserver.observe(el);
  };

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------- Header: frosted on scroll ---------- */
  var hdr = document.getElementById('hdr');
  if (hdr) {
    window.addEventListener('scroll', function () {
      hdr.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ---------- Mobile drawer ---------- */
  var hamburger = document.getElementById('hamburger');
  var drawer = document.getElementById('navDrawer');
  if (hamburger && drawer) {
    hamburger.addEventListener('click', function () {
      var open = drawer.classList.toggle('open');
      hamburger.classList.toggle('is-open', open);
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        drawer.classList.remove('open');
        hamburger.classList.remove('is-open');
      });
    });
  }

  /* ---------- Hero parallax ---------- */
  var heroImg = document.getElementById('heroImg');
  if (heroImg) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < 900) heroImg.style.transform = 'translateY(' + (y * 0.2) + 'px) scale(1.03)';
    }, { passive: true });
  }

  /* ---------- Tour dates (Decap JSON) ----------
     Public pages show UPCOMING shows only; passed dates auto-hide. Every show
     (past + upcoming) stays in content/tour.json, so the band still sees the
     old shows in the Decap dashboard. Editors keep ONE simple list. */
  var tourList = document.getElementById('tourList');
  if (tourList) {
    var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

    function esc(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function localDate(iso) {                       // 'YYYY-MM-DD' → local Date (no TZ shift)
      var p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
      return p ? new Date(+p[1], +p[2] - 1, +p[3]) : null;
    }

    fetch('content/tour.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());  // midnight

        var shows = (data.shows || [])
          .map(function (s) { return { s: s, d: localDate(s.date) }; })
          .filter(function (o) { return o.d && o.d >= today; })   // auto-hide passed dates
          .sort(function (a, b) { return a.d - b.d; });           // soonest first

        var path = window.location.pathname;
        var isHome = path.indexOf('index') !== -1 || path === '/' ||
                     path.endsWith('/build/') || path.endsWith('/');
        if (tourList.dataset.all === 'true') isHome = false;
        var items = isHome ? shows.slice(0, 6) : shows;

        if (!items.length) {
          tourList.innerHTML = '<p class="tour-empty">New dates coming soon — check back shortly.</p>';
          return;
        }

        items.forEach(function (o) {
          var s = o.s, d = o.d, tba = s.status === 'tba';
          var when = DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
          var card = document.createElement('div');
          card.className = 'show card-glow' + (tba ? ' tba' : '');
          card.innerHTML =
            '<div class="show-date">' + when + '</div>' +
            '<div class="show-venue">' + esc(s.venue) + '</div>' +
            '<div class="show-addr">' + esc(s.city) + '</div>' +
            '<div class="show-time">' + esc(s.time) + '</div>' +
            (s.badge ? '<div class="show-badge">' + esc(s.badge) + '</div>' : '') +
            '<div class="show-cta">' +
              '<a class="btn ' + (tba ? 'btn-outline' : 'btn-primary') + '" href="' +
                (tba ? '#news' : esc(s.ticketUrl)) + '"' +
                (tba ? '' : ' target="_blank" rel="noopener"') + '>' +
                (tba ? 'RSVP' : 'GET TICKETS') + '</a>' +
            '</div>';
          tourList.appendChild(card);
          window.LWS.observe(card);
        });
      })
      .catch(function () { /* leave existing markup if the feed fails */ });
  }

  /* ---------- Video poster → YouTube embed ---------- */
  var poster = document.getElementById('videoPoster');
  if (poster) {
    poster.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube.com/embed/72q_s4ppvxI?autoplay=1&rel=0';
      f.allow = 'autoplay; encrypted-media; fullscreen';
      f.allowFullscreen = true;
      f.title = 'British Invasion Years Promo Video';
      document.getElementById('videoBox').appendChild(f);
      this.remove();
    });
  }

  /* ---------- Video grid cards (videos page) → open on YouTube ---------- */
  document.querySelectorAll('.vid-link').forEach(function (el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
      var url = el.getAttribute('data-yt');
      if (url) window.open(url, '_blank', 'noopener');
    });
  });

  /* ---------- Newsletter (client-side fallback) ---------- */
  var nf = document.getElementById('newsForm');
  if (nf) {
    nf.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.getElementById('newsNote');
      var form = this;
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        if (res.ok) {
          note.textContent = 'Thank you for signing up! Check your email to confirm. Cheers!';
          note.style.color = 'var(--accent-soft)';
          form.querySelectorAll('input').forEach(function (i) { i.value = ''; });
        } else {
          note.textContent = 'Hmm — something went wrong. Please try again or email us.';
          note.style.color = 'var(--accent-soft)';
        }
      }).catch(function () {
        note.textContent = 'Network error — please try again or email us.';
        note.style.color = 'var(--accent-soft)';
      });
    });
  }

  /* ---------- Lightbox (gallery pages) ---------- */
  function initLightbox() {
    var cells = document.querySelectorAll('.gal-cell img, .gcell img, .strip .cell img');
    var imgs = Array.prototype.map.call(cells, function (img) { return { src: img.src, alt: img.alt }; });
    if (!imgs.length) return;

    var overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.innerHTML =
      '<button class="lb-close" aria-label="Close">&#x2715;</button>' +
      '<button class="lb-prev" aria-label="Previous">&#8592;</button>' +
      '<img class="lb-img" src="" alt="">' +
      '<button class="lb-next" aria-label="Next">&#8594;</button>';
    document.body.appendChild(overlay);

    var cur = 0;
    var lbImg = overlay.querySelector('.lb-img');
    function show(i) {
      cur = (i + imgs.length) % imgs.length;
      lbImg.src = imgs[cur].src;
      lbImg.alt = imgs[cur].alt;
      overlay.classList.add('open');
      // retrigger the open animation on every image change
      lbImg.classList.remove('pop');
      void lbImg.offsetWidth;
      lbImg.classList.add('pop');
    }

    Array.prototype.forEach.call(cells, function (img, i) {
      var cell = img.closest('.gcell, .gal-cell, .cell');
      if (cell) cell.addEventListener('click', function () { show(i); });
    });
    overlay.querySelector('.lb-close').addEventListener('click', function () { overlay.classList.remove('open'); });
    overlay.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
    overlay.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('open'); });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') overlay.classList.remove('open');
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  }
  if (document.querySelector('.gallery-page') || document.querySelector('.gal') || document.querySelector('.strip')) initLightbox();

  /* ---------- Marquee chase bulbs ----------
     Coordinates (% of frame) mapped from the original lit artwork so the
     CSS bulbs seat exactly in the frame's sockets. Two rows of 29. */
  (function initMarquee() {
    var box = document.querySelector('.marquee-bulbs');
    if (!box) return;
    // Channel geometry: data-* on the element (final artwork) or the original-frame defaults.
    var COLS = parseInt(box.dataset.count, 10) || 29;
    var rows = box.dataset.rows ? box.dataset.rows.split(',').map(Number) : [17.0, 84.2];
    var xr = box.dataset.x ? box.dataset.x.split(',').map(Number) : [13.34, 87.19];
    // bulbs hidden behind the man/ladder (they'd be physically blocked)
    var skip = [
      (box.dataset.skipTop || '').split(',').filter(Boolean).map(Number),
      (box.dataset.skipBot || '').split(',').filter(Boolean).map(Number)
    ];
    var palette = ['r', 'w', 'a', 'w'];         // red, warm-white, amber, warm-white
    var color = { r: '#ff352b', w: '#fff1cf', a: '#ffb236' };
    var frag = document.createDocumentFragment();
    rows.forEach(function (y, ri) {
      for (var c = 0; c < COLS; c++) {
        if (skip[ri] && skip[ri].indexOf(c) !== -1) continue;
        var x = xr[0] + (xr[1] - xr[0]) * (c / (COLS - 1));
        var b = document.createElement('i');
        b.style.left = x.toFixed(2) + '%';
        b.style.top = y.toFixed(2) + '%';
        b.style.setProperty('--c', color[palette[c % palette.length]]);
        b.style.animationDelay = (c * 0.055).toFixed(3) + 's';  // left-to-right wave
        frag.appendChild(b);
      }
    });
    box.appendChild(frag);
  })();

})();
