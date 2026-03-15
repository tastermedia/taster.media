import os, json, re, urllib.request
from datetime import datetime, timezone, timedelta

API_KEY = os.environ["YOUTUBE_API_KEY"]

def api(path):
    url = f"https://www.googleapis.com/youtube/v3/{path}&key={API_KEY}"
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())

data = api("channels?part=id,contentDetails&forHandle=@taster_media")
channel = data["items"][0]
channel_id = channel["id"]
uploads_playlist = channel["contentDetails"]["relatedPlaylists"]["uploads"]

video_ids = []
next_page = ""
while True:
    pg = f"&pageToken={next_page}" if next_page else ""
    data = api(f"playlistItems?part=snippet&maxResults=50&playlistId={uploads_playlist}{pg}")
    for item in data["items"]:
        video_ids.append(item["snippet"]["resourceId"]["videoId"])
    next_page = data.get("nextPageToken", "")
    if not next_page:
        break

def parse_show_date(text, published_dt):
    candidates = []
    for m in re.finditer(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}', text, re.IGNORECASE):
        try:
            dt = datetime.strptime(m.group(0).replace(",",""), "%B %d %Y").replace(tzinfo=timezone.utc)
            candidates.append(dt)
        except: pass
    for m in re.finditer(r'\b(\d{1,2})/(\d{1,2})/(20\d{2})\b', text):
        try:
            dt = datetime(int(m.group(3)),int(m.group(1)),int(m.group(2)),tzinfo=timezone.utc)
            candidates.append(dt)
        except: pass
    for m in re.finditer(r'\b(20\d{2})-(\d{2})-(\d{2})\b', text):
        try:
            dt = datetime(int(m.group(1)),int(m.group(2)),int(m.group(3)),tzinfo=timezone.utc)
            candidates.append(dt)
        except: pass
    valid = [dt for dt in candidates if dt <= published_dt + timedelta(days=7)]
    if valid:
        return max(valid).isoformat()
    return None

TITLE_DATE_OVERRIDES = [
    ('stage 2 2024 in fabulous', '2024-09-20T00:00:00+00:00'),
    ('stage 3 2024 in fabulous', '2024-09-20T00:00:00+00:00'),
    ('stage 5 2024 in fabulous', '2024-09-20T00:00:00+00:00'),
    ('stage 7 2024 in fabulous', '2024-09-20T00:00:00+00:00'),
    ('lit on the low road 2024 in fabulous', '2024-09-20T00:00:00+00:00'),
    ('stage 5 in fabulous 360', '2024-09-20T00:00:00+00:00'),
]

# ID-based overrides: (show_date, type)
# These take precedence over all automatic detection
ID_DATE_OVERRIDES = {
    'yNhJ6I9akQw': ('2025-08-08T00:00:00+00:00', '4k'),    # Magoo @ Lovegrass Aug 8 2025
    'VqFnBIL4tHw': ('2025-10-11T00:00:00+00:00', '4k'),    # Whiskey Mash Hillberry 2025
    'Pc_lSdrv3H0': ('2025-10-10T00:00:00+00:00', '4k'),    # Mountain Grass Unit Hillberry 2025
    '5s3TVwGdtQg': ('2025-08-08T00:00:00+00:00', '4k'),    # Front Porch @ Lovegrass Aug 8 2025 (4k not 360)
    '3N54tQj83zU': ('2024-10-11T00:00:00+00:00', '4k'),    # Front Porch @ Knuckleheads Oct 11 2024
    'EklPeX4QiMw': ('2025-05-30T00:00:00+00:00', '4k'),    # The Engine Room @ West Church Social
}

# Video IDs to include even if title lacks "(live)"
LIVE_EXCEPTIONS = {'EklPeX4QiMw', 'yEp6Kjl_mX0', 'WuUsgJqPnu4'}

# Individual song singles to exclude (full shows only)
EXCLUDE_IDS = {
    'sa-t5mE_lH8',  # Front Porch - Great Grandaddy's Barn
    'yVBt-KqQv90',  # Front Porch - Fever Dreams
    'arxyqBg2CaA',  # Front Porch - Angelina
    'W_D0mGVwQI8',  # Front Porch - Life Boat
    'y7b8WpNVQSw',  # Front Porch - Toolbox
    'rVoXxerJzyA',  # Front Porch - Skillet
    'ngljOpE-cE8',  # Front Porch - Roadside
    '7GNaUC3jD4U',  # Front Porch - Haystack
    'UGCyVg3F0UU',  # Front Porch - The Grove
}

def apply_title_overrides(title):
    t = title.lower()
    for pattern, date in TITLE_DATE_OVERRIDES:
        if pattern in t:
            return date
    return None

def is_360(title):
    t = title.lower()
    return 'fabulous 360' in t or '360!' in t or '360 video' in t

videos = []
for i in range(0, len(video_ids), 50):
    batch = ",".join(video_ids[i:i+50])
    data = api(f"videos?part=snippet,statistics&id={batch}")
    for item in data["items"]:
        title = item["snippet"]["title"]
        vid_id = item["id"]
        if "(live)" not in title.lower() and vid_id not in LIVE_EXCEPTIONS:
            continue
        if vid_id in EXCLUDE_IDS:
            continue
        desc = item["snippet"].get("description","")
        published = item["snippet"]["publishedAt"]
        views = int(item["statistics"].get("viewCount",0))
        pub_dt = datetime.fromisoformat(published.replace("Z","+00:00"))
        if vid_id in ID_DATE_OVERRIDES:
            id_date, id_type = ID_DATE_OVERRIDES[vid_id]
            videos.append({"id":vid_id,"title":title,"views":views,"published":published,"show_date":id_date,"type":id_type})
            continue
        show_date = apply_title_overrides(title) or parse_show_date(desc, pub_dt) or parse_show_date(title, pub_dt) or published
        videos.append({"id":vid_id,"title":title,"views":views,"published":published,"show_date":show_date,"type":"360" if is_360(title) else "4k"})

videos.sort(key=lambda v: v["show_date"], reverse=True)

with open("videos.json","w") as f:
    json.dump({"updated":datetime.now(timezone.utc).isoformat(),"channel":channel_id,"total":len(videos),"videos":videos},f,indent=2)

print(f"Done: {len(videos)} videos")
