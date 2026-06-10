#!/usr/bin/env python3
import argparse
import json
import sqlite3
import sys
import urllib.error
import urllib.request


JSON_FIELDS = {
    "genres": [],
    "seasons": [],
    "episodes": [],
    "expandedSeasons": [],
    "nextEpisode": None,
}


def parse_json(value, fallback):
    if not value:
        return fallback

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def row_to_show(row):
    show = dict(row)

    for field, fallback in JSON_FIELDS.items():
        show[field] = parse_json(show.get(field), fallback)

    show["watched"] = show.get("watched") == 1
    return show


def post_show(import_url, token, show):
    body = json.dumps({"shows": [show]}).encode("utf-8")
    request = urllib.request.Request(
        import_url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 TV Tracker D1 Import",
        },
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"Import failed for {show['title']}: HTTP {response.status}")


def main():
    parser = argparse.ArgumentParser(description="Import a TV Tracker SQLite backup into the Cloudflare D1 import endpoint.")
    parser.add_argument("--db", required=True, help="Path to the SQLite backup file.")
    parser.add_argument("--url", required=True, help="Cloudflare import endpoint URL, ending in /api/admin/import.")
    parser.add_argument("--token", required=True, help="Bearer token configured as IMPORT_TOKEN in Cloudflare.")
    args = parser.parse_args()

    connection = sqlite3.connect(args.db)
    connection.row_factory = sqlite3.Row

    rows = connection.execute("SELECT * FROM shows ORDER BY addedDate DESC").fetchall()
    print(f"Found {len(rows)} shows in backup.")

    for index, row in enumerate(rows, start=1):
        show = row_to_show(row)
        try:
            post_show(args.url, args.token, show)
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", errors="replace")
            print(f"Failed importing {show['title']}: HTTP {err.code} {detail}", file=sys.stderr)
            return 1

        print(f"[{index}/{len(rows)}] Imported {show['title']}")

    print("Import complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
