# First Concert Survey Page: Build Spec

A single-purpose page on britishinvasionyears.com that collects two answers from
newsletter readers: what decade their first concert was, and what band they saw.
It is linked from the September 2026 newsletter and will be reused for future
sends, so build it as a permanent page rather than a one-off.

The newsletter goes to roughly 1,267 subscribers. Expect somewhere between 25 and
80 submissions in the first week, front-loaded in the first 48 hours.

---

## Page

**Path:** `/first-concert.html`
**Canonical URL:** `https://britishinvasionyears.com/first-concert.html`
**Title:** `What was the first band you ever saw live? | The British Invasion Years`
**Meta robots:** `noindex, follow`

That last one matters. This is a thin page built for one campaign. It should not
compete in search with the real pages, and it should not show up in a site search
result three years from now.

Use the existing site header, footer, nav and `css/style3.css`. This is a normal
page of the site, not a standalone landing page with its own chrome. A reader
arriving here should be able to click into the tour page from the nav.

---

## The two questions

**Question 1. What decade was your first concert?**
Radio buttons, single answer, required.

- The 1960s
- The 1970s
- The 1980s
- 1990 or later

**Question 2. What band was it?**
Single-line text input, required, `maxlength="120"`.
Placeholder: `The Turtles, Convention Hall, 1968`

The placeholder is doing real work. It shows people that extra detail is welcome
without a second field or an instruction line.

**Optional third field: email.**
Type `email`, not required. Label: `Your email, if you want us to know it was you`.

Do not pass the subscriber's email through the URL from Mailchimp. It ends up in
server logs, browser history and referrer headers. Ask on the page instead, and
let people skip it.

---

## Form handling

Confirmed: the site is on Netlify. Use Netlify Forms. No third party, no account,
no new dependency.

The site already has a Formspree endpoint on the contact form, and this page
deliberately does not reuse it. Formspree free is 50 submissions per month per
account, and that account is shared. The contact form is the Blue Raven booking
path, so that pool stays clear for inquiries that are worth money. Netlify Forms
is a separate 100 per month that nothing on the site currently touches.

### Markup

Netlify detects forms by parsing the deployed HTML, so the form must exist in the
static file at deploy time. Every field needs a `name` attribute or it will not
be captured.

```html
<form name="first-concert" method="POST" data-netlify="true" netlify-honeypot="bot-field" id="fcForm">
  <input type="hidden" name="form-name" value="first-concert">
  <p class="mc-trap"><label>Leave this empty <input name="bot-field"></label></p>

  <fieldset>
    <legend>What decade was your first concert?</legend>
    <input type="radio" id="d60" name="decade" value="The 1960s" required>
    <label for="d60">The 1960s</label>
    <!-- d70, d80, dlater follow the same pattern -->
  </fieldset>

  <label for="band">What band was it?</label>
  <input type="text" id="band" name="band" maxlength="120" required
         placeholder="The Turtles, Convention Hall, 1968">

  <label for="email">Your email, if you want us to know it was you</label>
  <input type="email" id="email" name="email">

  <button type="submit" class="btn btn-primary">Send It In</button>
</form>
```

The `mc-trap` class already exists in `style3.css` and positions the honeypot
off-screen rather than using `display:none`, which some bots detect.

### Inline success, no redirect

Netlify's default behavior redirects to a generic success page. Do not use it.
Intercept the submit, POST the encoded body back to the site root, then swap the
form for the confirmation block.

```js
document.getElementById('fcForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new URLSearchParams(new FormData(form)).toString();
  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data
    });
    if (!res.ok) throw new Error(res.status);
    document.getElementById('fcThanks').hidden = false;
    form.hidden = true;
  } catch (err) {
    document.getElementById('fcError').hidden = false;
  }
});
```

The error branch is not optional. If the POST fails the reader must see a message
telling them to hit reply to the email instead, not a form that silently did
nothing.

### Dashboard setup, after first deploy

1. Netlify → the site → Site configuration → Forms → confirm form detection is
   enabled. Newer Netlify sites require opting in.
2. Deploy, then submit the form once from the live URL. The form does not appear
   in the dashboard until it receives its first real submission.
