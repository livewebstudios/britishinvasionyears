/* ============================================================
   ROADCASE LINKS
   ------------------------------------------------------------
   The only place the band's documents are listed. Nothing in
   this file reaches a browser until Google has proved who the
   visitor is and the email matches the allowlist.

   HOW TO ADD OR CHANGE A LINK
   Edit the LINKS array below and push. That is the whole job.
   Sections render in the order they appear here, rows in the
   order inside each section.

     section    heading text
     note       optional line under the heading
     name       the big blue name on the card
     kind       the little coloured pill
     kindClass  folder | sheet | doc-k | pdf | site
     what       the plain English description
     href       where the button goes
     show       optional. What the small address under the
                button reads. Use it when href is relative.

   ENVIRONMENT VARIABLES, all set in the Netlify dashboard,
   none of them in this repo:

     GOOGLE_CLIENT_ID     the web client ID from Cloud Console
     ROADCASE_ALLOWLIST   the four emails, comma separated
     ROADCASE_SECRET      any long random string, used to sign
                          the session cookie

   THE ALLOWLIST IS MATCHED AS AN EXACT STRING, LOWERCASED.
   Joe's Google account is on an AOL address. Never match on
   domain, never assume gmail.com, or Joe is locked out.
   ============================================================ */

import { webcrypto } from 'node:crypto';

const subtle = (globalThis.crypto || webcrypto).subtle;

/* ------------------------------------------------------------
   THE LINKS
   ------------------------------------------------------------ */

const LINKS = [
  {
    section: 'Every week',
    note: 'These are the ones you will actually open.',
    rows: [
      {
        name: 'Post and ad calendar',
        kind: 'Spreadsheet',
        kindClass: 'sheet',
        what: 'Every Facebook post, every Instagram post, and every ad date, laid out day by day. Read the post itself, see the photo that goes with it, and check it off if you want to. You can all type changes right into it.',
        href: 'https://docs.google.com/spreadsheets/d/11ckDMcPXZpODhLDm2cly8BB-9bYWycd2X_1zOImfDjM/edit?gid=283741462#gid=283741462'
      },
      {
        name: 'Ticket counts',
        kind: 'Spreadsheet',
        kindClass: 'sheet',
        what: "Dave's running ticket numbers, show by show. This is the number everything else is trying to move.",
        href: 'https://drive.google.com/file/d/1ms9P89jyXrARLAPUa0Oo1an1pdSDTKh7/view'
      },
      {
        name: 'Promotion status per show',
        kind: 'Spreadsheet',
        kindClass: 'sheet',
        what: "Where each show stands on advertising and posts. Green means it's handled.",
        href: 'https://drive.google.com/file/d/1EWtmGn7f0aVVdBib_9MZZx-llr71a7AQ/view'
      },
      {
        name: 'Asset status per show',
        kind: 'Spreadsheet',
        kindClass: 'sheet',
        what: "Dave's running checklist, show by show. Has the venue posted us yet, and are they using the right photo and the right write-up.",
        href: 'https://drive.google.com/file/d/120niFM1lKSKQZ2i5fk0WmX3WvAHdkDuY/view'
      }
    ]
  },
  {
    section: 'Shows and tickets',
    rows: [
      {
        name: 'Add a tour date or a news post',
        kind: 'Web page',
        kindClass: 'site',
        what: 'This is where tour dates and news articles get added to the website. Whatever you save here shows up on the site right away.',
        href: '../admin/',
        show: 'https://britishinvasionyears.netlify.app/admin'
      }
    ]
  },
  {
    section: 'Venue paperwork',
    note: 'This is what goes to the sound company and the venue before a show.',
    rows: [
      {
        name: 'Tech rider',
        kind: 'PDF',
        kindClass: 'pdf',
        what: 'What the venue has to provide for us. June 2025 version.',
        href: 'https://drive.google.com/file/d/1bhJq8xCZFx7isHUucV8Z0d4pu-VjbsLQ/view'
      },
      {
        name: 'Stage plot and input list',
        kind: 'PDF',
        kindClass: 'pdf',
        what: 'Where everybody stands on stage and what plugs into the sound board. May 2026 version.',
        href: 'https://drive.google.com/file/d/1zU6iH5Ffc7A970LKTuSVWz5uJeWJAUEQ/view'
      }
    ]
  },
  {
    section: 'The website',
    rows: [
      {
        name: 'Our website',
        kind: 'Web page',
        kindClass: 'site',
        what: 'What the public sees.',
        href: '../index.html',
        show: 'https://britishinvasionyears.netlify.app'
      },
      {
        name: 'Website change requests',
        kind: 'Spreadsheet',
        kindClass: 'sheet',
        what: "See something wrong on the site, or want something added? Type it on a new line here. You don't have to email me, I get a message the moment you type it.",
        href: 'https://docs.google.com/spreadsheets/d/1paseYy2n2QmiUxrK3XR8tXTb1D5-slrGKbivqwFMHo8/edit'
      },
      {
        name: 'Instructions for adding a tour date',
        kind: 'Web page',
        kindClass: 'site',
        what: 'Step by step, with pictures. Follow it top to bottom and the date shows up on the website right away.',
        href: 'https://livewebstudios.com/decap/'
      }
    ]
  },
  {
    section: 'The shared folder',
    note: 'If you ever lose a link above, start here.',
    rows: [
      {
        name: 'Google shared folder',
        kind: 'Drive folder',
        kindClass: 'folder',
        what: 'This is where all our documents are, ready to open, download or edit. Set lists, riders, stage plots, rehearsal lists, photos, video, logos, contracts. Everything the band has is in here somewhere.',
        href: 'https://drive.google.com/drive/folders/1VVrMpqmCXzJSN4S4HCQFIdRvKtTSvrNd'
      }
    ]
  }
];

