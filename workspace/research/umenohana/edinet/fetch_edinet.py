# -*- coding: utf-8 -*-
"""EDINET API v2 で梅の花グループ(7604)の有報5期分を取得。

決算月: 4月期 -> 有報提出は通常 7月下旬〜8月中旬
取得対象: FY2021(2021年4月期) 〜 FY2025(2025年4月期) の5期分
secCode: '76040' (5桁、末尾0補完)
docTypeCode: '120' (有価証券報告書)
"""
import os
import sys
import json
import time
import requests
from datetime import date, timedelta
from pathlib import Path

EDINET_API_KEY = "ee817fd5fd6a4754b5c9550f5d8672b9"
BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"
SAVE_DIR = Path("/workspaces/claude-code-book-template/workspace/research/umenohana/edinet")
SAVE_DIR.mkdir(parents=True, exist_ok=True)

TARGET_SEC_CODE = "76040"
TARGET_DOC_TYPE = "120"

# 4月期決算 → 通常6月下旬〜8月初旬に有報が提出される
# 各FYの提出スキャン期間 (FY-1の翌5月20日〜10月31日まで広めに探索)
SCAN_RANGES = {
    "FY2021": ("2021-06-01", "2021-09-30"),
    "FY2022": ("2022-06-01", "2022-09-30"),
    "FY2023": ("2023-06-01", "2023-09-30"),
    "FY2024": ("2024-06-01", "2024-09-30"),
    "FY2025": ("2025-06-01", "2025-09-30"),
}


def daterange(start_str: str, end_str: str):
    s = date.fromisoformat(start_str)
    e = date.fromisoformat(end_str)
    d = s
    while d <= e:
        yield d.isoformat()
        d += timedelta(days=1)


def list_documents(date_str: str):
    url = f"{BASE_URL}/documents.json"
    params = {"date": date_str, "type": 2, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])


def find_doc(scan_dates):
    for d in scan_dates:
        try:
            results = list_documents(d)
        except Exception as e:
            print(f"  [ERR] {d}: {e}", file=sys.stderr)
            time.sleep(0.5)
            continue
        for r in results:
            if r.get("secCode") == TARGET_SEC_CODE and r.get("docTypeCode") == TARGET_DOC_TYPE:
                return d, r
        time.sleep(0.3)
    return None, None


def fetch_csv(doc_id: str, save_path: Path):
    """type=5 で CSV版（XBRL から数値抽出済み）を取得。ZIP形式。"""
    url = f"{BASE_URL}/documents/{doc_id}"
    params = {"type": 5, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, stream=True, timeout=120)
    res.raise_for_status()
    with open(save_path, "wb") as f:
        for chunk in res.iter_content(chunk_size=8192):
            f.write(chunk)


def main():
    findings = {}
    for fy, (start, end) in SCAN_RANGES.items():
        print(f"[{fy}] scanning {start} → {end}")
        scan_dates = list(daterange(start, end))
        d, doc = find_doc(scan_dates)
        if doc is None:
            print(f"  → NOT FOUND")
            findings[fy] = None
            continue
        doc_id = doc["docID"]
        period_end = doc.get("periodEnd")
        filed = d
        print(f"  → docID={doc_id} (filed={filed}, periodEnd={period_end})")
        # CSV download
        csv_path = SAVE_DIR / f"{fy}_{doc_id}_csv.zip"
        if not csv_path.exists():
            print(f"  fetching CSV → {csv_path.name}")
            fetch_csv(doc_id, csv_path)
            time.sleep(1)
        findings[fy] = {
            "docID": doc_id,
            "filed": filed,
            "periodEnd": period_end,
            "docDescription": doc.get("docDescription"),
            "filerName": doc.get("filerName"),
            "csv_path": str(csv_path),
        }
    out = SAVE_DIR / "findings.json"
    out.write_text(json.dumps(findings, ensure_ascii=False, indent=2))
    print(f"\nSummary saved: {out}")
    return findings


if __name__ == "__main__":
    main()
