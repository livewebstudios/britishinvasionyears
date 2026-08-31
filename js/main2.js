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
      if (!entry.isIntersecting) return;
      // A block TALLER than the viewport can never expose 12% of itself, so a
      // plain 0.12 threshold leaves it at opacity 0 for good. The pre-rendered
      // post articles are 8000px+, which is what surfaced this. Those reveal as
      // soon as they enter; everything shorter keeps the original 12% trigger,
      // so the timing on the rest of the site is unchanged.
      var tall = entry.target.getBoundingClientRect().height > window.innerHeight;
      if (entry.intersectionRatio < 0.12 && !tall) return;
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: [0, 0.12] });

  window.LWS.observe = function (el) {
    el.classList.add('reveal');
    revealObserver.observe(el);
  };

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------- Deep links (#hash) ----------
     Every .reveal starts at opacity 0 / translateY(26px). On a deep link the
     browser jumps before those sections have revealed, so the target sits at
     the wrong offset and you land on whatever section happens to be mid-
     animation, showing its 26px overlap. Settle everything above the target
     first, then scroll. ---------- */
  function settleHash(instant) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
      // el is above the target, or contains it: reveal it now, no animation
      var rel = el.compareDocumentPosition(target);
      if ((rel & Node.DOCUMENT_POSITION_FOLLOWING) || (rel & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
        el.classList.add('in');
        revealObserver.unobserve(el);
      }
    });
    target.scrollIntoView({ block: 'start', behavior: instant ? 'instant' : 'auto' });
    // The header only restyles on a scroll event, and a programmatic jump does
    // not always fire one, so it can sit in its top-of-page state (oversized
    // guitar mark, no frosted bar) halfway down the document. Sync it here.
    var h = document.getElementById('hdr');
    if (h) h.classList.toggle('scrolled', window.scrollY > 40);
  }

  // Chrome restores the previous scroll position on a reload and on history
  // navigation, and it applies that restore AFTER our jump, so reloading a
  // /page#anchor URL silently drops you wherever you happened to be sitting
  // rather than on the anchor. Take scroll control for anchor arrivals only:
  // pages without a hash keep the browser's normal restore behaviour.
  if ('scrollRestoration' in history) {
    history.scrollRestoration = location.hash ? 'manual' : 'auto';
  }

  if (location.hash) {
    // arriving from another page: jump, never smooth-scroll the whole document
    settleHash(true);

    // An image that finishes late can move the target out from under that
    // first jump, so re-assert once everything has settled. Stop the moment
    // the reader scrolls for themselves, so we never yank the page back.
    var userScrolled = false;
    var markScrolled = function () { userScrolled = true; };
    window.addEventListener('wheel', markScrolled, { passive: true, once: true });
    window.addEventListener('touchstart', markScrolled, { passive: true, once: true });
    window.addEventListener('keydown', function (e) {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].indexOf(e.key) > -1) {
        userScrolled = true;
      }
    }, { once: true });

    window.addEventListener('load', function () {
      if (!userScrolled) settleHash(true);
      setTimeout(function () { if (!userScrolled) settleHash(true); }, 350);
    });
  }
  // clicking the nav on the page we are already on: let it glide
  window.addEventListener('hashchange', function () { settleHash(false); });

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

  /* ---------- Hero background rotation ----------
     Crossfades the images in images/hero/ in filename order. */
  var heroSlides = document.querySelectorAll('.hero-slide');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroSlides.length > 1 && !reduceMotion) {
    var heroIdx = 0;
    setInterval(function () {
      heroSlides[heroIdx].classList.remove('is-active');
      heroIdx = (heroIdx + 1) % heroSlides.length;
      heroSlides[heroIdx].classList.add('is-active');
    }, 6000);
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

        var frag = document.createDocumentFragment();
        var cards = [];
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
              // Ticket / RSVP button only when the show has a REAL link. A
              // "coming soon" date with no ticketUrl gets no dead RSVP button.
              (s.ticketUrl && String(s.ticketUrl).trim() !== ''
                ? '<a class="btn ' + (tba ? 'btn-outline btn-rsvp' : 'btn-primary') + '" href="' +
                    esc(s.ticketUrl) + '" target="_blank" rel="noopener">' +
                    (tba ? 'RSVP' : 'GET TICKETS') + '</a>'
                : '') +
              // "What to do in town" guide — on EVERY show that has a matching
              // blog post, announced or not. The guide is about the town, so it
              // reads fine long before the venue is confirmed.
              (s.whatToDoSlug
                ? '<a class="btn btn-outline" href="blog/' + esc(s.whatToDoSlug) + '.html">WHAT TO DO IN TOWN</a>'
                : '') +
            '</div>';
          frag.appendChild(card);
          cards.push(card);
        });
        // tools/prerender.js has already written these cards into the HTML for
        // crawlers. Clear them before hydrating or every show renders twice.
        tourList.innerHTML = '';
        tourList.appendChild(frag);              // single reflow instead of one per card
        cards.forEach(window.LWS.observe);       // observe after insertion (reveal-on-scroll)
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

  /* ---------- Lightbox (gallery pages + about page) ---------- */
  function initLightbox() {
    var sel = ['.gal-cell img', '.gcell img', '.strip .cell img',
               '.about-feature .af-media img', '.pb-col-media img', '.member-photo img'];
    /* the about page also lightboxes its two full-bleed photos; the click lands
       on the section so the whole photo is a target, minus the overlaid copy */
    if (document.querySelector('.about-feature')) {
      sel.push('.page-banner .hero-bg img', '.photo-band > img');
    }
    var cells = document.querySelectorAll(sel.join(', '));
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

    var WRAP = '.gcell, .gal-cell, .cell, .af-media, .pb-col-media, .member-photo, .photo-band, .page-banner';
    var OVERLAID = '.pb-cap, .banner-inner';
    Array.prototype.forEach.call(cells, function (img, i) {
      var cell = img.closest(WRAP) || img;
      var fullBleed = cell.matches('.photo-band, .page-banner');
      cell.classList.add('lb-target');
      cell.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        /* the full-bleed sections carry copy laid over the photo; clicks there
           belong to the copy (or to a nested cell of its own), not the backdrop */
        if (fullBleed && e.target.closest(OVERLAID)) return;
        show(i);
      });
      if (fullBleed) return;
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'button');
      cell.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); }
      });
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
  if (document.querySelector('.gallery-page') || document.querySelector('.gal') || document.querySelector('.strip') || document.querySelector('.about-feature')) initLightbox();

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

  /* ---------- Cursor follow-spot + glass lens ----------
     Builds its own DOM so every page picks it up from main.js alone.
     The beam tracks fast, the lens trails a touch behind, which is
     what gives it weight. Fine pointers only, and it bows out entirely
     when the visitor has asked for reduced motion. */
  (function initCursorSpot() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || calm.matches) return;

    var rig = document.createElement('div');
    rig.className = 'cursor-fx is-out';
    rig.setAttribute('aria-hidden', 'true');
    rig.innerHTML =
      '<div class="cursor-fx__beam"></div>' +
      '<div class="cursor-fx__lens"></div>';
    document.body.appendChild(rig);

    var beam = rig.querySelector('.cursor-fx__beam');
    var lens = rig.querySelector('.cursor-fx__lens');

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;  // target
    var bx = tx, by = ty;                                          // beam pos
    var lx = tx, ly = ty;                                          // lens pos
    var scale = 1, tScale = 1;                                     // lens swell on links
    var running = false, primed = false;

    function place() {
      beam.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0)';
      lens.style.transform = 'translate3d(' + lx + 'px,' + ly + 'px,0) scale(' + scale.toFixed(3) + ')';
    }

    function frame() {
      bx += (tx - bx) * 0.20;
      by += (ty - by) * 0.20;
      lx += (tx - lx) * 0.13;
      ly += (ty - ly) * 0.13;
      scale += (tScale - scale) * 0.12;
      place();

      // settle: stop the loop once everything has caught up
      if (Math.abs(tx - lx) < 0.4 && Math.abs(ty - ly) < 0.4 && Math.abs(tScale - scale) < 0.002) {
        running = false;
        return;
      }
      requestAnimationFrame(frame);
    }

    function kick() {
      if (running) return;
      running = true;
      requestAnimationFrame(frame);
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!primed) {          // first move: drop it straight onto the cursor
        primed = true;
        bx = lx = tx; by = ly = ty;
        place();              // seat it before it is made visible, so it never flashes at 0,0
        rig.classList.remove('is-out');
      }
      tScale = e.target && e.target.closest && e.target.closest('a, button, .btn, input, textarea, select') ? 0.86 : 1;
      kick();
    }, { passive: true });

    document.addEventListener('pointerdown', function () { tScale = 0.94; kick(); }, { passive: true });
    document.addEventListener('pointerup',   function () { tScale = 1;    kick(); }, { passive: true });

    document.addEventListener('mouseleave', function () { rig.classList.add('is-out'); });
    document.addEventListener('mouseenter', function () { if (primed) rig.classList.remove('is-out'); });
  })();

})();
