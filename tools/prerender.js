#!/usr/bin/env node
/* ============================================================================
   PRE-RENDER  —  runs on every Netlify build (see netlify.toml)

   WHY THIS EXISTS
   The tour list is rendered client-side by js/main.js from content/tour.json.
   A crawler that fetches tour.html sees an empty <div id="tourList">. Google
   may execute the JS eventually, but "eventually" is not a plan when a show
   is nine weeks out and we are trying to sell seats for it.

   Worse, tour.html used to carry a HAND-WRITTEN block of MusicEvent JSON-LD.
   By Aug 2026 it advertised five concerts that had already happened, was
   missing every 2027 date, and carried no ticket link on any event. Nothing
   updated it when the band edited a show, so it drifted the moment Dave
   touched Decap.

   WHAT IT DOES
     1. Writes the upcoming shows into tour.html and index.html as real static
        markup, byte-identical to what js/main.js builds at runtime.
     2. Regenerates the MusicEvent JSON-LD from content/tour.json, with the
        ticket URL, a proper PostalAddress and a real timezone offset.
     3. Regenerates sitemap.xml from content/tour.json + content/blog.json.

   RULES IT KEEPS
     - content/tour.json is Dave's. Nothing here writes to it.
     - Idempotent. Everything lands between markers, so running twice is a
       no-op, and the output is identical whether Netlify builds once or ten
       times off the same commit.
     - Additive. Decap, /admin/ and the band's workflow do not change.
     - Relative asset paths only. The absolute apex URLs below are canonical /
       og / JSON-LD values, which is the one place an absolute URL is correct.
   ========================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const ORIGIN = 'https://britishinvasionyears.com';
const OG_IMAGE = ORIGIN + '/images/home/band-onstage-peace-sign-backdrop.jpg';
const BAND   = 'The British Invasion Years';

const read  = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);
const json  = f => JSON.parse(read(f));

/* ---------- helpers shared with js/main.js (keep these in step) ---------- */

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 'YYYY-MM-DD' -> UTC ms. Build runs in UTC on Netlify; comparing date-only
// values in UTC keeps the output deterministic for a given commit + day.
function dayMs(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
}

/* ---------- Eastern Time offset -------------------------------------------
   Every venue on this tour is in the US Eastern zone. US DST runs from the
   second Sunday in March to the first Sunday in November. Getting this wrong
   shifts a show by an hour in Google's event listing. */
function nthSunday(year, month, n) {          // month is 0-based
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Date.UTC(year, month, 1 + ((7 - first) % 7) + (n - 1) * 7);
}
function easternOffset(iso) {
  const y = +iso.slice(0, 4);
  const t = dayMs(iso);
  return (t >= nthSunday(y, 2, 2) && t < nthSunday(y, 10, 1)) ? '-04:00' : '-05:00';
}

