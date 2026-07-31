# DOMAIN CUTOVER RUNBOOK
### The British Invasion Years | Squarespace to Netlify
**Written 2026-07-31 by Claude Code with Jon Wolf. Target cutover: week of 2026-08-03.**

---

## READ THIS FIRST (Claude, this means you)

This file is the complete instruction set for pointing `britishinvasionyears.com`
at this Netlify site. It is written so a fresh session on any machine can execute
it with no prior context.

**Rules for this repo, do not violate them:**

- This is a **static site with no build step.** Netlify serves the repo root
  directly. Do NOT add a framework, bundler, prerender tool, or dependency.
- **All internal asset paths are relative** (`css/style3.css`, not `/css/style3.css`).
  This is a hard LWS rule and it is the reason this migration is cheap. Do not
  "fix" a relative path into a root-relative or absolute one.
  **The single exception:** `<link rel="canonical">` uses the full absolute HTTPS
  URL. That is correct and intentional.
- The band edits blog posts and tour dates through **Decap CMS at `/admin/`**.
  Do not restructure `content/blog.json` or `content/tour.json`.
- Ask Jon before anything irreversible: DNS changes, cancelling Squarespace,
  force pushes.

---

## STATUS BOARD

Update this section as steps complete. Check the boxes.

- [ ] Pre-flight: local work committed and pushed
- [ ] Netlify custom domain added
- [ ] DNS records pointed
- [ ] SSL certificate issued
- [ ] `/home` redirect live
- [ ] Site verified on real domain
- [ ] Search Console property + sitemap submitted
- [ ] Staging URL stopped from competing
- [ ] Squarespace cancelled

---

## STEP 0 — PRE-FLIGHT (do this before touching DNS)

As of 2026-07-31 there was **uncommitted work sitting on Jon's Windows machine
that was never pushed.** If you are on a different computer, the remote does not
have it. Check before assuming the live site is current.

```bash
git status --short && git log --oneline -3
```

The five files that were pending on 2026-07-31:

| File | What changed |
|---|---|
| `contact.html` | Added a message textarea; removed the Subject field |
| `css/style3.css` | Styles for the new home page lead/close lines |
| `index.html` | New "The Story" copy, heading, artist pill rows |
| `videos.html` | Removed the duplicate "Concert Highlights" section |
| `js/blog.js` | **Per-post canonical + og:url fix** |

If `git status` is clean and `git log` shows those changes, this step is done.
If they are still uncommitted, review the diff with Jon, then commit and push.
Confirm Netlify finished deploying (roughly 30 seconds) before continuing.

---

## STEP 1 — NETLIFY DOMAIN

In the Netlify dashboard for the site currently at `britishinvasionyears.netlify.app`:

1. **Site configuration > Domain management > Add a domain**
2. Add `www.britishinvasionyears.com` and set it as the **primary domain**
3. Add `britishinvasionyears.com` (apex) and let Netlify redirect it to www

**www must be primary.** Every canonical tag in this repo, `robots.txt`, and
`sitemap.xml` all declare `https://www.britishinvasionyears.com`. Verified on
2026-07-31: the apex already 301s to www. Keep it that way. If www is not
primary, every canonical on the site points at a redirect.

---

## STEP 2 — DNS

At the registrar (confirm with Jon where the domain is registered):

- `www` → CNAME → the Netlify target shown in the dashboard
- apex `@` → Netlify's ALIAS/ANAME, or their load balancer IP if the registrar
  does not support ALIAS records

Use whatever values Netlify's dashboard displays. Do not copy IPs out of this
file, they change.

Propagation is usually under an hour, occasionally longer. Check with:

```bash
nslookup www.britishinvasionyears.com
```

**Do not cancel Squarespace yet.**

---

## STEP 3 — SSL

Netlify provisions a Let's Encrypt certificate automatically once DNS resolves.
Domain management > HTTPS > verify the certificate covers both www and apex.
If it stalls, "Renew certificate" in the dashboard usually clears it.

Do not continue until `https://www.britishinvasionyears.com` loads without a
browser warning.

---

## STEP 4 — THE ONE REDIRECT

The old Squarespace site used extensionless URLs. This site uses `.html`.

Good news, verified on staging 2026-07-31: **Netlify already falls back to
`.html` automatically.** Four of the five old URLs need nothing.

| Old Squarespace URL | Status on this site |
|---|---|
| `/about` | Works, serves `about.html` |
| `/tour` | Works, serves `tour.html` |
| `/fan-photos` | Works, serves `fan-photos.html` |
| `/band-gallery` | Works, serves `band-gallery.html` |
| `/home` | **404** — the homepage here is `/` |

Only `/home` needs a redirect. If a `_redirects` file does not already exist in
the repo root, create it:

```bash
printf '/home  /  301\n' > _redirects
```

Commit and push. Then verify:

```bash
curl -sS -o /dev/null -w "%{http_code} -> %{url_effective}\n" -L https://www.britishinvasionyears.com/home
```

Expect `200` landing on `https://www.britishinvasionyears.com/`.

---

## STEP 5 — VERIFY THE SITE

Run this first. Every line should return 200:

```bash
for p in "" about.html tour.html videos.html blog.html contact.html band-gallery.html fan-photos.html thank-you.html post.html content/blog.json content/tour.json; do printf "%-24s " "/$p"; curl -sS -o /dev/null -w "%{http_code}\n" -L "https://www.britishinvasionyears.com/$p"; done
```