/* ------------------------------------------------------------
   SETTINGS
   ------------------------------------------------------------ */

const COOKIE = 'roadcase';
const SESSION_DAYS = 30;
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISS = ['accounts.google.com', 'https://accounts.google.com'];

/* ------------------------------------------------------------
   ENCODING HELPERS
   ------------------------------------------------------------ */

const enc = new TextEncoder();

function b64urlToBytes(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) { out[i] = binary.charCodeAt(i); }
  return out;
}

function b64urlToJson(input) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(input)));
}

function bytesToB64url(bytes) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) { binary += String.fromCharCode(view[i]); }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function textToB64url(text) {
  return bytesToB64url(enc.encode(text));
}

/* Compares two strings without leaking, through timing, how much
   of the string matched. */
function sameString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') { return false; }
  if (a.length !== b.length) { return false; }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/* ------------------------------------------------------------
   THE ALLOWLIST
   ------------------------------------------------------------ */

function allowlist() {
  return (process.env.ROADCASE_ALLOWLIST || '')
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/* Exact string match, lowercased on both sides. No domain
   matching anywhere in this function, on purpose. */
function isAllowed(email) {
  if (!email) { return false; }
  const wanted = String(email).trim().toLowerCase();
  return allowlist().some((entry) => sameString(entry, wanted));
}

/* ------------------------------------------------------------
   VERIFYING THE GOOGLE ID TOKEN
   ------------------------------------------------------------ */

let jwksCache = { keys: null, fetchedAt: 0 };

async function googleKeys(force) {
  const fresh = Date.now() - jwksCache.fetchedAt < 60 * 60 * 1000;
  if (!force && jwksCache.keys && fresh) { return jwksCache.keys; }

  const res = await fetch(GOOGLE_JWKS);
  if (!res.ok) { throw new Error('Could not reach Google to check the sign in.'); }

  const body = await res.json();
  jwksCache = { keys: body.keys || [], fetchedAt: Date.now() };
  return jwksCache.keys;
}

async function keyFor(kid) {
  let keys = await googleKeys(false);
  let jwk = keys.find((k) => k.kid === kid);

  if (!jwk) {
    keys = await googleKeys(true);
    jwk = keys.find((k) => k.kid === kid);
  }
  if (!jwk) { return null; }

  return subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/* Returns the verified email, or null. Every check happens here,
   on the server. Nothing the browser says about itself is
   trusted, including the email it thinks it has. */
async function verifyIdToken(token, clientId) {
  if (typeof token !== 'string') { return null; }

  const parts = token.split('.');
  if (parts.length !== 3) { return null; }

  let header;
  let claims;
  try {
    header = b64urlToJson(parts[0]);
    claims = b64urlToJson(parts[1]);
  } catch (err) {
    return null;
  }

  if (header.alg !== 'RS256' || !header.kid) { return null; }

  const key = await keyFor(header.kid);
  if (!key) { return null; }

  const signed = await subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(parts[2]),
    enc.encode(parts[0] + '.' + parts[1])
  );
  if (!signed) { return null; }

  const now = Math.floor(Date.now() / 1000);

  if (!GOOGLE_ISS.includes(claims.iss)) { return null; }
  if (!clientId || claims.aud !== clientId) { return null; }
  if (typeof claims.exp !== 'number' || claims.exp <= now) { return null; }
  if (typeof claims.iat === 'number' && claims.iat > now + 300) { return null; }
  if (claims.email_verified !== true && claims.email_verified !== 'true') { return null; }
  if (!claims.email) { return null; }

  return String(claims.email).trim().toLowerCase();
}

/* ------------------------------------------------------------
   THE SESSION COOKIE
   Signed with HMAC so it cannot be edited by hand. Holds the
   email and an expiry, nothing else.
   ------------------------------------------------------------ */

async function signingKey() {
  const secret = process.env.ROADCASE_SECRET;
  if (!secret) { throw new Error('ROADCASE_SECRET is not set.'); }
  return subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function makeSession(email) {
  const body = textToB64url(JSON.stringify({
    e: email,
    x: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  }));
  const key = await signingKey();
  const sig = bytesToB64url(await subtle.sign('HMAC', key, enc.encode(body)));
  return body + '.' + sig;
}

async function readSession(value) {
  if (!value) { return null; }

  const cut = value.lastIndexOf('.');
  if (cut < 1) { return null; }

  const body = value.slice(0, cut);
  const sig = value.slice(cut + 1);

  const key = await signingKey();
  const expected = bytesToB64url(await subtle.sign('HMAC', key, enc.encode(body)));
  if (!sameString(expected, sig)) { return null; }

  let claims;
  try {
    claims = b64urlToJson(body);
  } catch (err) {
    return null;
  }

  if (!claims || typeof claims.x !== 'number' || claims.x < Date.now()) { return null; }

  /* Checked again on every request, so taking somebody off the
     allowlist locks them out the next time the page loads
     instead of thirty days later. */
  if (!isAllowed(claims.e)) { return null; }

  return claims.e;
}

function readCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  const found = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function cookieHeader(value, maxAgeSeconds) {
  return [
    COOKIE + '=' + encodeURIComponent(value),
    'Path=/',
    'Max-Age=' + maxAgeSeconds,
    'HttpOnly',
    'Secure',
    'SameSite=Lax'
  ].join('; ');
}

/* ------------------------------------------------------------
   RESPONSES
   ------------------------------------------------------------ */

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Vary': 'Cookie'
};

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({}, BASE_HEADERS, extra || {})
  });
}

