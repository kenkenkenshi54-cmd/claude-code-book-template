# -*- coding: utf-8 -*-
"""荏原製作所 (6361) の有報をEDINET API v2で5期分取得する。
2022年から12月決算に変更（それ以前は3月決算）。
- 3月決算: 6月後半提出
- 12月決算: 3月後半提出
"""
import os
import time
import json
import requests
from pathlib import Path

EDINET_API_KEY = "ee817fd5fd6a4754b5c9550f5d8672b9"
BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"
SEC_CODE = "63610"  # 6361 + trailing 0
OUT_DIR = Path(r"c:\Users\Kamei.Kenshi\Documents\dev\claude-code-book-template\workspace\business-dd\work_ebara\edinet")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def list_documents(date_str):
    url = f"{BASE_URL}/documents.json"
    params = {"date": date_str, "type": 2, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])


def find_yuho_in_range(year, month_start, month_end):
    """指定年月範囲で有報(120)を検索"""
    for month in range(month_start, month_end + 1):
        for day in range(1, 32):
            try:
                date_str = f"{year}-{month:02d}-{day:02d}"
                docs = list_documents(date_str)
                for d in docs:
                    if d.get("secCode") == SEC_CODE and d.get("docTypeCode") == "120":
                        return date_str, d
            except Exception as e:
                pass
            time.sleep(0.2)
    return None, None


def fetch_doc(doc_id, doc_type, save_path):
    url = f"{BASE_URL}/documents/{doc_id}"
    params = {"type": doc_type, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, stream=True, timeout=60)
    res.raise_for_status()
    with open(save_path, "wb") as f:
        for chunk in res.iter_content(chunk_size=8192):
            f.write(chunk)
    return save_path


def main():
    # 直近5期 (荏原は2022年から12月決算)
    # FY2024 (Dec 2024) → 2025年3月提出
    # FY2023 (Dec 2023) → 2024年3月提出
    # FY2022 (Dec 2022) → 2023年3月提出
    # FY2021_transition (9ヶ月: 2021/4-12) → 2022年3月提出
    # FY2020 (Mar 2021) → 2021年6月提出
    targets = [
        ("FY2024_Dec", 2025, 3, 4),       # 2025/3-4 提出
        ("FY2023_Dec", 2024, 3, 4),
        ("FY2022_Dec", 2023, 3, 4),
        ("FY2021_9M",  2022, 3, 4),       # 9ヶ月変則決算
        ("FY2020_Mar", 2021, 6, 7),       # 旧3月決算
    ]
    summary = []
    for label, year, ms, me in targets:
        print(f"=== {label} (search {year}/{ms}-{me}) ===")
        date_str, doc = find_yuho_in_range(year, ms, me)
        if doc is None:
            print(f"  NOT FOUND for {label}")
            summary.append({"label": label, "found": False})
            continue
        doc_id = doc["docID"]
        print(f"  Found: docID={doc_id}, date={date_str}, name={doc.get('docDescription')}")
        for typ, ext in [(5, "zip"), (2, "pdf")]:
            path = OUT_DIR / f"yuho_{label}.{ext}"
            try:
                fetch_doc(doc_id, typ, path)
                print(f"  Saved type={typ}: {path}")
            except Exception as e:
                print(f"  fetch err type={typ}: {e}")
        summary.append({
            "label": label, "found": True, "docID": doc_id,
            "date": date_str, "desc": doc.get("docDescription"),
        })
        time.sleep(1)

    with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("\n=== Summary ===")
    for s in summary:
        print(s)


if __name__ == "__main__":
    main()
