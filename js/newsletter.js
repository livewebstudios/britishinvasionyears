/*!
 * British Invasion Years newsletter signup
 * Sends signups to Mailchimp through our own Netlify function
 * (netlify/functions/newsletter-subscribe.mjs), which forwards
 * to Mailchimp's API server side. No jQuery, no dependencies,
 * no page reload.
 *
 * Wires up EVERY <form class="news-form"> found on the page.
 * Input names must be FNAME, LNAME, EMAIL.
 * The bot-trap field is injected automatically, do not add it
 * to the HTML.
 *
 * Previously this posted straight from the browser to
 * list-manage.com via a JSONP <script> tag. That is exactly the
 * shape ad blockers and privacy extensions flag as an email
 * marketing tracker, so for some visitors clicking the button
 * did nothing at all: no error, no confirmation, nothing.
 * Routing the request through our own domain fixes that,
 * because the browser never talks to list-manage.com directly.
 */
(function () {
  'use strict';

  var ENDPOINT = '/.netlify/functions/newsletter-subscribe';
  var TIMEOUT_MS = 12000;

  var COPY = {
    idle:     'We respect your privacy.',
    working:  'One second…',
    pending:  'Almost there. Check your email and click the confirmation link.',
    subscribed: "You're on the list. See you at a show.",
    missing:  'Need a first name and an email.',
    bademail: 'That email address does not look right. Try it again?',
    fail:     'Something went wrong on our end. Try again in a minute.'
  };

  /* ---------- helpers --------------------------------------------------- */
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

  function track(name) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, { method: 'mailchimp' });
    }
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
    // for it either.
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

    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, TIMEOUT_MS);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fname: fname, lname: lname, email: email }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      return res.json().then(function (data) { return { res: res, data: data }; });
    }).then(function (result) {
      clearTimeout(timer);
      busy(form, false);

      var state = result.data && result.data.state;

      if (state === 'subscribed' || state === 'pending') {
        setNote(form, COPY[state] || COPY.subscribed, 'is-ok');
        form.reset();
        track('newsletter_signup');
        return;
      }
      if (state === 'bademail') {
        setNote(form, COPY.bademail, 'is-err');
        return;
      }
      if (state === 'missing') {
        setNote(form, COPY.missing, 'is-err');
        return;
      }
      setNote(form, COPY.fail, 'is-err');
    }).catch(function () {
      clearTimeout(timer);
      busy(form, false);
      setNote(form, COPY.fail, 'is-err');
    });
  }

  /* ---------- wire everything up ---------------------------------------- */
  function init() {
    var forms = document.querySelectorAll('form.news-form');
    if (!forms.length) return;

    Array.prototype.forEach.call(forms, function (form) {
      form.setAttribute('novalidate', 'novalidate');
      form.removeAttribute('action');
      form.removeAttribute('method');

      // Bot trap, hidden off-screen with an inline style so it is hidden
      // even for a visitor holding an old cached stylesheet without the
      // .mc-trap rule in it.
      if (!form.querySelector('.mc-trap')) {
        var wrap = document.createElement('div');
        wrap.className = 'mc-trap';
        wrap.setAttribute('aria-hidden', 'true');
        wrap.style.cssText = 'position:absolute;left:-5000px;width:1px;height:1px;overflow:hidden;';
        wrap.innerHTML = '<input type="text" tabindex="-1" autocomplete="off" value="" name="hp_check">';
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
