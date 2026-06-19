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

  /* ---------- Tour data ---------- */
  var SHOWS = [
    { dow: 'Saturday', date: 'May 30, 2026', venue: 'The Vogel at Count Basie Center for the Arts', addr: '99 Monmouth St, Red Bank, NJ 07701', time: '7:30 PM', badge: 'Limited seats just released', cta: 'GET TICKETS', tix: true, ticketUrl: 'https://www.bandsintown.com/e/107660462' },
    { dow: 'Saturday', date: 'June 6, 2026', venue: 'Harrington Raceway &amp; Casino', addr: '15 Harrington&ndash;Houston Hwy, Harrington, DE', time: '6:00 PM &middot; Show 1 of 2', cta: 'GET TICKETS', tix: true, ticketUrl: 'https://www.bandsintown.com/e/108246603' },
    { dow: 'Saturday', date: 'June 6, 2026', venue: 'Harrington Raceway &amp; Casino', addr: '15 Harrington&ndash;Houston Hwy, Harrington, DE', time: '8:30 PM &middot; Show 2 of 2', cta: 'GET TICKETS', tix: true, ticketUrl: 'https://www.bandsintown.com/e/107973072' },
    { dow: 'Friday', date: 'July 10, 2026', venue: 'Cape May Convention Hall', addr: '714 Beach Ave, Cape May, NJ 08204', time: '8:00 PM', cta: 'GET TICKETS', tix: true, ticketUrl: 'https://www.bandsintown.com/e/107893002' },
    { dow: 'Sunday', date: 'July 26, 2026', venue: 'The Lamp Theatre', addr: '222 Main St, Irwin, PA 15642', time: '7:00 PM', cta: 'GET TICKETS', tix: true, ticketUrl: 'https://www.bandsintown.com/e/107655050' },
    { dow: 'Saturday', date: 'Sept 19, 2026', venue: 'Backlash Fest', addr: 'Millsboro, DE', time: '8:00 PM', cta: 'GET TICKETS', tix: true, ticketUrl: 'https://www.bandsintown.com/e/108117859' },
    { dow: 'Saturday', date: 'Nov 7, 2026', venue: 'Tupelo Music Hall', addr: '10 A St, Derry, NH 03038', time: '8:00 PM', cta: 'GET TICKETS', tix: true, ticketUrl: 'https://www.bandsintown.com/e/108386560' },
    { dow: 'Thursday', date: 'Apr 8, 2027', venue: 'Concert Announcement Coming Soon', addr: 'The Villages, FL', time: '7:00 PM', cta: 'RSVP', tba: true },
    { dow: 'Saturday', date: 'Oct 23, 2027', venue: 'Concert Announcement Coming Soon', addr: 'Windber, PA', time: '7:30 PM', cta: 'RSVP', tba: true }
  ];

  var list = document.getElementById('tourList');
  if (list) {
    var path = window.location.pathname;
    var isHome = path.indexOf('index') !== -1 || path === '/' || path.endsWith('/build/') || path.endsWith('/');
    if (list.dataset.all === 'true') isHome = false;
    var items = isHome ? SHOWS.slice(0, 6) : SHOWS;

    items.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'show card-glow' + (s.tba ? ' tba' : '');
      card.innerHTML =
        '<div class="show-date">' + s.dow + ', ' + s.date + '</div>' +
        '<div class="show-venue">' + s.venue + '</div>' +
        '<div class="show-addr">' + s.addr + '</div>' +
        '<div class="show-time">' + s.time + '</div>' +
        (s.badge ? '<div class="show-badge">' + s.badge + '</div>' : '') +
        '<div class="show-cta">' +
          '<a class="btn ' + (s.tix ? 'btn-primary' : 'btn-outline') + '" href="' + (s.tix ? s.ticketUrl : '#news') + '"' +
          (s.tix ? ' target="_blank" rel="noopener"' : '') + '>' + s.cta + '</a>' +
        '</div>';
      list.appendChild(card);
      window.LWS.observe(card);
    });
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
    var COLS = 29;
    var Y_TOP = 17.0, Y_BOT = 84.2;
    var X0 = 13.34, X1 = 87.19;                 // first/last bulb centers
    var palette = ['r', 'w', 'a', 'w'];         // red, warm-white, amber, warm-white
    var color = { r: '#ff352b', w: '#fff1cf', a: '#ffb236' };
    var frag = document.createDocumentFragment();
    [Y_TOP, Y_BOT].forEach(function (y) {
      for (var c = 0; c < COLS; c++) {
        var x = X0 + (X1 - X0) * (c / (COLS - 1));
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
