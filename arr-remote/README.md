# arr-remote

Add movies and TV shows to **Radarr** and **Sonarr** from your phone — over
Tailscale, from anywhere. One small Python file, no dependencies, no cloud.

![how it works](https://img.shields.io/badge/deps-none-brightgreen) ![python](https://img.shields.io/badge/python-3.8%2B-blue)

```
  phone (Tailscale)  ──►  arr-remote  ──►  Radarr / Sonarr
   browser / PWA          app.py            (localhost)
```

Your phone talks to `app.py`; `app.py` talks to Radarr/Sonarr. Nothing leaves
your tailnet, and the API keys stay on the home machine.

## What it does

- Search movies (Radarr) or shows (Sonarr) from one mobile-first screen.
- Tap **Add** → pick a quality profile + root folder → it's added **and a
  search is kicked off automatically** so a download starts.
- Titles already in your library show a "✓ In library" badge instead.
- Installable to your phone's home screen (PWA).

## Setup (5 minutes)

### 1. Get your API keys
In each app: **Settings → General → Security → API Key**. Copy it.

### 2. Configure
On the machine that runs Radarr/Sonarr:

```bash
cd arr-remote
cp config.example.json config.json
# edit config.json — paste your URLs + API keys
```

If you only run one of them, delete the other block (or leave the key blank).
The URLs are usually `http://localhost:7878` (Radarr) and
`http://localhost:8989` (Sonarr).

> Prefer env vars? Skip `config.json` and set `RADARR_URL`, `RADARR_API_KEY`,
> `SONARR_URL`, `SONARR_API_KEY` instead.

### 3. Run
```bash
python3 app.py
```
You'll see:
```
[arr-remote] Configured: radarr, sonarr
[arr-remote] Serving on http://0.0.0.0:8585
```

### 4. Open it on your phone
Both devices need to be on the same Tailscale tailnet. Find the home machine's
Tailscale IP (or MagicDNS name):

```bash
tailscale ip -4     # e.g. 100.101.102.103
```

On your phone's browser go to **`http://100.101.102.103:8585`** (or
`http://your-machine-name:8585` with MagicDNS). Tap the browser's *Share →
Add to Home Screen* to install it as an app.

## Keep it running (optional)

### systemd (Linux)
A ready-made unit is in [`arr-remote.service`](arr-remote.service). Edit the
paths/user, then:

```bash
sudo cp arr-remote.service /etc/systemd/system/
sudo systemctl enable --now arr-remote
```

### Docker
There's no image to pull — it's stdlib only — but if your *arr stack is in
Docker you can run it with the base `python` image:

```bash
docker run -d --name arr-remote --restart unless-stopped \
  --network host \
  -v "$PWD/arr-remote:/app" -w /app \
  python:3-alpine python3 app.py
```
(`--network host` lets it reach Radarr/Sonarr on localhost. On non-Linux
Docker, use your host's LAN IP in `config.json` instead of `localhost`.)

## Configuration reference

| Key | Env var | Default | Notes |
|-----|---------|---------|-------|
| `radarr.url` | `RADARR_URL` | – | Radarr base URL |
| `radarr.apiKey` | `RADARR_API_KEY` | – | Radarr API key |
| `sonarr.url` | `SONARR_URL` | – | Sonarr base URL |
| `sonarr.apiKey` | `SONARR_API_KEY` | – | Sonarr API key |
| `host` | `ARR_REMOTE_HOST` | `0.0.0.0` | Bind address |
| `port` | `ARR_REMOTE_PORT` | `8585` | Listen port |

## Security notes

- Access is protected by Tailscale — only devices on your tailnet can reach the
  port. Don't forward this port to the public internet.
- Self-signed HTTPS on Radarr/Sonarr is tolerated (cert verification is relaxed
  for those upstream calls only).
- `config.json` holds your API keys and is git-ignored.

## Defaults when adding

- **Movies:** monitored, minimum availability *Released*, search on add.
- **Shows:** monitored, all seasons, season folders on, search on add.

Adjust these in `app.py` (`api_add`) if you want different behavior.