Then confirm a real blog post renders its own canonical. Open this in a browser
and check the page source **after** JavaScript has run (DevTools > Elements, not
View Source):

```
https://www.britishinvasionyears.com/post.html?slug=what-to-do-in-cape-may-nj
```

`<link rel="canonical">` should read:

```
https://www.britishinvasionyears.com/post.html?slug=what-to-do-in-cape-may-nj
```

If it still says `/blog.html`, the `js/blog.js` fix from Step 0 did not ship.

### Manual checks that need a human

These touch outside services and are the only things likely to actually break:

- **Contact form.** Submit it for real. Confirm Formspree delivers the email AND
  that the browser lands on `thank-you.html`. The redirect is built from
  `window.location.origin` at runtime, so it should follow the new domain by
  itself, but verify rather than assume.
- **`/admin/` CMS login.** This is what the band uses. Confirm Netlify Identity
  login works and that saving a test edit publishes. If Identity breaks, check
  Identity > Services > Git Gateway is still enabled.
- **GA4** (`G-EFCNHJG812`). Confirm Realtime shows traffic on the new hostname.
  In the GA property, update the data stream URL if it still points at
  Squarespace or the .netlify.app address.
- **Phone.** Load the homepage, tour page, and one blog post on a real phone.

---

## STEP 6 — SEARCH CONSOLE

1. Add the `https://www.britishinvasionyears.com` property.
   The verification file `google3643688bb9fb1a45.html` is already in this repo,
   so HTML-file verification should pass immediately.
2. Submit `https://www.britishinvasionyears.com/sitemap.xml`
3. Use **URL Inspection > Request Indexing** on the homepage and one blog post.
4. Watch Coverage for 404s over the following week. If old Squarespace URLs show
   up that are not in the table in Step 4, add them to `_redirects`.

---

## STEP 7 — STOP STAGING FROM COMPETING

`britishinvasionyears.netlify.app` stays live after cutover. It has no
`X-Robots-Tag: noindex` and `robots.txt` allows everything, so Google can index
it as a separate duplicate site.

Fix in the Netlify dashboard: Domain management > set the .netlify.app subdomain
to redirect to the primary domain.

---

## STEP 8 — DECOMMISSION SQUARESPACE

Only after everything above is green and the site has been stable for a few days.

- Confirm no traffic is still hitting Squarespace
- Cancel the Squarespace subscription (Jon does this, not Claude)
- Make sure the domain registration itself does not lapse if it was registered
  through Squarespace. **Transfer it out first if so.** This is the one step that
  can genuinely lose the domain.

---

## KNOWN GAPS (not blockers, worth doing the same week)

These were found on 2026-07-31 and deliberately left alone. Ask Jon before
picking any of them up.

**1. Sitemap is missing all 40 blog posts.**
`sitemap.xml` lists 8 top-level pages. No post URLs, no `thank-you.html`.
Fixing canonicals made posts *eligible* to be indexed; the sitemap is what
actually leads Google to them. This is the bigger lever of the two.
Post URL format: `https://www.britishinvasionyears.com/post.html?slug=<slug>`
Slugs live in `content/blog.json`.

**2. `og:title`, `og:description`, and `og:image` are static on every post.**
`js/blog.js` sets `document.title`, the meta description, canonical, and og:url
per post. It does not set the other og tags, so all 40 posts share one title,
one blurb, and one photo when shared.
**Important caveat:** Facebook, LinkedIn, and iMessage scrapers do not run
JavaScript. Setting og tags in `blog.js` will NOT fix link previews for them.
Only a real prerender or static per-post HTML would, and that means a build step,
which this site deliberately does not have. Discuss with Jon before starting.

**3. The canonical fix depends on Google rendering JavaScript.**
Google does render JS and reads the canonical from the rendered DOM, so this
works. But `post.html` line 11 still ships a static canonical pointing at
`blog.html` as its pre-JS value. Left deliberately. If posts still are not
getting indexed a month after cutover, this is the first thing to revisit.

**4. Every page is reachable at two URLs** (`/about` and `/about.html`) because
of Netlify's extensionless fallback. Canonicals point Google at the `.html`
version so it self-resolves. Not a problem, just do not panic at a crawl report.

---

## REFERENCE

| Thing | Value |
|---|---|
| Repo | `github.com/livewebstudios/britishinvasionyears`, branch `main` |
| Host | Netlify, no build step, serves repo root |
| Staging | `https://britishinvasionyears.netlify.app` |
| Target domain | `https://www.britishinvasionyears.com` (www primary, apex redirects) |
| Old site | Squarespace |
| GA4 | `G-EFCNHJG812` |
| Contact form | Formspree `https://formspree.io/f/xdajjkor` |
| Search Console file | `google3643688bb9fb1a45.html` |
| CMS | Decap at `/admin/`, Netlify Identity + Git Gateway |
| Blog data | `content/blog.json` (40 posts as of 2026-07-31) |
| Tour data | `content/tour.json` |
| Post URL format | `post.html?slug=<slug>` |

---

## ROLLBACK

If something goes badly wrong after DNS is pointed, revert the DNS records at
the registrar to the Squarespace values. Squarespace stays intact until Step 8,
which is exactly why Step 8 is last. Recovery is a DNS change, not a rebuild.
