#!/usr/bin/env node
/* ============================================================================
   PRE-RENDER  —  runs on every Netlify build (see netlify.toml)

   WHY THIS EXISTS
   The tour list is rendered client-side by js/main2.js from content/tour.json.
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
        markup, byte-identical to what js/main2.js builds at runtime.
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

/* ---------- helpers shared with js/main2.js (keep these in step) ---------- */

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
   Must match js/main2.js cardHtml output exactly. If they drift, the page
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
        ? '<a class="btn btn-outline" href="blog/' + esc(s.whatToDoSlug) + '.html">WHAT TO DO IN TOWN</a>'
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
    if (s.whatToDoSlug) ev.subjectOf = ORIGIN + '/blog/' + s.whatToDoSlug + '.html';
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
      '  <url><loc>' + xml(ORIGIN + '/blog/' + p.slug + '.html') + '</loc>' +
      (p.date ? '<lastmod>' + xml(p.date) + '</lastmod>' : '') +
      '<changefreq>monthly</changefreq><priority>' + pri + '</priority></url>'
    );
  });

write('sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  rows.join('\n') + '\n</urlset>\n');


/* ---------- 4. blog posts + blog index ------------------------------------
   Same problem the tour had, same cure. blog.html shipped an empty
   <div id="blogGrid"> and post.html an empty <article id="postArticle">, so
   every one of the 36 posts served the same 204 words of chrome, the same
   <title>, and a canonical pointing at /post.html with no slug. Thirty-six
   pages all declaring themselves to be one page.

   Google renders JS eventually and could untangle it. Facebook, LinkedIn,
   X, iMessage, Bing and every AI crawler never run a line of it, and neither
   does the SEO tool that flagged this.

   WHAT THIS WRITES
     - blog/<slug>.html, one real file per post: full body copy as markup,
       its own title / description / canonical / OG / Twitter card, plus
       BlogPosting and BreadcrumbList JSON-LD.
     - the post cards baked into blog.html between markers.

   The generated files ARE committed. Netlify regenerates them on every build
   so the deploy is always current, but keeping them in the repo means a plain
   checkout, or a manual upload that skips the build, still serves a working
   blog instead of 36 dead URLs. Nothing writes to content/blog.json. Decap is
   untouched.

   Markup here must match js/blog.js byte for byte. blog.js still runs on
   blog.html and re-renders the grid on load; if the two drift the page
   visibly reflows when the fetch lands. The post pages don't load blog.js
   at all, so they have nothing to drift against. ========================= */

const CAT_LABELS = {
  'british-invasion': 'British Invasion',
  'band-news': 'Band News',
  'show-announcement': 'Show Announcement',
  'venue-spotlight': 'Venue Spotlight',
  'press': 'Press',
  'what-to-do-in-town': 'What to Do in Town'
};

// esc() handles text nodes. Attributes need the quote killed too.
const attr = s => esc(s).replace(/"/g, '&quot;');

/* ---- the tiny markdown from js/blog.js, kept in step ---- */
function mdInline(s) {
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, t, u) {
    const ext = /^https?:/i.test(u);
    return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>';
  });
  return s;
}
function bodyToHtml(body) {
  return String(body || '').split(/\n{2,}/).map(p =>
    '<p>' + mdInline(p).replace(/\n/g, '<br>') + '</p>').join('');
}
// "what to do in town" posts: a heading line plus its description becomes a card.
function bodyToHtmlCarded(body) {
  return String(body || '').split(/\n{2,}/).map(p => {
    const h = mdInline(p).replace(/\n/g, '<br>');
    return /<br>/.test(h) ? '<p class="attraction-card">' + h + '</p>' : '<p>' + h + '</p>';
  }).join('');
}

const MONTHS_FULL = ['January','February','March','April','May','June','July',
  'August','September','October','November','December'];
function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? MONTHS_FULL[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1] : (iso || '');
}
function fmtEventDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  return DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()] + ', ' + fmtDate(iso);
}

/* ---- show lookup: ALL shows, not just upcoming ----
   A "what to do in town" post carries its show's date instead of its publish
   date, and that has to keep working on the day of the show and the day after
   while the post is still sinking down the index. Filtering to upcoming here
   would blank the date line early. */
const SHOW_BY_SLUG = {};
(json('content/tour.json').shows || []).forEach(s => {
  if (s.whatToDoSlug) SHOW_BY_SLUG[s.whatToDoSlug] = s;
});

function metaHtml(p) {
  if (p.category === 'what-to-do-in-town') {
    const show = SHOW_BY_SLUG[p.slug];
    if (!show || !fmtEventDate(show.date)) return '';
    return '<div class="post-meta post-meta-event">Show: ' + fmtEventDate(show.date) + '</div>';
  }
  return '<div class="post-meta">' + fmtDate(p.date) + '</div>';
}

function showDateOf(p) {
  const s = SHOW_BY_SLUG[p.slug];
  return (s && s.date) || p.showDate || '';
}
const TODAY_ISO = new Date(today).toISOString().slice(0, 10);
const isExpired = p => { const d = showDateOf(p); return !!d && d < TODAY_ISO; };