/* Everyone who is not allowed in gets this exact answer, whether
   the email is unknown, the token is junk, or there is no token
   at all. It never says who is on the list. */
function denied() {
  return json({ error: 'no' }, 403);
}

/* ------------------------------------------------------------
   THE HANDLER
   ------------------------------------------------------------ */

export default async (req) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  /* Signing out. Blank the cookie and say nothing else. */
  if (req.method === 'DELETE') {
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
  }

  /* Coming back with a cookie already in hand. */
  if (req.method === 'GET') {
    try {
      const email = await readSession(readCookie(req, COOKIE));
      if (!email) { return json({ error: 'signin' }, 401); }
      return json({ sections: LINKS }, 200);
    } catch (err) {
      return json({ error: 'server' }, 500);
    }
  }

  if (req.method !== 'POST') {
    return json({ error: 'method' }, 405);
  }

  /* Fresh sign in. */
  if (!clientId || !process.env.ROADCASE_SECRET || allowlist().length === 0) {
    return json({ error: 'server' }, 500);
  }

  let payload;
  try {
    payload = await req.json();
  } catch (err) {
    return denied();
  }

  let email;
  try {
    email = await verifyIdToken(payload && payload.credential, clientId);
  } catch (err) {
    return json({ error: 'server' }, 500);
  }

  if (!email || !isAllowed(email)) { return denied(); }

  const session = await makeSession(email);

  return json({ sections: LINKS }, 200, {
    'Set-Cookie': cookieHeader(session, SESSION_DAYS * 24 * 60 * 60)
  });
};
