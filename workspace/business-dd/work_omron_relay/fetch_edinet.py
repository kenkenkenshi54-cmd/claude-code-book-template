# -*- coding: utf-8 -*-
"""オムロン (6645) の有報をEDINET API v2で5期分取得する。3月決算 → 6月提出。"""
import os
import time
import json
import requests
from pathlib import Path

EDINET_API_KEY = "ee817fd5fd6a4754b5c9550f5d8672b9"
BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"
SEC_CODE = "66450"  # 6645 + trailing 0
OUT_DIR = Path(r"c:\Users\Kamei.Kenshi\Documents\dev\claude-code-book-template\workspace\business-dd\work_omron_relay\edinet")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def list_documents(date_str):
    url = f"{BASE_URL}/documents.json"
    params = {"date": date_str, "type": 2, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])


def find_yuho(year):
    """3月決算 → 6月後半提出。広めに6/15-7/15を走査。"""
    for month, day_start, day_end in [(6, 15, 30), (7, 1, 15)]:
        for day in range(day_start, day_end + 1):
            date_str = f"{year}-{month:02d}-{day:02d}"
            try:
                docs = list_documents(date_str)
                for d in docs:
                    if d.get("secCode") == SEC_CODE and d.get("docTypeCode") == "120":
                        return date_str, d
            except Exception as e:
                print(f"  err {date_str}: {e}")
            time.sleep(0.3)
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
    # FY2021(=Mar2021,提出2021/6) 〜 FY2025(=Mar2025,提出2025/6) の5期
    targets = [2021, 2022, 2023, 2024, 2025]
    summary = []
    for y in targets:
        print(f"=== yuho filed in {y} (FY end Mar/{y}) ===")
        date_str, doc = find_yuho(y)
        if doc is None:
            print(f"  NOT FOUND for FY{y}")
            summary.append({"fy": y, "found": False})
            continue
        doc_id = doc["docID"]
        print(f"  Found: docID={doc_id}, date={date_str}, name={doc.get('docDescription')}")
        for typ, ext in [(5, "zip"), (2, "pdf")]:
            path = OUT_DIR / f"yuho_FY{y}.{ext}"
            try:
                fetch_doc(doc_id, typ, path)
                print(f"  Saved type={typ}: {path}")
            except Exception as e:
                print(f"  fetch err type={typ}: {e}")
        summary.append({
            "fy": y, "found": True, "docID": doc_id,
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