/* ---- the one place a post URL is spelled, relative to the site root ---- */
const postHref = slug => 'blog/' + slug + '.html';

/* ---- post card, byte-identical to js/blog.js cardHtml() ---- */
function postCardHtml(p, feature) {
  const href = postHref(p.slug);
  return '<article class="post-card card-glow' + (feature ? ' feature' : '') + '">' +
    '<a class="post-thumb" href="' + href + '"><img src="' + p.image + '" alt="' + attr(p.title) + '" loading="lazy"></a>' +
    '<div class="post-body">' +
      '<span class="post-cat">' + esc(p.categoryLabel) + '</span>' +
      metaHtml(p) +
      '<h3><a href="' + href + '">' + esc(p.title) + '</a></h3>' +
      '<p class="post-excerpt">' + esc(p.excerpt) + '</p>' +
      '<a class="textlink" href="' + href + '">Read More &rarr;</a>' +
    '</div>' +
  '</article>';
}

/* ---- normalise + order, same two tiers js/blog.js uses ----
   1. still live, newest first.  2. show is over, parked underneath. */
posts.forEach(p => { if (!p.categoryLabel) p.categoryLabel = CAT_LABELS[p.category] || p.category; });
const ordered = posts.slice().sort((a, b) => {
  const ea = isExpired(a) ? 1 : 0, eb = isExpired(b) ? 1 : 0;
  if (ea !== eb) return ea - eb;
  const da = (a && a.date) || '', db = (b && b.date) || '';
  if (da === db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? 1 : -1;
});

/* ---- root-relative -> ../ , because the posts live one folder down --------
   LWS path rule: internal references stay relative, always. Rather than keep a
   second copy of the header and footer with ../ baked in, the shell is reused
   as-is and every relative href/src is walked up one level here.

   Skipped: anything with a scheme (http:, mailto:, tel:, data:), protocol-
   relative, root-relative, and bare fragments. The GA4 inline script writes
   "s.src = " with spaces, so the attribute pattern below cannot reach it.
   Canonical and og:url are absolute by design and are skipped too. */
function toSubfolder(html) {
  return html.replace(/(\s(?:href|src)=")([^"]*)"/g, (m, pre, val) =>
    /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(val) ? m : pre + '../' + val + '"');
}

/* ---- build one post page from the post.html shell ---- */
const shell = read('post.html');

function postPageHtml(p) {
  const url   = ORIGIN + '/' + postHref(p.slug);
  const image = ORIGIN + '/' + p.image;
  const title = p.title + ' | ' + BAND;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.excerpt,
        image: image,
        datePublished: p.date,
        dateModified: p.date,
        url: url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author:    { '@type': 'MusicGroup', name: BAND, url: ORIGIN },
        publisher: { '@type': 'MusicGroup', name: BAND, url: ORIGIN },
        articleSection: p.categoryLabel,
        isPartOf: { '@type': 'Blog', '@id': ORIGIN + '/blog.html', name: BAND + ' Blog' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home',     item: ORIGIN + '/' },
          { '@type': 'ListItem', position: 2, name: 'Insights', item: ORIGIN + '/blog.html' },
          { '@type': 'ListItem', position: 3, name: p.title,    item: url }
        ]
      }
    ]
  };
  if (p.tags && p.tags.length) ld['@graph'][0].keywords = p.tags.join(', ');

  const tagsHtml = (p.tags && p.tags.length)
    ? '<div class="post-tags">' + p.tags.map(t =>
        '<span class="tag">' + esc(t.replace(/-/g, ' ')) + '</span>').join('') + '</div>'
    : '';

  // Buy tickets straight from the post, same rule js/blog.js applies: a real
  // on-sale show with a link. A tba row has nothing to point at.
  const show = SHOW_BY_SLUG[p.slug];
  const ctaHtml = (show && show.status !== 'tba' && show.ticketUrl)
    ? '<div class="post-ticket-cta"><a class="btn btn-primary" href="' + attr(show.ticketUrl) +
      '" target="_blank" rel="noopener">GET TICKETS</a></div>'
    : '';

  const article =
    '<span class="post-cat">' + esc(p.categoryLabel) + '</span>' +
    '<h1>' + esc(p.title) + '</h1>' +
    metaHtml(p) +
    '<img class="post-hero" src="' + p.image + '" alt="' + attr(p.title) +
      '" fetchpriority="high" loading="eager">' +
    '<div class="post-content">' +
      (p.category === 'what-to-do-in-town' ? bodyToHtmlCarded(p.body) : bodyToHtml(p.body)) +
    '</div>' +
    tagsHtml + ctaHtml +
    '<div class="post-back"><a class="textlink" href="blog.html">&larr; Back to the Blog</a></div>';

  let h = shell;

  const swap = (re, to, what) => {
    if (!re.test(h)) throw new Error('post.html shell: could not find ' + what);
    h = h.replace(re, to);
  };

  swap(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>', '<title>');
  swap(/<meta name="description" content="[^"]*">/,
       '<meta name="description" content="' + attr(p.excerpt) + '">', 'meta description');
  swap(/<link rel="canonical" href="[^"]*">/,
       '<link rel="canonical" href="' + url + '">', 'canonical');
  swap(/<meta property="og:title" content="[^"]*">/,
       '<meta property="og:title" content="' + attr(p.title) + '">', 'og:title');
  swap(/<meta property="og:description" content="[^"]*">/,
       '<meta property="og:description" content="' + attr(p.excerpt) + '">', 'og:description');
  swap(/<meta property="og:url" content="[^"]*">/,
       '<meta property="og:url" content="' + url + '">', 'og:url');
  swap(/<meta property="og:image" content="[^"]*">/,
       '<meta property="og:image" content="' + image + '">\n  ' +
       '<meta property="article:published_time" content="' + attr(p.date) + '">\n  ' +
       '<meta name="twitter:card" content="summary_large_image">\n  ' +
       '<meta name="twitter:title" content="' + attr(p.title) + '">\n  ' +
       '<meta name="twitter:description" content="' + attr(p.excerpt) + '">\n  ' +
       '<meta name="twitter:image" content="' + image + '">\n  ' +
       '<script type="application/ld+json">\n  ' +
       JSON.stringify(ld, null, 2).split('\n').join('\n  ') +
       '\n  </script>', 'og:image');

  // The body copy is static now, so the renderer has nothing left to do and
  // would only overwrite what is already correct. main.js stays: it owns the
  // nav, the drawer and the scroll-reveal observer that picks up .reveal.
  h = h.replace(/\n\s*<script defer src="js\/blog-data\.js"><\/script>/, '')
       .replace(/\n\s*<script defer src="js\/blog\.js"><\/script>/, '');

  swap(/(<article id="postArticle"[^>]*>)[\s\S]*?(<\/article>)/,
       '$1' + article.replace(/\$/g, '$$$$') + '$2', '#postArticle');

  return toSubfolder(h);
}