// '7:00 PM' / '7:30pm' / '6:00 PM · Show 1 of 2'  ->  '19:00'
function parseTime(raw) {
  const m = /(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?/i.exec(String(raw || ''));
  if (!m) return null;
  let h = +m[1] % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return String(h).padStart(2, '0') + ':' + m[2];
}

// '222 Main St, Irwin, PA 15642' -> a real PostalAddress.
// '  Millsboro, DE'              -> locality + region, no street, no zip.
function parseAddress(raw) {
  const parts = String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
  let region = null, postal = null, locality = null, street = null;
  if (parts.length) {
    const last = parts[parts.length - 1];
    const zip = /^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(last);
    if (zip)                         { region = zip[1].toUpperCase(); postal = zip[2]; parts.pop(); }
    else if (/^[A-Za-z]{2}$/.test(last)) { region = last.toUpperCase();                 parts.pop(); }
    if (parts.length) locality = parts.pop();
    if (parts.length) street   = parts.join(', ');
  }
  const addr = { '@type': 'PostalAddress' };
  if (street)   addr.streetAddress   = street;
  if (locality) addr.addressLocality = locality;
  if (region)   addr.addressRegion   = region;
  if (postal)   addr.postalCode      = postal;
  addr.addressCountry = 'US';
  return addr;
}

/* ---------- load + filter -------------------------------------------------- */

const now   = new Date();
const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

const shows = (json('content/tour.json').shows || [])
  .map(s => ({ s, t: dayMs(s.date) }))
  .filter(o => !isNaN(o.t) && o.t >= today)     // same auto-hide rule as main.js
  .sort((a, b) => a.t - b.t)
  .map(o => o.s);

const posts = (json('content/blog.json').posts || []);

/* ---------- 1. visible show cards ------------------------------------------
   Must match js/main.js cardHtml output exactly. If they drift, the page
   visibly reflows when the fetch lands. */

function cardHtml(s) {
  const t   = dayMs(s.date);
  const d   = new Date(t);
  const tba = s.status === 'tba';
  const when = DOW[d.getUTCDay()] + ', ' + MON[d.getUTCMonth()] + ' ' +
               d.getUTCDate() + ', ' + d.getUTCFullYear();
  const hasTicket = s.ticketUrl && String(s.ticketUrl).trim() !== '';
  return '<div class="show card-glow' + (tba ? ' tba' : '') + '">' +
    '<div class="show-date">' + when + '</div>' +
    '<div class="show-venue">' + esc(s.venue) + '</div>' +
    '<div class="show-addr">' + esc(s.city) + '</div>' +
    '<div class="show-time">' + esc(s.time) + '</div>' +
    (s.badge ? '<div class="show-badge">' + esc(s.badge) + '</div>' : '') +
    '<div class="show-cta">' +
      (hasTicket
        ? '<a class="btn ' + (tba ? 'btn-outline btn-rsvp' : 'btn-primary') + '" href="' +
          esc(s.ticketUrl) + '" target="_blank" rel="noopener">' +
          (tba ? 'RSVP' : 'GET TICKETS') + '</a>'
        : '') +
      // The WHAT TO DO IN TOWN button rides on whatToDoSlug, announced or not.
      (s.whatToDoSlug
        ? '<a class="btn btn-outline" href="post.html?slug=' + esc(s.whatToDoSlug) + '">WHAT TO DO IN TOWN</a>'
        : '') +
    '</div>' +
  '</div>';
}

function injectCards(html, list) {
  const open = /(<div class="tour-grid" id="tourList"[^>]*>)/.exec(html);
  if (!open) return html;
  const at    = open.index + open[1].length;
  const END   = '<!--TOUR:END-->';
  const body  = list.length
    ? list.map(cardHtml).join('')
    : '<p class="tour-empty">New dates coming soon. Check back shortly.</p>';
  const block = '<!--TOUR:START-->' + body + END;
  const endAt = html.indexOf(END, at);
  return endAt !== -1
    ? html.slice(0, at) + block + html.slice(endAt + END.length)
    : html.slice(0, at) + block + html.slice(at);
}

// index.html shows the next 6; tour.html carries data-all="true" and shows all.
write('tour.html',  injectCards(read('tour.html'),  shows));
write('index.html', injectCards(read('index.html'), shows.slice(0, 6)));

/* ---------- 2. MusicEvent JSON-LD ------------------------------------------
   ON-SALE shows only. A "tba" row has no venue (its venue field literally reads
   "Concert Announcement Coming Soon") and no ticket link, so emitting it would
   publish a Place named after a placeholder and an event nobody can attend.
   Those dates still appear in the visible markup above, which is where they
   belong until the venue is confirmed. */

const events = shows
  .filter(s => s.status !== 'tba' && s.ticketUrl && String(s.ticketUrl).trim() !== '')
  .map(s => {
    const time  = parseTime(s.time);
    const start = s.date + (time ? 'T' + time + easternOffset(s.date) : '');
    const ev = {
      '@type': 'MusicEvent',
      name: BAND + ' at ' + s.venue,
      startDate: start,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: s.venue, address: parseAddress(s.city) },
      performer: { '@type': 'MusicGroup', name: BAND },
      organizer: { '@type': 'MusicGroup', name: BAND, url: ORIGIN },
      image: OG_IMAGE,
      url: ORIGIN + '/tour.html',
      // No price field: content/tour.json does not carry one and inventing a
      // number would put a false price in Google's listing. Google emits a
      // warning for the missing price, not an error, and the event still
      // qualifies. Add a price to tour.json + admin/config.yml to clear it.
      offers: {
        '@type': 'Offer',
        url: s.ticketUrl,
        availability: 'https://schema.org/InStock'
      }
    };
    if (s.whatToDoSlug) ev.subjectOf = ORIGIN + '/post.html?slug=' + s.whatToDoSlug;
    return ev;
  });

