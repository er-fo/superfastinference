const ALLOWED_ORIGINS = [
  'https://superfastinference.com',
  'http://superfastinference.com',
  'https://www.superfastinference.com',
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get('Origin') || '');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/subscribe') {
      return json({ error: 'not found' }, 404, cors);
    }

    let email;
    try {
      ({ email } = await request.json());
    } catch {
      return json({ error: 'bad request' }, 400, cors);
    }

    email = String(email || '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'invalid email' }, 400, cors);
    }

    await env.SIGNUPS.put(
      `email:${email}`,
      JSON.stringify({
        email,
        at: new Date().toISOString(),
        ip: request.headers.get('CF-Connecting-IP') || '',
        ua: request.headers.get('User-Agent') || '',
      })
    );

    return json({ ok: true }, 200, cors);
  },
};