/* ---- write them ---- */
const outDir = path.join(ROOT, 'blog');
fs.mkdirSync(outDir, { recursive: true });

// A slug that collides with a page at the root would be shadowed by it and
// serve the wrong content. Cheaper to fail the build than to ship that.
const rootPages = fs.readdirSync(ROOT).filter(f => /\.html$/i.test(f)).map(f => f.replace(/\.html$/i, ''));
const seen = new Set();
posts.forEach(p => {
  if (!p.slug) throw new Error('blog.json: a post has no slug (' + (p.title || 'untitled') + ')');
  if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error('blog.json: bad slug "' + p.slug + '" (lowercase, digits and hyphens only)');
  if (seen.has(p.slug)) throw new Error('blog.json: duplicate slug "' + p.slug + '"');
  if (rootPages.includes(p.slug)) throw new Error('blog.json: slug "' + p.slug + '" collides with /' + p.slug + '.html');
  seen.add(p.slug);
});

posts.forEach(p => fs.writeFileSync(path.join(outDir, p.slug + '.html'), postPageHtml(p)));

/* ---- blog index: filters, feature card, grid ---- */
(function injectBlogIndex() {
  let html = read('blog.html');

  const cats = [];
  ordered.forEach(p => { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
  const filters = ['<button class="blog-filter active" data-cat="all">All</button>']
    .concat(cats.map(c => {
      const label = (ordered.filter(p => p.category === c)[0] || {}).categoryLabel || c;
      return '<button class="blog-filter" data-cat="' + c + '">' + esc(label) + '</button>';
    })).join('');

  const featured = ordered.filter(p => p.featured && !isExpired(p))[0] || null;
  const rest = featured ? ordered.filter(p => p.slug !== featured.slug) : ordered;

  const fill = (id, marker, body) => {
    const open = new RegExp('(<div id="' + id + '"[^>]*>)');
    const m = open.exec(html);
    if (!m) throw new Error('blog.html: no #' + id);
    const at = m.index + m[1].length;
    const END = '<!--' + marker + ':END-->';
    const block = '<!--' + marker + ':START-->' + body + END;
    const endAt = html.indexOf(END, at);
    html = endAt !== -1
      ? html.slice(0, at) + block + html.slice(endAt + END.length)
      : html.slice(0, at) + block + html.slice(at);
  };

  fill('blogFilters', 'BLOGFILTERS', filters);
  fill('blogFeature', 'BLOGFEATURE', featured ? postCardHtml(featured, true) : '');
  fill('blogGrid',    'BLOGGRID',    rest.length
        ? rest.map(p => postCardHtml(p, false)).join('')
        : '<p class="blog-empty">No posts in this category yet. Check back soon.</p>');

  write('blog.html', html);
})();

/* ---------- report ---------------------------------------------------------- */
console.log('prerender: ' + shows.length + ' upcoming show(s) into tour.html / index.html');
console.log('prerender: ' + events.length + ' MusicEvent(s) with ticket offers');
events.forEach(e => console.log('             ' + e.startDate + '  ' + e.location.name));
console.log('prerender: sitemap.xml -> ' + rows.length + ' URLs (' + posts.length + ' posts)');
console.log('prerender: blog/ -> ' + posts.length + ' static post page(s) + blog.html index');