3. Forms → Form notifications → add an email notification to
   `info@britishinvasionyears.com` so answers arrive as they come in rather than
   sitting unread in a dashboard nobody opens.
4. Spam filtering is on by default. Check the Spam tab before concluding a
   submission was lost.

### Volume ceiling

Netlify's free tier allows 100 form submissions per month across the whole site.
The contact form runs on Formspree, not Netlify, so it does not draw from this
pool. The full 100 is available to this page.

The newsletter goes to roughly 1,267 people. At the high end of the 25 to 80
estimate the month finishes comfortably inside the cap, but a response well past
forecast could reach it. Watch the count in the dashboard during the first 48
hours, which is when the send is front-loaded.

---

## Design

Pull tokens from `css/style3.css`. Do not hardcode hex values that already exist
as custom properties.

| Element | Token | Value |
|---|---|---|
| Page background | `--bg` | `#0b1645` |
| Card background | `--panel` | `#122562` |
| Headings | `--cream` | `#f3eee6` |
| Body copy | `--ink` | `#c6cfe2` |
| Labels, meta | `--muted` | `#8694b2` |
| Buttons, eyebrow | `--accent` | `#e12f26` |
| Selected state | `--splash` | `#2563d4` |
| Headings font | `--serif` | Montserrat |
| Body font | `--sans` | Mulish |

Reuse existing classes wherever they fit: `.block`, `.wrap`, `.eyebrow`,
`.news-card`, `.btn`, `.btn-primary`, `.contact-form` input styling. The form
inputs on the contact page already have the right focus ring and border
treatment. Match them.

**Radio buttons.** Native radios styled dark are inconsistent across browsers.
Build them as label-wrapped pills instead: `input[type=radio]` visually hidden,
the label styled like `.chip`, and `:checked + label` gets the accent border and
a filled background. Keyboard focus must remain visible.

**Touch targets minimum 48px tall.** The audience is 55 to 75. Do not build
anything they have to aim at.

Submit button uses `.btn .btn-primary`. Label it `Send It In`, not `Submit`.

---

## Success state

Do not redirect to a separate thank-you page. Replace the form in place with the
confirmation, so the page does not reload and the reader keeps their context.

Confirmation copy:

> **Got it. Thanks.**
>
> We will tell everybody what the answers were in the next one.

Below that, a `.btn-outline` linking to `tour.html`, labeled `See Where We Are Playing`.

That link is the entire reason this page is worth building. Somebody who just
answered a question about live music is one tap from the tour dates. Do not skip
it and do not bury it.

---

## Copy for the page

Eyebrow: `TWO QUESTIONS`

H1: `What was the first band you ever saw live?`

Intro paragraph:

> Somebody asked us this at the merch table a few weeks back and it ate up twenty
> minutes. Nobody in that circle could tell you what they had for dinner the
> night before. Every one of them could tell you the venue and the year.

> So we want yours. Takes about fifteen seconds.

---

## Voice rules

Runs on `jon_voice_master.md`, Mode E, first person as the band. "We" throughout.

- Zero em dashes. Grep for the character before shipping.
- No tidy triads.
- No promotional filler. Nothing that reads like a promoter wrote it.
- Never "Submit," never "Learn More," never "Sign up now."

---

## Accessibility

- One `<h1>`.
- Every input has a real `<label>` with a matching `for`.
- The radio group sits inside a `<fieldset>` with a `<legend>`.
- Validation errors are text next to the field, not color alone.
- Contrast on `--muted` against `--panel` is marginal at small sizes. Use `--ink`
  for anything a person actually has to read.

---

## Out of scope

- No analytics beyond whatever the site already runs.
- No Mailchimp API write-back. Answers stay in the form dashboard for now.
- No second page. Success state is inline.

---

## Definition of done

1. Page renders correctly at 390px and 1440px.
2. A test submission arrives in the form dashboard with all three fields.
3. Empty required fields are blocked with a visible message.
4. Keyboard-only pass reaches every control and shows focus.
5. `grep` for the em dash character returns nothing.
6. `noindex` confirmed in the head.