const eventBlock =
  '<!--EVENTS:START-->\n  <script type="application/ld+json">\n  ' +
  JSON.stringify({ '@context': 'https://schema.org', '@graph': events }, null, 2)
    .split('\n').join('\n  ') +
  '\n  </script>\n  <!--EVENTS:END-->';

(function injectEvents() {
  let html = read('tour.html');
  const START = '<!--EVENTS:START-->', END = '<!--EVENTS:END-->';
  const a = html.indexOf(START);
  if (a !== -1) {
    const b = html.indexOf(END, a);
    html = html.slice(0, a) + eventBlock + html.slice(b + END.length);
  } else {
    // First run: swap out the hand-written @graph block.
    // Tempered match: [\s\S] would happily run past the closing </script> of the
    // MusicGroup block above and swallow it too. Anchor on "not </script>".
    const legacy = /<script type="application\/ld\+json">(?:(?!<\/script>)[\s\S])*?"@graph"(?:(?!<\/script>)[\s\S])*?<\/script>/;
    if (!legacy.test(html)) throw new Error('tour.html: no EVENTS markers and no legacy @graph block found');
    html = html.replace(legacy, eventBlock.replace(/^<!--EVENTS:START-->\n  /, '<!--EVENTS:START-->\n  '));
  }
  write('tour.html', html);
})();

/* ---------- 3. sitemap.xml --------------------------------------------------
   Was hand-maintained, listed eight www URLs that all 301'd, and named none of
   the 35 blog posts. The 7 What To Do In Town guides exist purely to catch
   local search for an upcoming show, and Google was never told they were there.

   thank-you.html stays out on purpose: it is a form success page. */

const STATIC = [
  ['/',                  'weekly',  '1.0'],
  ['/tour.html',         'weekly',  '0.9'],
  ['/about.html',        'monthly', '0.7'],
  ['/band-gallery.html', 'monthly', '0.6'],
  ['/fan-photos.html',   'monthly', '0.6'],
  ['/videos.html',       'monthly', '0.7'],
  ['/blog.html',         'weekly',  '0.8'],
  ['/contact.html',      'monthly', '0.8']
];

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rows = STATIC.map(([loc, freq, pri]) =>
  '  <url><loc>' + ORIGIN + loc + '</loc><changefreq>' + freq +
  '</changefreq><priority>' + pri + '</priority></url>'
);

// Posts keep their real publish date as lastmod. What To Do guides rank above
// the rest because they are the ones pulling local search for a live show.
posts
  .filter(p => p.slug)
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  .forEach(p => {
    const pri = p.category === 'what-to-do-in-town' ? '0.7' : '0.5';
    rows.push(
      '  <url><loc>' + xml(ORIGIN + '/post.html?slug=' + encodeURIComponent(p.slug)) + '</loc>' +
      (p.date ? '<lastmod>' + xml(p.date) + '</lastmod>' : '') +
      '<changefreq>monthly</changefreq><priority>' + pri + '</priority></url>'
    );
  });

write('sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  rows.join('\n') + '\n</urlset>\n');

/* ---------- report ---------------------------------------------------------- */
console.log('prerender: ' + shows.length + ' upcoming show(s) into tour.html / index.html');
console.log('prerender: ' + events.length + ' MusicEvent(s) with ticket offers');
events.forEach(e => console.log('             ' + e.startDate + '  ' + e.location.name));
console.log('prerender: sitemap.xml -> ' + rows.length + ' URLs (' + posts.length + ' posts)');
