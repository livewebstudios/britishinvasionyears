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

  /* Puts one document into a box: the pill, the name, an optional
     red flag line, the plain English line, the button, and the
     address under it. */
  function fill(box, item, buttonText) {
    box.appendChild(el('span', 'kind ' + (item.kindClass || ''), item.kind));
    box.appendChild(el('span', 'name', item.name));
    if (item.flag) { box.appendChild(el('span', 'flag', item.flag)); }
    box.appendChild(el('span', 'what', item.what));

    var go = newTab(el('a', 'go', buttonText));
    go.href = item.href;
    box.appendChild(go);

    var url = newTab(el('a', 'url', item.show || item.href));
    url.href = item.href;
    box.appendChild(url);

    return box;
  }

  function draw(sections) {
    rows.textContent = '';

    sections.forEach(function (section) {
      var h = el('h2', 'sec', section.section);
      rows.appendChild(h);

      if (section.note) {
        rows.appendChild(el('p', 'note', section.note));
      }

      section.rows.forEach(function (row) {
        var card = el('div', 'doc');
        fill(card, row, 'Open it');

        /* A second document that belongs with the first one.
           Same card, under a dividing line. */
        if (row.also) {
          var extra = el('div', 'also');
          fill(extra, row.also, row.also.label || 'Open it');
          card.appendChild(extra);
        }

        rows.appendChild(card);
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
