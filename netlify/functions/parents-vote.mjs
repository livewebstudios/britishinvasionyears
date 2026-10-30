/* ============================================================
   PARENTS VOTE
   ------------------------------------------------------------
   Live tallies for the "What did your parents hate most?" quiz
   on parents.html (November 2026 newsletter).

   Netlify Forms keeps the record of every answer, but reading
   submissions back needs a secret token, so the results bars
   can't come from there. The counts live in Netlify Blobs
   instead, one key per answer plus a "total" key for the number
   of people who have voted.

     GET   returns { total, counts: { hair, volume, ... } }
     POST  body { picks: ["hair", "stones"] }. Adds 1 to each
           valid pick and 1 to total, then returns the new
           tallies in the same shape as GET.

   Anything that isn't one of the six slugs is ignored. A POST
   with no valid picks changes nothing.

   Blobs has no atomic increment. Every write is conditional on
   the etag that was read, and a write that loses the race reads
   again and retries, so two votes landing in the same instant
   both count instead of one overwriting the other.

   Needs @netlify/blobs, which is why the repo now has a
   package.json. No environment variables: Netlify hands the
   function its Blobs credentials at runtime.
   ============================================================ */

import { getStore } from '@netlify/blobs';

const SLUGS = ['hair', 'volume', 'clothes', 'stones', 'guitar-kid', 'cool'];
const STORE = 'parents-quiz';
const MAX_TRIES = 8;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function increment(store, key) {
  for (let i = 0; i < MAX_TRIES; i++) {
    const found = await store.getWithMetadata(key, { type: 'json' });
    const next = ((found && Number(found.data)) || 0) + 1;
    const res = found
      ? await store.setJSON(key, next, { onlyIfMatch: found.etag })
      : await store.setJSON(key, next, { onlyIfNew: true });
    if (res.modified) return next;
    // Somebody else wrote first. Back off a few ms and go again.
    await new Promise((r) => setTimeout(r, 10 + Math.random() * 40 * (i + 1)));
  }
  throw new Error('increment gave up on ' + key);
}

async function tallies(store) {
  const keys = ['total'].concat(SLUGS);
  const vals = await Promise.all(keys.map((k) => store.get(k, { type: 'json' })));
  const counts = {};
  SLUGS.forEach((s, i) => { counts[s] = Number(vals[i + 1]) || 0; });
  return { total: Number(vals[0]) || 0, counts: counts };
}

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });

  if (req.method === 'GET') {
    try {
      return json(await tallies(store), 200);
    } catch (err) {
      return json({ ok: false }, 500);
    }
  }

  if (req.method !== 'POST') {
    return json({ ok: false }, 405);
  }

  let payload;
  try {
    payload = await req.json();
  } catch (err) {
    return json({ ok: false }, 400);
  }

  const raw = Array.isArray(payload && payload.picks) ? payload.picks : [];
  const picks = SLUGS.filter((s) => raw.includes(s));

  try {
    if (picks.length) {
      await Promise.all(picks.concat('total').map((k) => increment(store, k)));
    }
    return json(await tallies(store), 200);
  } catch (err) {
    return json({ ok: false }, 500);
  }
};
