/* ============================================================
   NEWSLETTER SUBSCRIBE
   ------------------------------------------------------------
   Takes a first name, last name and email from the mailing-list
   form on the contact page and adds the person to the Mailchimp
   audience, server side.

   This replaces the old approach of loading a <script> straight
   from list-manage.com from the visitor's browser (JSONP). That
   call is exactly the shape ad blockers and privacy extensions
   flag as "email marketing tracker," so for some visitors the
   button did nothing and Mailchimp never even saw the request.
   Routing it through this function means the browser only ever
   talks to britishinvasionyears.com.

   ENVIRONMENT VARIABLE, set in the Netlify dashboard, not in
   this repo:

     MAILCHIMP_API_KEY   looks like 32hexcharacters-us6. The
                         -us6 (or whatever it says) is the data
                         center and this function reads it
                         straight off the end of the key, so
                         nothing else needs to change if the key
                         is ever regenerated on a different
                         data center.

   The audience (list) ID below is not a secret, Mailchimp shows
   it in the embed code it hands out, so it is fine sitting in
   the repo same as it was in the old client-side version.
   ============================================================ */

import { createHash } from 'node:crypto';

const LIST_ID = '97b9016c59';

/* true  = Mailchimp sends a confirmation email before anyone is
           actually subscribed (double opt-in ON)
   false = the person is subscribed the moment they submit

   Must match the audience setting in Mailchimp. Set FALSE per
   Jon, 26_08_24. */
const DOUBLE_OPT_IN = false;

function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ ok: false, state: 'fail' }, 405);
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const dc = apiKey && apiKey.includes('-') ? apiKey.split('-').pop() : null;

  if (!apiKey || !dc) {
    return json({ ok: false, state: 'fail' }, 500);
  }

  let payload;
  try {
    payload = await req.json();
  } catch (err) {
    return json({ ok: false, state: 'fail' }, 400);
  }

  const fname = String((payload && payload.fname) || '').trim();
  const lname = String((payload && payload.lname) || '').trim();
  const email = String((payload && payload.email) || '').trim();

  if (payload && payload.hp) {
    // Honeypot tripped. Say nothing useful, but don't error either.
    return json({ ok: true, state: DOUBLE_OPT_IN ? 'pending' : 'subscribed' }, 200);
  }

  if (!fname || !email) {
    return json({ ok: false, state: 'missing' }, 400);
  }
  if (!looksLikeEmail(email)) {
    return json({ ok: false, state: 'bademail' }, 400);
  }

  const hash = createHash('md5').update(email.toLowerCase()).digest('hex');
  const url = 'https://' + dc + '.api.mailchimp.com/3.0/lists/' + LIST_ID + '/members/' + hash;

  const mergeFields = { FNAME: fname };
  if (lname) { mergeFields.LNAME = lname; }

  let mcRes;
  try {
    mcRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Mailchimp ignores the "username" half of basic auth, any
        // string works, only the API key half is checked.
        'Authorization': 'Basic ' + Buffer.from('anystring:' + apiKey).toString('base64')
      },
      // No top-level "status" here on purpose. PUT is an upsert: for
      // a brand new address, status_if_new decides how they start.
      // For an address already in the audience, leaving "status" out
      // means their existing status (including "unsubscribed") is
      // left alone instead of silently resubscribing them.
      body: JSON.stringify({
        email_address: email,
        status_if_new: DOUBLE_OPT_IN ? 'pending' : 'subscribed',
        merge_fields: mergeFields
      })
    });
  } catch (err) {
    return json({ ok: false, state: 'fail' }, 502);
  }

  if (mcRes.ok) {
    return json({ ok: true, state: DOUBLE_OPT_IN ? 'pending' : 'subscribed' }, 200);
  }

  let detail = null;
  try {
    detail = await mcRes.json();
  } catch (err) {
    // ignore, fall through to generic failure
  }

  const title = detail && detail.title ? String(detail.title) : '';

  if (/invalid resource|forgotten email/i.test(title)) {
    return json({ ok: false, state: 'bademail' }, 200);
  }

  return json({ ok: false, state: 'fail' }, 200);
};
