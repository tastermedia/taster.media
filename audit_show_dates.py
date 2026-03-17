#!/usr/bin/env python3
"""
audit_show_dates.py — Check videos.json for show_date == published fallbacks.

Run this anytime after fetch_videos.py to catch any new videos that couldn't
auto-detect a show date and need an ID_DATE_OVERRIDES entry in fetch_videos.py.

Usage:
    python3 audit_show_dates.py
    python3 audit_show_dates.py --json     # machine-readable output
"""

import json, sys, argparse

parser = argparse.ArgumentParser()
parser.add_argument("--json", action="store_true", help="Output as JSON")
parser.add_argument("--file", default="videos.json", help="Path to videos.json")
args = parser.parse_args()

with open(args.file) as f:
    data = json.load(f)

updated = data.get("updated", "unknown")
total = data.get("total", 0)
fallbacks = [v for v in data["videos"] if v["show_date"] == v["published"]]

if args.json:
    print(json.dumps({"updated": updated, "total": total, "fallbacks": fallbacks}, indent=2))
    sys.exit(0)

print(f"videos.json last updated: {updated}")
print(f"Total videos: {total}")
print(f"Fallbacks (show_date == published): {len(fallbacks)}\n")

if not fallbacks:
    print("✅ All videos have real show dates — nothing to fix!")
    sys.exit(0)

print("⚠️  These videos need ID_DATE_OVERRIDES entries in fetch_videos.py:\n")
print(f"  {'ID':<15} {'Published':<12} {'Type':<5}  Title")
print(f"  {'-'*14} {'-'*11} {'-'*4}  {'-'*50}")
for v in fallbacks:
    print(f"  {v['id']:<15} {v['published'][:10]:<12} {v.get('type','?'):<5}  {v['title'][:65]}")

print(f"\nAdd these to ID_DATE_OVERRIDES in fetch_videos.py, then re-run fetch_videos.py.")
sys.exit(1)
