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
    # Previously falling back to published date â corrected show dates:
    'yeyi0680Q-o': ('2025-10-04T00:00:00+00:00', '360'),   # KC Bear Fighters @ Space Cat 2025
    'WL7Xg8--k8U': ('2025-06-25T00:00:00+00:00', '4k'),    # Crazy Folker @ George's Majestic Lounge
    'UExNYPOI0UU': ('2025-03-29T00:00:00+00:00', '4k'),    # Cameron Keeling @ Tintoretta Tattoo
    '0kdjhSyPQ1k': ('2024-09-20T00:00:00+00:00', '360'),   # Front Porch @ Winfield 2024 Stage 7 (360)
    'Kki2nnAu8gg': ('2024-09-20T00:00:00+00:00', '4k'),    # Front Porch @ Winfield Lit On The Low Road 2024
    'rbW9xQ--Y6A': ('2024-09-20T00:00:00+00:00', '4k'),    # Front Porch @ Winfield 2024 Stage 5
    'cmRiw0ahuuc': ('2024-10-10T00:00:00+00:00', '4k'),    # Michael Cleveland @ Hillberry 2024
    '-vJyLUWFBtM': ('2024-09-20T00:00:00+00:00', '4k'),    # Crying Uncle @ Winfield 2024 Stage 5
    'WuUsgJqPnu4': ('2022-01-22T00:00:00+00:00', '4k'),    # brown whÃ¶rnet @ Austin
}


# Title text overrides — corrected display titles keyed by video ID
TITLE_TEXT_OVERRIDES = {
    'c5ZjLthLEkM': "MoonShroom (live) from Fool's Yule 2025 - Full Show - 4k Multi-cam",
    'oi1ZsaFGDDc': "Front Porch (live) from Lucia - Full Show - 4k Multi-cam - Soundboard Audio",
    '5Mj2WksIs-s': "Shadowgrass (live) from Lucia - Full Show - 4k Multi-cam - Soundboard Audio",
    'VqFnBIL4tHw': "Whiskey Mash (live) from Hillberry 2025 - 4k - Single-cam",
    'sbS3kh2ipkQ': "John Henry And Friends (live) from Hillberry 2025 - 4k Single-cam",
    'r08yIarOHU4': "Alex Hawf Revue (live) from Hillberry 2025 - Full Show - 4k Multi-cam",
    'yeyi0680Q-o': "Kansas City Bear Fighters (live) from Space Cat 2025 in Fabulous 360!",
    'sGaLqE7swGo': "The Pickpockets (live) from Creekside Festival 2025 - 4k Single-cam",
    'bCcbZOiq32w': "Front Porch (live) - KC Backer Party - Full Show - 4k Multi-cam - Soundboard Audio",
    'zGZLec4CRfw': "MoonShroom (live) from Pickin' On Picknic 2025 - Full Show - 4k Multi-cam - Soundboard Audio",
    'EklPeX4QiMw': "The Engine Room (live) from West Church Social - Full Show - 4k Multi-cam - Soundboard Audio",
    'lUA7Fd4chF8': "Mike Tipton & The Scoundrels (live) from Boulevard Brewing Co. - 4k Multi-cam - Soundboard Audio",
    'RaUkKfppTIs': "Paul Cauthen (live) from Hillberry 2024 - Full Show - Single-cam - Audience Mic Audio",
    'Cwi9jKTVhU8': "MoonShroom (live) from Winfield 2024 - Stage 5 - Single-cam",
    'crdpHiTYcng': "MoonShroom (live) from Stage 5 2024 in Fabulous 360!",
    '-vJyLUWFBtM': "Crying Uncle Bluegrass Band (live) from Winfield 2024 - Stage 5 - Full Set - Single-cam",
    'Z0xwpslgi60': "Front Porch (live) from Winfield 2024 - Stage 1 - Full Set - 4k Multi-cam",
    'WuUsgJqPnu4': "brown whörnet (live) somewhere in Austin",
}

# Video IDs to include even if title lacks "(live)"
LIVE_EXCEPTIONS = {'EklPeX4QiMw', 'yEp6Kjl_mX0', 'WuUsgJqPnu4', 'nioEXdSpqak', 'swscjfyTW-E'}

# Unlisted videos not returned by channel API — fetched individually every run
STATIC_IDS = {
    'oi1ZsaFGDDc': ('2025-11-23T00:00:00+00:00', '4k'),  # Front Porch from Lucia Nov 2025
    '4mS8xtfxbLE': ('2025-08-30T00:00:00+00:00', '4k'),  # Front Porch from Cervantes
    '0Jprv8XmSx8': ('2025-08-27T00:00:00+00:00', '4k'),  # Front Porch from Crow Peak Brewing Co.
    'zzmkJFJe_Y4': ('2025-08-26T00:00:00+00:00', '4k'),  # Front Porch from Blue Goose Stage
    'eccWVQe5yAE': ('2025-08-15T00:00:00+00:00', '360'), # Front Porch KC Backer Party 360
    'bCcbZOiq32w': ('2025-08-15T00:00:00+00:00', '4k'),  # Front Porch KC Backer Party Full Show
    'nioEXdSpqak': ('2025-07-19T00:00:00+00:00', '4k'),  # Front Porch from Lemonade Park
    'swscjfyTW-E': ('2025-06-21T00:00:00+00:00', '4k'),  # Front Porch from Survivor's Ball
    'bsQkyVYA8I8': ('2025-04-25T00:00:00+00:00', '4k'),  # Front Porch from Stockyards Brewing Co.
}

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
        title = TITLE_TEXT_OVERRIDES.get(item["id"], item["snippet"]["title"])
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

# Fetch unlisted videos by ID and merge in
static_ids_to_fetch = [vid for vid in STATIC_IDS if vid not in {v["id"] for v in videos}]
if static_ids_to_fetch:
    for i in range(0, len(static_ids_to_fetch), 50):
        chunk = static_ids_to_fetch[i:i+50]
        sr = requests.get("https://www.googleapis.com/youtube/v3/videos",
            params={"part":"snippet,statistics","id":",".join(chunk),"key":api_key})
        for item in sr.json().get("items",[]):
            vid_id = item["id"]
            title = TITLE_TEXT_OVERRIDES.get(vid_id, item["snippet"]["title"])
            published = item["snippet"]["publishedAt"]
            views = int(item["statistics"].get("viewCount",0))
            show_date, vid_type = STATIC_IDS[vid_id]
            videos.append({"id":vid_id,"title":title,"views":views,"published":published,"show_date":show_date,"type":vid_type})

videos.sort(key=lambda v: v["show_date"], reverse=True)

with open("videos.json","w") as f:
    json.dump({"updated":datetime.now(timezone.utc).isoformat(),"channel":channel_id,"total":len(videos),"videos":videos},f,indent=2)

print(f"Done: {len(videos)} videos")
