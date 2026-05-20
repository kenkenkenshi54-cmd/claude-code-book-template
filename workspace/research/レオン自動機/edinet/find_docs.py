"""Find レオン自動機 (secCode 62720) annual securities reports for past 5 fiscal years."""
import os
import requests
import time
import json
from datetime import datetime, timedelta

EDINET_API_KEY = os.environ["EDINET_API_KEY"]
BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"
TARGET_SEC_CODE = "62720"  # レオン自動機 (4-digit 6272 + trailing 0)
TARGET_DOC_TYPE = "120"     # 有価証券報告書

def list_documents(date_str: str):
    url = f"{BASE_URL}/documents.json"
    params = {
        "date": date_str,
        "type": 2,
        "Subscription-Key": EDINET_API_KEY,
    }
    res = requests.get(url, params=params, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])

def scan_range(start: datetime, end: datetime):
    """Scan a date range and return matching docs."""
    found = []
    cur = start
    while cur <= end:
        date_str = cur.strftime("%Y-%m-%d")
        try:
            docs = list_documents(date_str)
            for r in docs:
                if r.get("secCode") == TARGET_SEC_CODE and r.get("docTypeCode") == TARGET_DOC_TYPE:
                    found.append({"date": date_str, "docID": r["docID"], "docDescription": r.get("docDescription", "")})
                    print(f"FOUND: {date_str} {r['docID']} {r.get('docDescription','')}")
        except Exception as e:
            print(f"Error on {date_str}: {e}")
        cur += timedelta(days=1)
        time.sleep(0.3)
    return found

# レオン自動機 is a March-end fiscal year company, so 有報 is typically submitted in late June.
# Scan June 15 - July 15 for each year for FY ending March 2021-2025
results = {}
for year in [2021, 2022, 2023, 2024, 2025]:
    print(f"\n=== Scanning for FY ending March {year} (submission ~June {year}) ===")
    start = datetime(year, 6, 15)
    end = datetime(year, 7, 15)
    found = scan_range(start, end)
    results[f"FY{year}"] = found

with open("/workspaces/claude-code-book-template/workspace/research/レオン自動機/edinet/docs.json", "w") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("\n=== Summary ===")
for k, v in results.items():
    print(f"{k}: {len(v)} doc(s)")
    for d in v:
        print(f"  - {d}")
