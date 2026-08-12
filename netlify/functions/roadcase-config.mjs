/* ============================================================
   ROADCASE CONFIG
   ------------------------------------------------------------
   Hands the page one thing: the Google client ID.

   A Google client ID is not a secret. It is public by design
   and Google shows it in every sign in request. It lives in an
   environment variable anyway so Jon can change it in the
   Netlify dashboard without touching the repo.

   Environment variable: GOOGLE_CLIENT_ID
   ============================================================ */

export default async () => {
  return new Response(
    JSON.stringify({ clientId: process.env.GOOGLE_CLIENT_ID || '' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    }
  );
};
