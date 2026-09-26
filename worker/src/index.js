// Cloudflare Worker: taster-netstats-api
// Proxies Cloudflare Web Analytics GraphQL queries so the /netstats
// page can render them without exposing the API token in the browser.
//
// Auth: HTTP Basic. Username is arbitrary (use "admin"), password is the
// NETSTATS_PASSWORD secret. On 401 the browser shows its native prompt,
// no cookies involved.
//
// Endpoints:
//   GET /query?range=24h|week|30d|year|all  → JSON of all stat blocks
//   GET /health                             → { ok: true } (no auth)

const CF_GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';

const RANGES = {
  '24h':  { hours: 24 },
  'week': { days: 7 },
  '30d':  { days: 30 },
  'year': { days: 365 },
  'all':  { days: 365 * 5 }, // Cloudflare Web Analytics retains ~6mo free tier; 5y is a safe upper bound
};

function rangeToWindow(range) {
  const spec = RANGES[range] || RANGES['week'];
  const now = new Date();
  const start = new Date(now);
  if (spec.hours) start.setUTCHours(start.getUTCHours() - spec.hours);
  else start.setUTCDate(start.getUTCDate() - spec.days);
  return {
    since: start.toISOString(),
    until: now.toISOString(),
    granularity: spec.hours ? 'hour' : (spec.days <= 7 ? 'hour' : 'day'),
  };
}

// One big GraphQL query batches every dimension we want.
// rumPageloadEventsAdaptiveGroups is Cloudflare's Web Analytics dataset.
function buildQuery(accountTag, siteTag, since, until) {
  return {
    query: `query Stats($accountTag: String!, $filter: RumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          # totals
          totals: rumPageloadEventsAdaptiveGroups(limit: 1, filter: $filter) {
            count
            sum { visits }
            uniq { uniques }
          }
          # timeseries — buckets over the window
          series: rumPageloadEventsAdaptiveGroups(limit: 500, filter: $filter, orderBy: [datetimeHour_ASC]) {
            count
            sum { visits }
            uniq { uniques }
            dimensions { ts: datetimeHour }
          }
          # top pages
          pages: rumPageloadEventsAdaptiveGroups(limit: 25, filter: $filter, orderBy: [sum_visits_DESC]) {
            count
            sum { visits }
            uniq { uniques }
            dimensions { path: requestPath }
          }
          # top referrers (where they came from)
          referrers: rumPageloadEventsAdaptiveGroups(limit: 25, filter: $filter, orderBy: [sum_visits_DESC]) {
            count
            sum { visits }
            dimensions { referer }
          }
          # top countries
          countries: rumPageloadEventsAdaptiveGroups(limit: 25, filter: $filter, orderBy: [sum_visits_DESC]) {
            count
            sum { visits }
            dimensions { country: countryName }
          }
          # top browsers
          browsers: rumPageloadEventsAdaptiveGroups(limit: 20, filter: $filter, orderBy: [sum_visits_DESC]) {
            count
            sum { visits }
            dimensions { browser: userAgentBrowser }
          }
          # top operating systems
          os: rumPageloadEventsAdaptiveGroups(limit: 20, filter: $filter, orderBy: [sum_visits_DESC]) {
            count
            sum { visits }
            dimensions { os: userAgentOS }
          }
          # device types (desktop / mobile / tablet)
          devices: rumPageloadEventsAdaptiveGroups(limit: 10, filter: $filter, orderBy: [sum_visits_DESC]) {
            count
            sum { visits }
            dimensions { deviceType }
          }
        }
      }
    }`,
    variables: {
      accountTag,
      filter: {
        siteTag,
        date_geq: since.slice(0, 10),
        date_leq: until.slice(0, 10),
      },
    },
  };
}

function unauthorized(cors) {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="taster.media netstats", charset="UTF-8"',
      'Content-Type': 'text/plain',
      ...(cors || {}),
    },
  });
}

