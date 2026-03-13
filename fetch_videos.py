#!/usr/bin/env python3
"""
fetch_videos.py
Fetches all uploads from the @taster_media YouTube channel,
filters to videos with "(live)" in the title (case-insensitive),
sorts by view count descending, and writes videos.json.

Requires: YOUTUBE_API_KEY environment variable
"""

import os
import json
import sys
from datetime import datetime, timezone
from urllib.request import urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError

API_KEY = os.environ.get("YOUTUBE_API_KEY")
CHANNEL_HANDLE = "@taster_media"
OUTPUT_FILE = "videos.json"

def api_get(endpoint, params):
    params["key"] = API_KEY
    url = f"https://www.googleapis.com/youtube/v3/{endpoint}?{urlencode(params)}"
    with urlopen(url) as r:
        return json.loads(r.read().decode())

def get_channel_id():
    """Resolve @handle -> channel ID via the channels endpoint."""
    data = api_get("channels", {
        "part": "id",
        "forHandle": CHANNEL_HANDLE
    })
    items = data.get("items", [])
    if not items:
        raise RuntimeError(f"Could not find channel for handle {CHANNEL_HANDLE}")
    return items[0]["id"]

def get_uploads_playlist_id(channel_id):
    data = api_get("channels", {
        "part": "contentDetails",
        "id": channel_id
    })
    return data["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

def get_all_video_ids(playlist_id):
    """Page through the uploads playlist and collect all video IDs."""
    ids = []
    params = {
        "part": "contentDetails",
        "playlistId": playlist_id,
        "maxResults": 50
    }
    while True:
        data = api_get("playlistItems", params)
        for item in data.get("items", []):
            ids.append(item["contentDetails"]["videoId"])
        next_page = data.get("nextPageToken")
        if not next_page:
            break
        params["pageToken"] = next_page
    return ids

def get_video_details(video_ids):
    """Fetch title + view count in batches of 50."""
    videos = []
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i+50]
        data = api_get("videos", {
            "part": "snippet,statistics",
            "id": ",".join(batch)
        })
        for item in data.get("items", []):
            videos.append({
                "id": item["id"],
                "title": item["snippet"]["title"],
                "views": int(item["statistics"].get("viewCount", 0)),
                "published": item["snippet"]["publishedAt"]
            })
    return videos

def main():
    if not API_KEY:
        print("ERROR: YOUTUBE_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    print(f"Resolving channel ID for {CHANNEL_HANDLE}...")
    channel_id = get_channel_id()
    print(f"Channel ID: {channel_id}")

    uploads_playlist = get_uploads_playlist_id(channel_id)
    print(f"Uploads playlist: {uploads_playlist}")

    print("Fetching all video IDs...")
    all_ids = get_all_video_ids(uploads_playlist)
    print(f"Total videos on channel: {len(all_ids)}")

    print("Fetching video details...")
    all_videos = get_video_details(all_ids)

    # Filter: title must contain "(live)" (case-insensitive)
    live_videos = [v for v in all_videos if "(live)" in v["title"].lower()]
    print(f"Videos with '(live)' in title: {len(live_videos)}")

    # Sort by view count descending (most popular first)
    live_videos.sort(key=lambda v: v["views"], reverse=True)

    output = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "channel": CHANNEL_HANDLE,
        "total": len(live_videos),
        "videos": live_videos
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Written {OUTPUT_FILE} with {len(live_videos)} live videos.")

if __name__ == "__main__":
    main()
