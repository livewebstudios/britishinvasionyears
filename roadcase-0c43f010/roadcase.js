/* ============================================================
   BAND DOCUMENTS, PRIVATE PAGE
   ------------------------------------------------------------
   1. Ask the links function if the browser already has a valid
      session cookie. If yes, draw the cards and stop.
   2. If not, load the Google button, get an ID token, and post
      it. The function does all the checking. This file never
      decides who is allowed in.
   3. Nothing here holds a link. The cards are built from what
      the function sends back.
   ============================================================ */

(function () {
  'use strict';

  var LINKS_FN  = '../.netlify/functions/roadcase-links';
  var CONFIG_FN = '../.netlify/functions/roadcase-config';

  var gate    = document.getElementById('gate');
  var gbutton = document.getElementById('gbutton');
  var msg     = document.getElementById('gate-msg');
  var loading = document.getElementById('loading');
  var rows    = document.getElementById('rows');
  var foot    = document.getElementById('foot');

  /* ---------- small helpers ---------- */

  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }

  function say(text) {
    msg.textContent = text || '';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text) { n.textContent = text; }
    return n;
  }

  function newTab(a) {
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  /* ---------- drawing the page ---------- */

  /* The button is a rack-mount VU meter, same as the one on the
     Live Band Web Studios pricing page. The dial is fixed art,
     no link data in it. Each button gets its own gradient id and
     its needle peaks at a slightly different spot on hover. */
  var meters = 0;
  var PEAKS = ['34deg', '18deg', '28deg', '40deg', '22deg'];

  function meterArt(id) {
    var ticks = [
      [27.69, 37.76, 34.00, 42.68, 1.6], [33.65, 31.59, 36.54, 35.04, 1],
      [40.12, 27.14, 44.00, 34.14, 1.6], [46.65, 24.23, 48.12, 28.49, 1],
      [53.59, 22.50, 54.84, 30.41, 1.6], [60.72, 22.01, 60.64, 26.51, 1],
      [67.82, 22.75, 66.30, 30.61, 1.6], [74.69, 24.72, 73.08, 28.92, 1],
      [81.12, 27.86, 77.00, 34.71, 1.6], [87.43, 32.53, 84.42, 35.88, 1],
      [92.31, 37.76, 86.00, 42.68, 1.6]
    ].map(function (t) {
      return '<line x1="' + t[0] + '" y1="' + t[1] + '" x2="' + t[2] + '" y2="' + t[3] +
        '" stroke="#eaf3ff" stroke-width="' + t[4] + '" stroke-linecap="round" opacity="' +
        (t[4] > 1 ? '.95' : '.7') + '"/>';
    }).join('');

    return '<svg viewBox="0 0 120 76" aria-hidden="true">' +
      '<defs><radialGradient id="' + id + '" cx="50%" cy="78%" r="78%">' +
      '<stop offset="0%" stop-color="#3f92dd"/><stop offset="55%" stop-color="#1f66b4"/>' +
      '<stop offset="100%" stop-color="#0b2f56"/></radialGradient></defs>' +
      '<rect x="2" y="2" width="116" height="72" rx="5" fill="url(#' + id + ')"/>' +
      '<path d="M27.69 37.76 A 41 41 0 0 1 92.31 37.76" fill="none" stroke="#eaf3ff" stroke-width="1.4" stroke-linecap="round" opacity=".92"/>' +
      ticks +
      '<path d="M81.12 27.86 A 41 41 0 0 1 92.31 37.76" fill="none" stroke="#ff5a4d" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>' +
      '<g class="go-needle"><line x1="60" y1="63" x2="60" y2="18" stroke="#0b1220" stroke-width="1.5" stroke-linecap="round"/></g>' +
      '<circle cx="60" cy="63" r="3.2" fill="#0b1220"/><circle cx="60" cy="63" r="1.2" fill="#8fbdf0"/>' +
      '</svg>';
  }

  function meterButton(href, text) {
    var go = newTab(el('a', 'go'));
    go.href = href;
    go.style.setProperty('--peak', PEAKS[meters % PEAKS.length]);

    var meter = el('span', 'go-meter');
    meter.innerHTML = meterArt('go-lamp-' + (meters += 1));
    meter.appendChild(el('span', 'go-glass'));

    var plate = el('span', 'go-plate');
    plate.appendChild(el('span', 'go-label', text + ' \u2192'));
    plate.appendChild(el('span', 'go-sub', 'Opens in a new tab'));

    var face = el('span', 'go-face');
    face.appendChild(meter);
    face.appendChild(plate);

    go.appendChild(el('span', 'go-cap l'));
    go.appendChild(face);
    go.appendChild(el('span', 'go-cap r'));
    return go;
  }

  /* Puts one document into a box: the pill, the name, an optional
     red flag line, the plain English line, the button, and the
     address under it. */
  function fill(box, item, buttonText) {
    box.appendChild(el('span', 'kind ' + (item.kindClass || ''), item.kind));
    box.appendChild(el('span', 'name', item.name));
    if (item.flag) { box.appendChild(el('span', 'flag', item.flag)); }
    box.appendChild(el('span', 'what', item.what));

    box.appendChild(meterButton(item.href, buttonText));

    var url = newTab(el('a', 'url', item.show || item.href));
    url.href = item.href;
    box.appendChild(url);

    return box;
  }

  /* Road case hardware. The steel is drawn once into a hidden
     sprite, then every case points at it. */
  var SPRITE =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="rc-steel" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#f3f5f7"/><stop offset=".45" stop-color="#b3b9c0"/>' +
    '<stop offset=".7" stop-color="#dfe3e7"/><stop offset="1" stop-color="#8e949b"/></linearGradient>' +
    '<radialGradient id="rc-ball" cx=".36" cy=".32" r=".75">' +
    '<stop offset="0" stop-color="#ffffff"/><stop offset=".18" stop-color="#e3e7eb"/>' +
    '<stop offset=".55" stop-color="#8f959d"/><stop offset=".85" stop-color="#4b5056"/>' +
    '<stop offset="1" stop-color="#2d3035"/></radialGradient>' +
    '<radialGradient id="rc-rivet" cx=".4" cy=".35" r=".7">' +
    '<stop offset="0" stop-color="#fafbfc"/><stop offset=".6" stop-color="#8d939a"/>' +
    '<stop offset="1" stop-color="#3c4046"/></radialGradient>' +
    '<linearGradient id="rc-dish" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#6f757c"/><stop offset="1" stop-color="#c9ced3"/></linearGradient>' +
    '<symbol id="rc-corner" viewBox="0 0 64 64">' +
    '<path d="M7 2 H42 A9 9 0 0 1 42 20 H29 Q20 20 20 29 V42 A9 9 0 0 1 2 42 V7 A5 5 0 0 1 7 2 Z" fill="url(#rc-steel)" stroke="#5f656c" stroke-width=".9"/>' +
    '<path d="M8 4 H41" stroke="#fff" stroke-opacity=".7" stroke-width=".8" fill="none"/>' +
    '<circle cx="40" cy="11" r="2.8" fill="url(#rc-rivet)" stroke="#3c4046" stroke-width=".4"/>' +
    '<circle cx="11" cy="40" r="2.8" fill="url(#rc-rivet)" stroke="#3c4046" stroke-width=".4"/>' +
    '<circle cx="12.5" cy="12.5" r="12" fill="url(#rc-ball)" stroke="#2d3035" stroke-width=".6"/>' +
    '<ellipse cx="9" cy="8" rx="3.6" ry="2.4" fill="#fff" opacity=".75"/>' +
    '</symbol>' +
    '<symbol id="rc-latch" viewBox="0 0 40 30">' +
    '<rect x="1" y="1" width="38" height="28" rx="4" fill="url(#rc-steel)" stroke="#5f656c" stroke-width=".8"/>' +
    '<rect x="8" y="6" width="24" height="18" rx="3" fill="url(#rc-dish)" stroke="#4b5056" stroke-width=".6"/>' +
    '<rect x="11" y="13" width="18" height="4" rx="2" fill="url(#rc-steel)" stroke="#4b5056" stroke-width=".5"/>' +
    '<circle cx="20" cy="15" r="4.2" fill="url(#rc-ball)" stroke="#3c4046" stroke-width=".5"/>' +
    '<circle cx="4.5" cy="4.5" r="1.6" fill="url(#rc-rivet)"/><circle cx="35.5" cy="4.5" r="1.6" fill="url(#rc-rivet)"/>' +
    '<circle cx="4.5" cy="25.5" r="1.6" fill="url(#rc-rivet)"/><circle cx="35.5" cy="25.5" r="1.6" fill="url(#rc-rivet)"/>' +
    '</symbol></defs></svg>';

  function part(cls, symbol) {
    var s = el('span', cls);
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<svg viewBox="' + (symbol === 'rc-corner' ? '0 0 64 64' : '0 0 40 30') +
      '" width="100%" height="100%"><use href="#' + symbol + '"/></svg>';
    return s;
  }

  function hardware(card) {
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) {
      card.appendChild(part('rc-corner ' + c, 'rc-corner'));
    });
    card.appendChild(part('rc-latch a', 'rc-latch'));
    card.appendChild(part('rc-latch b', 'rc-latch'));
  }

  function draw(sections) {
    rows.innerHTML = SPRITE;

    sections.forEach(function (section) {
      var h = el('h2', 'sec', section.section);
      rows.appendChild(h);

      if (section.note) {
        rows.appendChild(el('p', 'note', section.note));
      }

      var cases = el('div', 'cases');
      rows.appendChild(cases);

      section.rows.forEach(function (row) {
        var card = el('div', 'doc');
        fill(card, row, 'Open it');
        hardware(card);

        /* A second document that belongs with the first one.
           Same card, under a dividing line. */
        if (row.also) {
          var extra = el('div', 'also');
          fill(extra, row.also, row.also.label || 'Open it');
          card.appendChild(extra);
        }

        cases.appendChild(card);
      });
    });

    hide(loading);
    hide(gate);
    show(foot);
  }

  /* ---------- talking to the function ---------- */

  function askForLinks(credential) {
    var options = { method: 'GET', credentials: 'same-origin' };

    if (credential) {
      options = {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credential })
      };
    }

    return fetch(LINKS_FN, options).then(function (res) {
      if (res.ok) {
        return res.json().then(function (data) {
          draw(data.sections);
          return true;
        });
      }
      return res.json().catch(function () { return {}; }).then(function (body) {
        return { error: body.error || 'unknown', status: res.status };
      });
    });
  }

  /* ---------- the Google button ---------- */

  function onCredential(response) {
    say('One moment.');
    askForLinks(response.credential).then(function (result) {
      if (result === true) { return; }
      if (result.status === 403) {
        say('That account is not on the list. Tell Jon which email you used and he will add it.');
      } else {
        say('Something went wrong on our end. Try again in a minute, and tell Jon if it keeps happening.');
      }
    }).catch(function () {
      say('That did not go through. Check your signal and try again.');
    });
  }

  function waitForGoogle(tries) {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      return Promise.resolve(true);
    }
    if (tries <= 0) { return Promise.resolve(false); }
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(waitForGoogle(tries - 1)); }, 150);
    });
  }

  function startSignIn() {
    hide(loading);
    show(gate);

    fetch(CONFIG_FN, { credentials: 'same-origin' })
      .then(function (res) { return res.json(); })
      .then(function (config) {
        if (!config.clientId) {
          say('Sign in is not switched on yet. Tell Jon.');
          return;
        }
        return waitForGoogle(40).then(function (ready) {
          if (!ready) {
            say('The Google sign in button did not load. Refresh the page.');
            return;
          }
          window.google.accounts.id.initialize({
            client_id: config.clientId,
            callback: onCredential,
            auto_select: true,
            cancel_on_tap_outside: false,
            use_fedcm_for_prompt: true
          });
          window.google.accounts.id.renderButton(gbutton, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'rectangular',
            text: 'signin_with',
            width: 280
          });
          window.google.accounts.id.prompt();
        });
      })
      .catch(function () {
        say('Sign in could not start. Refresh the page, and tell Jon if it keeps happening.');
      });
  }

  /* ---------- signing out ---------- */

  document.getElementById('signout').addEventListener('click', function (event) {
    event.preventDefault();
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    fetch(LINKS_FN, { method: 'DELETE', credentials: 'same-origin' })
      .then(function () { window.location.reload(); })
      .catch(function () { window.location.reload(); });
  });

  /* ---------- go ---------- */

  askForLinks(null).then(function (result) {
    if (result === true) { return; }
    startSignIn();
  }).catch(function () {
    startSignIn();
  });
}());