// Auto-discover the account tag from the token. Cached across requests
// within the same isolate to avoid an extra hop each call.
let _cachedAccountTag = null;
async function discoverAccountTag(apiToken) {
  if (_cachedAccountTag) return _cachedAccountTag;
  const resp = await fetch(CF_GRAPHQL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query { viewer { accounts(limit: 1) { accountTag } } }`,
    }),
  });
  const json = await resp.json();
  const tag = json?.data?.viewer?.accounts?.[0]?.accountTag;
  if (tag) _cachedAccountTag = tag;
  return tag;
}

function checkAuth(request, password) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(':');
    if (idx < 0) return false;
    // Username is ignored (accept anything), password must match.
    return decoded.slice(idx + 1) === password;
  } catch { return false; }
}

function corsHeaders(origin) {
  const allowed = new Set(['https://taster.media', 'http://localhost:8000', 'http://127.0.0.1:8000']);
  const allow = allowed.has(origin) ? origin : 'https://taster.media';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('Origin') || '');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    if (url.pathname !== '/query') {
      return new Response('Not found', { status: 404, headers: cors });
    }

    if (!checkAuth(request, env.NETSTATS_PASSWORD)) return unauthorized(cors);

    const range = url.searchParams.get('range') || 'week';
    if (!RANGES[range]) {
      return new Response(JSON.stringify({ error: 'invalid range' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    const window = rangeToWindow(range);

    // Auto-discover the account tag if not pinned via env var. Cached in
    // module-global for the lifetime of the isolate.
    let accountTag = env.CF_ACCOUNT_ID;
    if (!accountTag) {
      accountTag = await discoverAccountTag(env.CF_API_TOKEN);
      if (!accountTag) {
        return new Response(JSON.stringify({ error: 'no_accessible_account', hint: 'Token has no readable accounts. Recreate it with Account Analytics:Read.' }), {
          status: 502, headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
    }

    const body = buildQuery(accountTag, env.CF_SITE_TAG, window.since, window.until);
    const cfResp = await fetch(CF_GRAPHQL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const cfJson = await cfResp.json();

    if (!cfResp.ok || cfJson.errors) {
      return new Response(JSON.stringify({ error: 'cloudflare_error', detail: cfJson }), {
        status: 502, headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    const acct = cfJson.data?.viewer?.accounts?.[0] || {};
    const totalsRow = acct.totals?.[0] || {};
    const payload = {
      range,
      window,
      totals: {
        pageviews: totalsRow.count || 0,
        visits: totalsRow.sum?.visits || 0,
        uniques: totalsRow.uniq?.uniques || 0,
      },
      series: (acct.series || []).map(r => ({
        ts: r.dimensions?.ts,
        pageviews: r.count,
        visits: r.sum?.visits || 0,
        uniques: r.uniq?.uniques || 0,
      })),
      pages: (acct.pages || []).map(r => ({
        path: r.dimensions?.path || '(unknown)',
        pageviews: r.count,
        visits: r.sum?.visits || 0,
        uniques: r.uniq?.uniques || 0,
      })),
      referrers: (acct.referrers || []).map(r => ({
        referrer: r.dimensions?.referer || '(direct)',
        pageviews: r.count,
        visits: r.sum?.visits || 0,
      })),
      countries: (acct.countries || []).map(r => ({
        country: r.dimensions?.country || '(unknown)',
        pageviews: r.count,
        visits: r.sum?.visits || 0,
      })),
      browsers: (acct.browsers || []).map(r => ({
        browser: r.dimensions?.browser || '(unknown)',
        pageviews: r.count,
        visits: r.sum?.visits || 0,
      })),
      os: (acct.os || []).map(r => ({
        os: r.dimensions?.os || '(unknown)',
        pageviews: r.count,
        visits: r.sum?.visits || 0,
      })),
      devices: (acct.devices || []).map(r => ({
        device: r.dimensions?.deviceType || '(unknown)',
        pageviews: r.count,
        visits: r.sum?.visits || 0,
      })),
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
        ...cors,
      },
    });
  },
};
