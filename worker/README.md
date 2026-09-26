# taster-netstats-api

Cloudflare Worker that proxies Cloudflare Web Analytics for `/netstats`.

## Setup — do this once, in a terminal

```bash
cd worker
npm install
npx wrangler login          # opens browser, log in to Cloudflare
```

Set the two required secrets:

```bash
npx wrangler secret put CF_API_TOKEN
# paste the Cloudflare API token when prompted

npx wrangler secret put NETSTATS_PASSWORD
# paste your netstats password when prompted
```

Deploy:

```bash
npx wrangler deploy
```

Wrangler will print a URL like:
```
https://taster-netstats-api.<your-user>.workers.dev
```

**Copy that URL.** Open `../netstats.html`, find the line:
```js
const API_BASE = 'https://taster-netstats-api.PASTE_YOUR_WORKERS_SUBDOMAIN_HERE.workers.dev';
```
and paste your URL over `PASTE_YOUR_WORKERS_SUBDOMAIN_HERE.workers.dev`. Commit and push — GitHub Pages will redeploy and `/netstats` will work.

## Testing before wiring the page

```bash
curl -u admin:YOUR_PASSWORD https://taster-netstats-api.<your-user>.workers.dev/query?range=24h
```

Should return a big JSON blob with `totals`, `series`, `pages`, `referrers`, `countries`, `browsers`, `os`, `devices`.

## Rotating the API token

After deployment works, rotate the CF API token (create a new one at https://dash.cloudflare.com/profile/api-tokens, then):

```bash
npx wrangler secret put CF_API_TOKEN
# paste the NEW token
```

Then revoke the old one in the dashboard.

## Account ID

You don't need to look it up — the Worker discovers it automatically on the first request. If you have access to multiple Cloudflare accounts and want to pin one:

```bash
npx wrangler secret put CF_ACCOUNT_ID
```
