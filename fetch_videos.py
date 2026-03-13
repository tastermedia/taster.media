import os, json, re, urllib.request
from datetime import datetime, timezone

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

def parse_show_date(text):
    # "Month DD, YYYY" or "Month DD YYYY"
    m = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}', text, re.IGNORECASE)
    if m:
        try: return datetime.strptime(m.group(0).replace(",",""), "%B %d %Y").replace(tzinfo=timezone.utc).isoformat()
        except: pass
    # MM/DD/YYYY
    m = re.search(r'\b(\d{1,2})/(\d{1,2})/(20\d{2})\b', text)
    if m:
        try: return datetime(int(m.group(3)),int(m.group(1)),int(m.group(2)),tzinfo=timezone.utc).isoformat()
        except: pass
    # YYYY-MM-DD
    m = re.search(r'\b(20\d{2})-(\d{2})-(\d{2})\b', text)
    if m:
        try: return datetime(int(m.group(1)),int(m.group(2)),int(m.group(3)),tzinfo=timezone.utc).isoformat()
        except: pass
    return None

videos = []
for i in range(0, len(video_ids), 50):
    batch = ",".join(video_ids[i:i+50])
    data = api(f"videos?part=snippet,statistics&id={batch}")
    for item in data["items"]:
        title = item["snippet"]["title"]
        if "(live)" not in title.lower():
            continue
        desc = item["snippet"].get("description", "")
        published = item["snippet"]["publishedAt"]
        views = int(item["statistics"].get("viewCount", 0))
        show_date = parse_show_date(desc) or parse_show_date(title) or published
        videos.append({"id": item["id"], "title": title, "views": views, "published": published, "show_date": show_date})

videos.sort(key=lambda v: v["show_date"], reverse=True)

with open("videos.json", "w") as f:
    json.dump({"updated": datetime.now(timezone.utc).isoformat(), "channel": channel_id, "total": len(videos), "videos": videos}, f, indent=2)

print(f"Done: {len(videos)} videos")
