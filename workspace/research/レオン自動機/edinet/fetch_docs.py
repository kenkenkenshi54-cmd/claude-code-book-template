"""Fetch EDINET docs (CSV + PDF) for レオン自動機 5 FYs."""
import os
import requests
import time
import json

EDINET_API_KEY = os.environ["EDINET_API_KEY"]
BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"
SAVE_DIR = "/workspaces/claude-code-book-template/workspace/research/レオン自動機/edinet"

with open(f"{SAVE_DIR}/docs.json") as f:
    docs = json.load(f)

def fetch(doc_id: str, doc_type: int, save_path: str):
    url = f"{BASE_URL}/documents/{doc_id}"
    params = {"type": doc_type, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, stream=True, timeout=120)
    res.raise_for_status()
    with open(save_path, "wb") as f:
        for chunk in res.iter_content(chunk_size=8192):
            f.write(chunk)
    return os.path.getsize(save_path)

for fy_label, items in docs.items():
    if not items:
        continue
    doc_id = items[0]["docID"]
    # CSV版 (type=5) — 数値抽出に最適
    csv_path = f"{SAVE_DIR}/{fy_label}_{doc_id}_csv.zip"
    print(f"Fetching {fy_label} CSV ({doc_id})...")
    try:
        size = fetch(doc_id, 5, csv_path)
        print(f"  saved: {csv_path} ({size:,} bytes)")
    except Exception as e:
        print(f"  ERROR CSV: {e}")
    time.sleep(2)

print("\nDone.")
