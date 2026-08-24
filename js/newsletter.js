/*!
 * British Invasion Years newsletter signup
 * Sends signups straight into the Mailchimp audience without the visitor
 * ever leaving the page. No jQuery, no dependencies, no page reload.
 *
 * Wires up EVERY <form class="news-form"> found on the page.
 * Input names must be FNAME, LNAME, EMAIL.
 * The bot-trap field is injected automatically, do not add it to the HTML.
 *
 * ONE thing to set: the MC block below. Nothing else in this file changes.
 */
(function () {
  'use strict';

  /* ======================= CONFIG =======================================
     Mailchimp > Audience > Signup forms > Embedded forms > Condensed.
     The <form action> in that code looks like:

       https://britishinvasionyears.us14.list-manage.com/subscribe/post?u=a1b2c3...&id=9f8e7d

     dc   = the "us14" part of the hostname
     u    = the u= value
     list = the id= value
     ===================================================================== */

  var MC = {
    dc:   'us6',
    u:    '253e22431d5e453d8288ad630',
    list: '97b9016c59'
  };

  /* true  = Mailchimp sends a confirmation email first (double opt-in ON)
     false = the person is subscribed the moment they hit the button

     Set FALSE per Jon, 26_08_24. This must match the audience setting in
     Mailchimp. If double opt-in is ever switched back on there, flip this
     too, or the form will promise people they are on the list while
     Mailchimp is still waiting on a confirmation click.                    */
  var DOUBLE_OPT_IN = false;

  /* ===================================================================== */

  var ENDPOINT = 'https://' + MC.dc + '.list-manage.com/subscribe/post-json';

  var COPY = {
    idle:     'We respect your privacy.',
    working:  'One second…',
    okDoi:    'Almost there. Check your email and click the confirmation link.',
    okLive:   "You're on the list. See you at a show.",
    dupe:     "You're already on the list. Nothing else to do.",
    bademail: 'That email address does not look right. Try it again?',
    missing:  'Need a first name, last name, and email.',
    fail:     'Something went wrong on our end. Try again in a minute.'
  };

  /* ---------- tiny JSONP client (list-manage does not allow CORS) ------- */
  function jsonp(url, done) {
    var cbName = 'mcCb' + Date.now() + Math.floor(Math.random() * 10000);
    var script = document.createElement('script');
    var settled = false;

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
    }

    window[cbName] = function (data) {
      if (settled) return;
      settled = true;
      cleanup();
      done(null, data);
    };

    script.onerror = function () {
      if (settled) return;
      settled = true;
      cleanup();
      done(new Error('network'));
    };

    setTimeout(function () {
      if (settled) return;
      settled = true;
      cleanup();
      done(new Error('timeout'));
    }, 12000);

    script.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'c=' + cbName;
    document.head.appendChild(script);
  }

  /* ---------- helpers --------------------------------------------------- */
  function clean(msg) {
    if (!msg) return '';
    return String(msg)
      .replace(/<[^>]*>/g, ' ')        // Mailchimp puts markup in its messages
      .replace(/^\s*\d+\s*-\s*/, '')   // and a leading "0 - " error code
      .replace(/\s+/g, ' ')
      .trim();
  }

  function looksLikeEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function setNote(form, text, state) {
    var note = form.querySelector('.news-note');
    if (!note) return;
    note.textContent = text;
    note.classList.remove('is-ok', 'is-err', 'is-busy');
    if (state) note.classList.add(state);
  }

  function busy(form, on) {
    form.classList.toggle('is-busy', !!on);
    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = !!on;
  }

  /* ---------- the submit handler ---------------------------------------- */
  function handle(form, e) {
    e.preventDefault();

    var trap = form.querySelector('.mc-trap input');
    if (trap && trap.value) return;      // a bot filled the hidden field

    var get = function (n) {
      var el = form.querySelector('[name="' + n + '"]');
      return el ? el.value.trim() : '';
    };

    var fname = get('FNAME');
    var lname = get('LNAME');
    var email = get('EMAIL');

    // Last name is deliberately optional. Mailchimp does not require it, and
    // the HTML dropped `required` from that input, so the guard must not ask
    // for it either. See Step 9: "Submit with last name blank. It goes through."
    if (!fname || !email) {
      setNote(form, COPY.missing, 'is-err');
      return;
    }
    if (!looksLikeEmail(email)) {
      setNote(form, COPY.bademail, 'is-err');
      return;
    }

    busy(form, true);
    setNote(form, COPY.working, 'is-busy');

    var url = ENDPOINT +
      '?u=' + encodeURIComponent(MC.u) +
      '&id=' + encodeURIComponent(MC.list) +
      '&EMAIL=' + encodeURIComponent(email) +
      '&FNAME=' + encodeURIComponent(fname) +
      '&LNAME=' + encodeURIComponent(lname);

    jsonp(url, function (err, data) {
      busy(form, false);

      if (err || !data) {
        setNote(form, COPY.fail, 'is-err');
        return;
      }

      if (data.result === 'success') {
        setNote(form, DOUBLE_OPT_IN ? COPY.okDoi : COPY.okLive, 'is-ok');
        form.reset();
        track('newsletter_signup');
        return;
      }

      var msg = clean(data.msg);

      if (/already subscribed/i.test(msg)) {
        setNote(form, COPY.dupe, 'is-ok');
        form.reset();
        return;
      }
      if (/fake or invalid|invalid email|not valid/i.test(msg)) {
        setNote(form, COPY.bademail, 'is-err');
        return;
      }
      setNote(form, msg || COPY.fail, 'is-err');
    });
  }

  function track(name) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, { method: 'mailchimp' });
    }
  }

  /* ---------- wire everything up ---------------------------------------- */
  function init() {
    var forms = document.querySelectorAll('form.news-form');
    if (!forms.length) return;

    Array.prototype.forEach.call(forms, function (form) {
      form.setAttribute('novalidate', 'novalidate');
      form.removeAttribute('action');
      form.removeAttribute('method');

      // Mailchimp's bot trap. Name has to be b_<u>_<list>, so build it here
      // instead of hardcoding it into two HTML files.
      if (!form.querySelector('.mc-trap')) {
        var wrap = document.createElement('div');
        wrap.className = 'mc-trap';
        wrap.setAttribute('aria-hidden', 'true');
        wrap.innerHTML = '<input type="text" tabindex="-1" autocomplete="off" value="" ' +
                         'name="b_' + MC.u + '_' + MC.list + '">';
        form.appendChild(wrap);
      }

      setNote(form, COPY.idle, null);
      form.addEventListener('submit', function (e) { handle(form, e); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
